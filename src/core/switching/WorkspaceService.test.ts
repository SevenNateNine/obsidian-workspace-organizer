import { describe, expect, it } from "vitest";
import { defaultMeta, type MetaByName } from "../organize";
import { DEFAULT_SETTINGS, type PluginSettings, type StorageMode } from "../settings";
import { WorkspaceError } from "../shared";
import {
	migrateData,
	type DataOwner,
	type MetaStore,
	type PersistedData,
} from "../storage";
import type { WorkspacesPort } from "../workspaces";
import { WorkspaceService } from "./WorkspaceService";

/** Every port writes here, so a test can assert the order of effects. */
type Log = string[];

class FakeWorkspaces implements WorkspacesPort {
	writable = true;
	active: string | null = null;
	layouts: Record<string, unknown> = {};
	live: unknown = { main: "live" };

	constructor(private readonly log: Log) {}

	isAvailable(): boolean {
		return true;
	}
	canMutate(): boolean {
		return this.writable;
	}
	list(): string[] {
		return Object.keys(this.layouts);
	}
	activeName(): string | null {
		return this.active;
	}
	layoutOf(name: string): unknown {
		return this.layouts[name] ?? null;
	}
	liveLayout(): unknown {
		return this.live;
	}
	async save(name: string): Promise<void> {
		this.log.push(`layout.save ${name}`);
		this.layouts[name] = this.live;
		this.active = name;
	}
	async saveLayout(name: string, layout: unknown): Promise<void> {
		this.layouts[name] = layout;
	}
	async load(name: string): Promise<void> {
		this.log.push(`layout.load ${name}`);
		this.active = name;
	}
	async delete(name: string): Promise<void> {
		delete this.layouts[name];
	}
	async setActive(name: string | null): Promise<void> {
		this.active = name;
	}
}

class FakeStore implements MetaStore {
	constructor(
		private readonly label: string,
		private readonly log: Log,
		public data: MetaByName = {},
	) {}

	async read(): Promise<MetaByName> {
		return this.data;
	}
	async write(workspaces: MetaByName): Promise<void> {
		this.log.push(`${this.label}.write ${Object.keys(workspaces).join(",")}`);
		this.data = workspaces;
	}
}

class FakeData implements DataOwner {
	data: PersistedData = migrateData({});

	current(): PersistedData {
		return this.data;
	}
	async replace(data: PersistedData): Promise<void> {
		this.data = data;
	}
}

interface Harness {
	log: Log;
	workspaces: FakeWorkspaces;
	data: FakeData;
	stores: Record<StorageMode, FakeStore>;
	service: WorkspaceService;
}

async function harness(settings: Partial<PluginSettings> = {}): Promise<Harness> {
	const log: Log = [];
	const data = new FakeData();
	data.data = { ...data.data, settings: { ...DEFAULT_SETTINGS, ...settings } };
	const stores = {
		sidecar: new FakeStore("sidecar", log),
		embedded: new FakeStore("embedded", log),
	};
	const h: Omit<Harness, "service"> = {
		log,
		workspaces: new FakeWorkspaces(log),
		data,
		stores,
	};
	const service = new WorkspaceService({
		workspaces: h.workspaces,
		reloadWorkspaces: async () => void log.push("reload"),
		data,
		storeFor: (mode) => stores[mode],
	});
	return { ...h, service };
}

async function withWorkspaces(h: Harness, ...names: string[]): Promise<void> {
	for (const name of names) h.workspaces.layouts[name] = { main: name };
	await h.service.registry.refresh();
	h.log.length = 0;
}

describe("needsPrompt", () => {
	it("never asks with no active workspace or when switching to the active one", async () => {
		const h = await harness({ promptOnSwitch: "always" });
		await withWorkspaces(h, "A", "B");

		expect(await h.service.needsPrompt("B")).toBe(false);

		h.workspaces.active = "A";
		expect(await h.service.needsPrompt("A")).toBe(false);
	});

	it("follows always and never", async () => {
		const always = await harness({ promptOnSwitch: "always" });
		await withWorkspaces(always, "A", "B");
		always.workspaces.active = "A";
		always.workspaces.live = { main: "A" };
		expect(await always.service.needsPrompt("B")).toBe(true);

		const never = await harness({ promptOnSwitch: "never" });
		await withWorkspaces(never, "A", "B");
		never.workspaces.active = "A";
		expect(await never.service.needsPrompt("B")).toBe(false);
	});

	it("in changed mode, asks only when the layout changed", async () => {
		const h = await harness({ promptOnSwitch: "changed" });
		await withWorkspaces(h, "A", "B");
		h.workspaces.active = "A";

		h.workspaces.live = { main: "A" };
		expect(await h.service.needsPrompt("B")).toBe(false);

		h.workspaces.live = { main: "moved" };
		expect(await h.service.needsPrompt("B")).toBe(true);
	});
});

describe("save", () => {
	it("saves only the layout", async () => {
		const h = await harness();

		await h.service.save("A");

		expect(h.log).toEqual(["layout.save A", "sidecar.write A"]);
	});

	// The graph feature is removed, but its stored snapshot must survive for a return.
	it("keeps a stored graph snapshot", async () => {
		const h = await harness();
		await withWorkspaces(h, "A");
		await h.service.registry.setMeta("A", { graph: { search: "whale" } });

		await h.service.save("A");

		expect(h.service.registry.metaOf("A")?.graph).toEqual({ search: "whale" });
	});
});

describe("load", () => {
	it("changes the layout", async () => {
		const h = await harness();
		await withWorkspaces(h, "A");

		await h.service.load("A");

		expect(h.log).toEqual(["layout.load A"]);
	});

	it("refuses while core Workspaces is on", async () => {
		const h = await harness();
		await withWorkspaces(h, "A");
		h.workspaces.writable = false;

		await expect(h.service.load("A")).rejects.toBeInstanceOf(WorkspaceError);
		expect(h.log).toEqual([]);
	});
});

describe("step", () => {
	it("skips archived workspaces", async () => {
		const h = await harness({ showArchived: false });
		await withWorkspaces(h, "A", "B", "C");
		await h.service.registry.setMeta("B", { archived: true });
		h.workspaces.active = "A";

		expect(h.service.step(1)).toBe("C");
		expect(h.service.step(-1)).toBe("C");
	});

	it("includes archived workspaces when the switcher shows them", async () => {
		const h = await harness({ showArchived: true });
		await withWorkspaces(h, "A", "B", "C");
		await h.service.registry.setMeta("B", { archived: true });
		h.workspaces.active = "A";

		expect(h.service.step(1)).toBe("B");
	});

	it("returns null when every workspace is archived", async () => {
		const h = await harness();
		await withWorkspaces(h, "A");
		await h.service.registry.setMeta("A", { archived: true });

		expect(h.service.step(1)).toBeNull();
	});
});

describe("setStorage", () => {
	it("writes the new store, then clears the old, then saves the setting", async () => {
		const h = await harness({ storage: "sidecar" });
		h.stores.sidecar.data = { A: { ...defaultMeta(), tags: ["x"] } };
		h.workspaces.layouts.A = { main: "A" };

		await h.service.setStorage("embedded");

		expect(h.log.slice(0, 3)).toEqual(["embedded.write A", "sidecar.write ", "reload"]);
		expect(h.data.current().settings.storage).toBe("embedded");
		expect(h.stores.embedded.data.A?.tags).toEqual(["x"]);
		expect(h.service.registry.metaOf("A")?.tags).toEqual(["x"]);
	});

	it("moves back the other way", async () => {
		const h = await harness({ storage: "embedded" });
		h.stores.embedded.data = { A: defaultMeta() };

		await h.service.setStorage("sidecar");

		expect(h.log.slice(0, 2)).toEqual(["sidecar.write A", "embedded.write "]);
		expect(h.data.current().settings.storage).toBe("sidecar");
	});

	it("keeps the old store and setting when the new store fails", async () => {
		const h = await harness({ storage: "sidecar" });
		h.stores.sidecar.data = { A: defaultMeta() };
		h.stores.embedded.write = async () => {
			throw new WorkspaceError("core-conflict");
		};

		await expect(h.service.setStorage("embedded")).rejects.toThrow();
		expect(h.stores.sidecar.data).toHaveProperty("A");
		expect(h.data.current().settings.storage).toBe("sidecar");
	});

	it("does nothing for the current mode", async () => {
		const h = await harness({ storage: "sidecar" });

		await h.service.setStorage("sidecar");

		expect(h.log).toEqual([]);
	});
});

describe("updateSettings", () => {
	it("replaces the settings and keeps the rest of the data", async () => {
		const h = await harness();
		h.data.data = { ...h.data.data, workspaces: { A: defaultMeta() } };

		await h.service.updateSettings({ showArchived: true });

		expect(h.service.settings.showArchived).toBe(true);
		expect(h.data.current().workspaces).toHaveProperty("A");
	});
});

describe("edit", () => {
	it("renames, then saves tags and description under the new name", async () => {
		const h = await harness();
		await withWorkspaces(h, "A");

		await h.service.edit("A", {
			name: " B ",
			tags: ["x"],
			description: "d",
			subtitle: "preview",
		});

		expect(h.service.registry.metaOf("A")).toBeNull();
		expect(h.service.registry.metaOf("B")).toMatchObject({
			tags: ["x"],
			description: "d",
		});
		expect(h.workspaces.list()).toEqual(["B"]);
	});

	it("skips the rename when the name is the same", async () => {
		const h = await harness();
		await withWorkspaces(h, "A");
		h.workspaces.writable = false;

		await h.service.edit("A", {
			name: "A",
			tags: ["x"],
			description: "",
			subtitle: "description",
		});

		expect(h.service.registry.metaOf("A")?.tags).toEqual(["x"]);
	});

	it("changes nothing when the new name is taken", async () => {
		const h = await harness();
		await withWorkspaces(h, "A", "B");

		await expect(
			h.service.edit("A", {
				name: "B",
				tags: ["x"],
				description: "",
				subtitle: "description",
			}),
		).rejects.toMatchObject({ kind: "name-taken" });
		expect(h.service.registry.metaOf("A")?.tags).toEqual([]);
	});
});
