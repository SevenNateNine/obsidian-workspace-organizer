import { beforeEach, describe, expect, it } from "vitest";
import { WorkspaceRegistry } from "./WorkspaceRegistry";
import { WorkspaceError } from "../shared/errors";
import type { MetaStore, WorkspacesPort } from "./ports";
import { defaultMeta, type WorkspaceMeta } from "../settings/settings";

/** Stands in for the workspace engine, holding layouts in memory. */
class FakeCore implements WorkspacesPort {
	available = true;
	/** False stands for the core Workspaces plugin being on. */
	writable = true;
	active: string | null = null;
	layouts: Record<string, unknown> = {};
	/** What the screen currently shows, which `save` captures. */
	live: unknown = { main: "live" };

	isAvailable(): boolean {
		return this.available;
	}
	canMutate(): boolean {
		return this.writable;
	}
	async setActive(name: string | null): Promise<void> {
		this.active = name;
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
		this.layouts[name] = this.live;
		this.active = name;
	}
	async saveLayout(name: string, layout: unknown): Promise<void> {
		this.layouts[name] = layout;
	}
	async load(name: string): Promise<void> {
		this.active = name;
	}
	async delete(name: string): Promise<void> {
		delete this.layouts[name];
		if (this.active === name) this.active = null;
	}
}

class FakeStore implements MetaStore {
	constructor(public data: Record<string, WorkspaceMeta> = {}) {}
	writes = 0;

	async read(): Promise<Record<string, WorkspaceMeta>> {
		return this.data;
	}
	async write(workspaces: Record<string, WorkspaceMeta>): Promise<void> {
		this.data = workspaces;
		this.writes += 1;
	}
}

const ALL = { tags: [], includeArchived: true };
const VISIBLE = { tags: [], includeArchived: false };

let core: FakeCore;
let store: FakeStore;
let registry: WorkspaceRegistry;

beforeEach(async () => {
	core = new FakeCore();
	core.layouts = { Draft: { main: "d" }, Research: { main: "r" } };
	core.active = "Draft";
	store = new FakeStore();
	registry = new WorkspaceRegistry(core, store);
	await registry.refresh();
});

describe("refresh", () => {
	it("gives every workspace metadata on first run", () => {
		expect(registry.entries().map((entry) => entry.name)).toEqual([
			"Draft",
			"Research",
		]);
	});

	it("marks the active workspace", () => {
		expect(registry.entries().find((entry) => entry.isActive)?.name).toBe("Draft");
	});

	it("does not write when nothing changed", async () => {
		const before = store.writes;
		await registry.refresh();
		expect(store.writes).toBe(before);
	});

	// Disabling core must not leave stale names on screen that nothing can load.
	it("empties the list when the core plugin is off", async () => {
		core.available = false;
		await registry.refresh();
		expect(registry.entries()).toEqual([]);
	});
});

describe("filtered", () => {
	it("hides archived workspaces by default", async () => {
		await registry.setMeta("Research", { archived: true });
		expect(registry.filtered(VISIBLE).map((entry) => entry.name)).toEqual(["Draft"]);
		expect(registry.filtered(ALL)).toHaveLength(2);
	});

	it("narrows to workspaces carrying every selected tag", async () => {
		await registry.setMeta("Draft", { tags: ["writing", "focus"] });
		await registry.setMeta("Research", { tags: ["writing"] });

		expect(
			registry
				.filtered({ tags: ["writing"], includeArchived: false })
				.map((e) => e.name),
		).toEqual(["Draft", "Research"]);
		expect(
			registry
				.filtered({ tags: ["writing", "focus"], includeArchived: false })
				.map((e) => e.name),
		).toEqual(["Draft"]);
	});
});

describe("rename", () => {
	it("carries the metadata across", async () => {
		await registry.setMeta("Draft", { tags: ["writing"], description: "Long form" });
		await registry.rename("Draft", "Drafting");

		expect(core.list()).toEqual(["Research", "Drafting"]);
		expect(registry.metaOf("Drafting")).toMatchObject({
			tags: ["writing"],
			description: "Long form",
		});
		expect(registry.metaOf("Draft")).toBeNull();
	});

	// Re-capturing the screen would replace the panes of a workspace the user is
	// not even looking at.
	it("moves the stored layout rather than the live one", async () => {
		await registry.rename("Research", "Reading");
		expect(core.layouts.Reading).toEqual({ main: "r" });
	});

	it("refuses a name already in use", async () => {
		await expect(registry.rename("Draft", "Research")).rejects.toThrow(WorkspaceError);
		expect(core.list()).toContain("Draft");
	});

	it("refuses an empty name", async () => {
		await expect(registry.rename("Draft", "   ")).rejects.toThrow(WorkspaceError);
	});

	it("does nothing when the name is unchanged", async () => {
		await registry.rename("Draft", "Draft");
		expect(core.list()).toEqual(["Draft", "Research"]);
	});

	// Dropping the old name clears the active marker, so renaming the workspace
	// you are in would otherwise leave nothing active.
	it("keeps the renamed workspace active when it was", async () => {
		await registry.rename("Draft", "Drafting");
		expect(registry.activeName()).toBe("Drafting");
	});

	it("does not steal active from another workspace", async () => {
		await registry.rename("Research", "Reading");
		expect(registry.activeName()).toBe("Draft");
	});
});

describe("duplicate", () => {
	it("copies the layout, the tags, and the description", async () => {
		await registry.setMeta("Draft", { tags: ["writing"], description: "Long form" });
		await registry.duplicate("Draft", "Draft copy");

		expect(core.layouts["Draft copy"]).toEqual({ main: "d" });
		expect(registry.metaOf("Draft copy")).toMatchObject({
			tags: ["writing"],
			description: "Long form",
		});
		// The original survives.
		expect(registry.metaOf("Draft")).not.toBeNull();
	});

	it("keeps its own position rather than the source's", async () => {
		await registry.duplicate("Draft", "Draft copy");
		const orders = registry.entries().map((entry) => entry.meta.order);
		expect(new Set(orders).size).toBe(orders.length);
	});
});

describe("remove", () => {
	it("drops the workspace and its metadata", async () => {
		await registry.remove("Research");
		expect(core.list()).toEqual(["Draft"]);
		expect(registry.metaOf("Research")).toBeNull();
	});

	it("refuses a workspace that is already gone", async () => {
		await expect(registry.remove("Missing")).rejects.toThrow(WorkspaceError);
	});
});

describe("step", () => {
	it("moves to the next workspace", () => {
		expect(registry.step(1, VISIBLE)).toBe("Research");
	});

	it("wraps around both ends", () => {
		expect(registry.step(-1, VISIBLE)).toBe("Research");
		core.active = "Research";
		expect(registry.step(1, VISIBLE)).toBe("Draft");
	});

	it("skips archived workspaces", async () => {
		await registry.setMeta("Research", { archived: true });
		expect(registry.step(1, VISIBLE)).toBe("Draft");
	});

	it("starts from the first when nothing is active", () => {
		core.active = null;
		expect(registry.step(1, VISIBLE)).toBe("Draft");
	});

	it("has nowhere to go in an empty vault", async () => {
		core.layouts = {};
		await registry.refresh();
		expect(registry.step(1, VISIBLE)).toBeNull();
	});
});

describe("with the core Workspaces plugin also running", () => {
	beforeEach(() => {
		core.writable = false;
	});

	// Both write workspaces.json, and core caches it, so a write from here would
	// be overwritten or would overwrite core's. Refusing is the safe outcome.
	it("refuses every mutation with an actionable reason", async () => {
		for (const action of [
			() => registry.save("Draft"),
			// Switching writes too: it records which workspace is now current.
			() => registry.switchTo("Draft"),
			() => registry.rename("Draft", "B"),
			() => registry.duplicate("Draft", "B"),
			() => registry.remove("Draft"),
		]) {
			await expect(action()).rejects.toMatchObject({ kind: "core-conflict" });
		}
	});

	// Seeing the list is safe, and it reassures the user their work is intact.
	it("still lists workspaces", () => {
		expect(registry.entries().map((entry) => entry.name)).toEqual([
			"Draft",
			"Research",
		]);
		expect(registry.canMutate()).toBe(false);
	});
});

describe("with no engine at all", () => {
	it("empties the list rather than showing names nothing can load", async () => {
		core.available = false;
		await registry.refresh();
		expect(registry.entries()).toEqual([]);
		expect(registry.activeName()).toBeNull();
	});
});

describe("moveBy", () => {
	it("reorders the manager list", async () => {
		await registry.moveBy("Research", -1);
		expect(registry.entries().map((entry) => entry.name)).toEqual([
			"Research",
			"Draft",
		]);
	});

	it("keeps metadata attached to the right workspace", async () => {
		await registry.setMeta("Research", { tags: ["dev"] });
		await registry.moveBy("Research", -1);
		expect(registry.metaOf("Research")?.tags).toEqual(["dev"]);
		expect(registry.metaOf("Draft")?.tags).toEqual([]);
	});
});

describe("setMeta", () => {
	it("refuses an unknown workspace", async () => {
		await expect(registry.setMeta("Missing", { archived: true })).rejects.toThrow(
			WorkspaceError,
		);
	});

	it("leaves untouched fields alone", async () => {
		await registry.setMeta("Draft", { tags: ["a"] });
		await registry.setMeta("Draft", { archived: true });
		expect(registry.metaOf("Draft")).toMatchObject({ tags: ["a"], archived: true });
	});

	it("starts from a clean default", () => {
		expect(registry.metaOf("Draft")).toEqual(defaultMeta(0));
	});
});

describe("hasUnsavedChanges", () => {
	it("is false when the screen still matches the stored layout", () => {
		core.live = { main: "d" };
		expect(registry.hasUnsavedChanges("Draft")).toBe(false);
	});

	it("is true after the layout moves on", () => {
		core.live = { main: "d", right: "notes" };
		expect(registry.hasUnsavedChanges("Draft")).toBe(true);
	});

	it("is true for a workspace with no stored layout", () => {
		expect(registry.hasUnsavedChanges("Missing")).toBe(true);
	});

	// A list we cannot read is a list we cannot compare against.
	it("is true when the core plugin is off", () => {
		core.available = false;
		expect(registry.hasUnsavedChanges("Draft")).toBe(true);
	});
});
