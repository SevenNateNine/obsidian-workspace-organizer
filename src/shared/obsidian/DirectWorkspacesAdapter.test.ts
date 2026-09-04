import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import type { App } from "obsidian";
import { DirectWorkspacesAdapter } from "./DirectWorkspacesAdapter";

const WORKSPACES = ".obsidian/workspaces.json";
const CORE_PLUGINS = ".obsidian/core-plugins.json";

/** A real file written by core, trimmed to two workspaces. */
const SAMPLE = readFileSync(
	fileURLToPath(
		new URL("../../../test/fixtures/workspaces.sample.json", import.meta.url),
	),
	"utf8",
);

class Vault {
	files = new Map<string, string>();
	configDir = ".obsidian";

	readonly adapter = {
		exists: async (path: string) => this.files.has(path),
		read: async (path: string) => {
			const value = this.files.get(path);
			if (value === undefined) throw new Error(`missing ${path}`);
			return value;
		},
		write: async (path: string, data: string) => {
			this.files.set(path, data);
		},
	};
}

let vault: Vault;
let applied: unknown;
let live: Record<string, unknown>;
let adapter: DirectWorkspacesAdapter;

function build(): DirectWorkspacesAdapter {
	const app = {
		vault,
		workspace: {
			getLayout: () => live,
			changeLayout: async (layout: unknown) => {
				applied = layout;
			},
		},
	} as unknown as App;

	return new DirectWorkspacesAdapter(app);
}

/** What is on disk now, parsed. */
function onDisk(): { workspaces: Record<string, unknown>; active: string | null } {
	return JSON.parse(vault.files.get(WORKSPACES) ?? "{}");
}

beforeEach(async () => {
	vault = new Vault();
	vault.files.set(WORKSPACES, SAMPLE);
	vault.files.set(CORE_PLUGINS, '{"workspaces":false}');
	applied = undefined;
	live = { main: { id: "m", type: "split", children: [] }, lastOpenFiles: ["a.md"] };
	adapter = build();
	await adapter.reload();
});

describe("reload", () => {
	it("reads the workspaces core wrote", () => {
		expect(adapter.list()).toEqual(["mammalian-research", "clean"]);
		expect(adapter.activeName()).toBe("clean");
	});

	it("starts empty when the file does not exist yet", async () => {
		vault.files.delete(WORKSPACES);
		await adapter.reload();
		expect(adapter.list()).toEqual([]);
		expect(adapter.activeName()).toBeNull();
	});

	it("starts empty rather than throwing on a damaged file", async () => {
		vault.files.set(WORKSPACES, "{ truncated");
		await adapter.reload();
		expect(adapter.list()).toEqual([]);
	});

	it("picks up a workspace added by another device", async () => {
		vault.files.set(
			WORKSPACES,
			'{"workspaces":{"synced":{"main":{}}},"active":"synced"}',
		);
		await adapter.reload();
		expect(adapter.list()).toEqual(["synced"]);
	});
});

describe("save", () => {
	it("captures the live layout under the name", async () => {
		await adapter.save("new one");
		expect(onDisk().workspaces["new one"]).toMatchObject({ main: live.main });
	});

	it("drops lastOpenFiles and adds an mtime, the way core does", async () => {
		await adapter.save("new one");
		const entry = onDisk().workspaces["new one"] as Record<string, unknown>;

		expect(entry).not.toHaveProperty("lastOpenFiles");
		expect(entry.mtime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
	});

	it("makes the saved workspace active", async () => {
		await adapter.save("new one");
		expect(onDisk().active).toBe("new one");
	});

	/**
	 * Embedded metadata lives on the entry, and `getLayout` cannot produce it.
	 * Losing it here makes `reconcile` reset the tags and description of any
	 * workspace the user re-saves while storage is `embedded`.
	 */
	it("keeps embedded metadata when overwriting an existing workspace", async () => {
		await adapter.writeMeta({ clean: { tags: ["research"], archived: true } });

		await adapter.save("clean");

		const entry = onDisk().workspaces["clean"] as Record<string, unknown>;
		expect(entry["extendedWorkspaces"]).toEqual({ tags: ["research"], archived: true });
		expect(adapter.readMeta()).toEqual({
			clean: { tags: ["research"], archived: true },
		});
	});

	it("adds no metadata key to a workspace that has none", async () => {
		await adapter.save("new one");
		expect(onDisk().workspaces["new one"]).not.toHaveProperty("extendedWorkspaces");
	});

	/**
	 * The promise this plugin makes: it writes the same file core does, and
	 * touches nothing it was not asked to touch. A vault synced between devices
	 * must not see a diff on entries the user did not change.
	 */
	it("leaves every existing entry byte for byte identical", async () => {
		const before = onDisk().workspaces;
		await adapter.save("new one");
		const after = onDisk().workspaces;

		for (const name of ["mammalian-research", "clean"]) {
			expect(JSON.stringify(after[name], null, 2)).toBe(
				JSON.stringify(before[name], null, 2),
			);
		}
	});

	it("writes the file in core's own format", async () => {
		await adapter.save("new one");
		const raw = vault.files.get(WORKSPACES) ?? "";
		expect(raw).toBe(JSON.stringify(JSON.parse(raw), null, 2));
		expect(raw.endsWith("\n")).toBe(false);
	});

	it("overwrites an existing workspace in place", async () => {
		await adapter.save("clean");
		expect(adapter.list()).toEqual(["mammalian-research", "clean"]);
	});
});

describe("load", () => {
	it("applies the stored layout", async () => {
		await adapter.load("mammalian-research");
		expect(applied).toMatchObject({ main: expect.anything() });
	});

	// Applying a layout can mutate the object it is handed.
	it("hands over a copy, not the stored object", async () => {
		await adapter.load("mammalian-research");
		expect(applied).not.toBe(adapter.layoutOf("mammalian-research"));
	});

	it("records the workspace as active", async () => {
		await adapter.load("mammalian-research");
		expect(onDisk().active).toBe("mammalian-research");
	});

	it("refuses a workspace that is not there", async () => {
		await expect(adapter.load("missing")).rejects.toMatchObject({ kind: "not-found" });
	});
});

describe("delete", () => {
	it("removes the workspace", async () => {
		await adapter.delete("clean");
		expect(adapter.list()).toEqual(["mammalian-research"]);
	});

	it("clears the active marker when it pointed at the deleted one", async () => {
		await adapter.delete("clean");
		expect(onDisk().active).toBeNull();
	});

	it("leaves the active marker alone otherwise", async () => {
		await adapter.delete("mammalian-research");
		expect(onDisk().active).toBe("clean");
	});
});

describe("setActive", () => {
	it("records a known workspace", async () => {
		await adapter.setActive("mammalian-research");
		expect(onDisk().active).toBe("mammalian-research");
	});

	it("refuses to point at a workspace that does not exist", async () => {
		await adapter.setActive("missing");
		expect(onDisk().active).toBeNull();
	});
});

describe("saveLayout", () => {
	it("stores a layout without capturing the screen", async () => {
		const source = adapter.layoutOf("clean");
		await adapter.saveLayout("copy", source);
		expect(onDisk().workspaces.copy).toEqual(source);
	});

	// Sharing one object between two names would make a later edit to either
	// silently change both.
	it("stores a copy, not the same object", async () => {
		await adapter.saveLayout("copy", adapter.layoutOf("clean"));
		expect(adapter.layoutOf("copy")).not.toBe(adapter.layoutOf("clean"));
	});
});

describe("with the core Workspaces plugin on", () => {
	beforeEach(async () => {
		vault.files.set(CORE_PLUGINS, '{"workspaces":true}');
		await adapter.reload();
	});

	it("reports that it must not write", () => {
		expect(adapter.canMutate()).toBe(false);
		expect(adapter.isBlockedByCore()).toBe(true);
	});

	it("still reads the list", () => {
		expect(adapter.list()).toEqual(["mammalian-research", "clean"]);
	});

	/**
	 * The last line of defence. Callers are guarded already, so reaching a write
	 * here means a guard was missed, and the cost of that is a lost workspace.
	 */
	it("refuses to write, leaving the file untouched", async () => {
		await expect(adapter.save("new one")).rejects.toMatchObject({
			kind: "core-conflict",
		});
		expect(vault.files.get(WORKSPACES)).toBe(SAMPLE);
	});
});
