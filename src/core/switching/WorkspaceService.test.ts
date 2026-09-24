import { describe, expect, it } from "vitest";
import type { GraphOptions, GraphOptionsPort } from "../graph";
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

class FakeGraph implements GraphOptionsPort {
	options: GraphOptions | null = { search: "shark" };

	constructor(private readonly log: Log) {}

	current(): GraphOptions | null {
		return this.options && { ...this.options };
	}
	async apply(options: GraphOptions): Promise<void> {
		this.log.push(`graph.apply ${JSON.stringify(options)}`);
		this.options = { ...options };
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
	graph: FakeGraph;
	data: FakeData;
	stores: Record<StorageMode, FakeStore>;
	enabled: string[];
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
		graph: new FakeGraph(log),
		data,
		stores,
		enabled: [],
	};
	const service = new WorkspaceService({
		workspaces: h.workspaces,
		reloadWorkspaces: async () => void log.push("reload"),
		graph: h.graph,
		enabledPluginIds: async () => h.enabled,
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
		const h = await harness({ promptOnSwitch: "changed", graphSettings: "never" });
		await withWorkspaces(h, "A", "B");
		h.workspaces.active = "A";

		h.workspaces.live = { main: "A" };
		expect(await h.service.needsPrompt("B")).toBe(false);

		h.workspaces.live = { main: "moved" };
		expect(await h.service.needsPrompt("B")).toBe(true);
	});

	it("in changed mode, asks when the graph changed and graph mode is active", async () => {
		const h = await harness({ promptOnSwitch: "changed", graphSettings: "auto" });
		await withWorkspaces(h, "A", "B");
		h.workspaces.active = "A";
		h.workspaces.live = { main: "A" };
		await h.service.registry.setMeta("A", { graph: { search: "whale" } });

		expect(await h.service.needsPrompt("B")).toBe(true);

		h.enabled.push("graph-profiles");
		expect(await h.service.needsPrompt("B")).toBe(false);
	});

	it("in changed mode, ignores the graph for a workspace with no snapshot", async () => {
		const h = await harness({ promptOnSwitch: "changed", graphSettings: "always" });
		await withWorkspaces(h, "A", "B");
		h.workspaces.active = "A";
		h.workspaces.live = { main: "A" };

		expect(await h.service.needsPrompt("B")).toBe(false);
	});
});

describe("save", () => {
	it("saves the layout, then the graph snapshot, when graph mode is active", async () => {
		const h = await harness({ graphSettings: "always" });

		await h.service.save("A");

		expect(h.log).toEqual(["layout.save A", "sidecar.write A", "sidecar.write A"]);
		expect(h.service.registry.metaOf("A")?.graph).toEqual({ search: "shark" });
	});

	it("saves only the layout when graph mode is inactive", async () => {
		const h = await harness({ graphSettings: "auto" });
		h.enabled.push("extended-graph");

		await h.service.save("A");

		expect(h.log).toEqual(["layout.save A", "sidecar.write A"]);
		expect(h.service.registry.metaOf("A")?.graph).toBeUndefined();
	});

	it("skips the snapshot when the graph plugin is unreachable", async () => {
		const h = await harness({ graphSettings: "always" });
		h.graph.options = null;

		await h.service.save("A");

		expect(h.service.registry.metaOf("A")?.graph).toBeUndefined();
	});
});

describe("load", () => {
	async function withSnapshot(settings: Partial<PluginSettings>): Promise<Harness> {
		const h = await harness(settings);
		await withWorkspaces(h, "A");
		await h.service.registry.setMeta("A", { graph: { search: "whale" } });
		h.log.length = 0;
		return h;
	}

	it("applies the graph before it changes the layout", async () => {
		const h = await withSnapshot({ graphSettings: "always" });

		await h.service.load("A");

		expect(h.log).toEqual(['graph.apply {"search":"whale"}', "layout.load A"]);
	});

	it("leaves the graph alone when graph mode is inactive", async () => {
		const h = await withSnapshot({ graphSettings: "never" });

		await h.service.load("A");

		expect(h.log).toEqual(["layout.load A"]);
	});

	it("leaves the graph alone when the switch will be refused", async () => {
		const h = await withSnapshot({ graphSettings: "always" });
		h.workspaces.writable = false;

		await expect(h.service.load("A")).rejects.toBeInstanceOf(WorkspaceError);
		expect(h.log).toEqual([]);
		expect(h.graph.options).toEqual({ search: "shark" });
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
