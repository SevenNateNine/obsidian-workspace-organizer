import { describe, expect, it } from "vitest";
import type { DataAdapter } from "obsidian";
import { isCoreWorkspacesEnabled, parseEnabledIds } from "./pluginState";

describe("parseEnabledIds", () => {
	it("reads the object form Obsidian writes today", () => {
		expect(parseEnabledIds('{"workspaces":true,"graph":false}')).toEqual([
			"workspaces",
		]);
	});

	it("reads the older array form", () => {
		expect(parseEnabledIds('["graph","workspaces"]')).toEqual(["graph", "workspaces"]);
	});

	it("returns nothing for an empty set", () => {
		expect(parseEnabledIds("{}")).toEqual([]);
		expect(parseEnabledIds("[]")).toEqual([]);
	});

	// Only an explicit true counts. A truthy string must not enable a plugin.
	it("requires a real boolean in the object form", () => {
		expect(parseEnabledIds('{"workspaces":"yes","graph":1}')).toEqual([]);
	});

	it("ignores non-string entries in the array form", () => {
		expect(parseEnabledIds('["graph",7,null]')).toEqual(["graph"]);
	});

	it("treats an unreadable file as nothing enabled", () => {
		for (const bad of ["", "{ oops", "null", "42"]) {
			expect(parseEnabledIds(bad)).toEqual([]);
		}
	});
});

/** Enough of the vault adapter for these checks. */
function fakeAdapter(files: Record<string, string>): DataAdapter {
	return {
		exists: async (path: string) => path in files,
		read: async (path: string) => {
			const value = files[path];
			if (value === undefined) throw new Error("not found");
			return value;
		},
	} as unknown as DataAdapter;
}

/** An adapter whose file exists but cannot be read. */
const brokenAdapter = {
	exists: async () => true,
	read: async () => {
		throw new Error("permission denied");
	},
} as unknown as DataAdapter;

describe("isCoreWorkspacesEnabled", () => {
	const path = ".obsidian/core-plugins.json";

	it("reports the state from the config file", async () => {
		const on = fakeAdapter({ [path]: '{"workspaces":true}' });
		const off = fakeAdapter({ [path]: '{"workspaces":false}' });

		expect(await isCoreWorkspacesEnabled(on, ".obsidian")).toBe(true);
		expect(await isCoreWorkspacesEnabled(off, ".obsidian")).toBe(false);
	});

	it("reports off when the file does not exist", async () => {
		expect(await isCoreWorkspacesEnabled(fakeAdapter({}), ".obsidian")).toBe(false);
	});

	// Blocking every write because one file could not be read would be worse
	// than the risk, which also needs core to be on before it bites.
	it("reports off when the file cannot be read", async () => {
		expect(await isCoreWorkspacesEnabled(brokenAdapter, ".obsidian")).toBe(false);
	});

	it("honours a non-default config directory", async () => {
		const adapter = fakeAdapter({ "custom/core-plugins.json": '{"workspaces":true}' });
		expect(await isCoreWorkspacesEnabled(adapter, "custom")).toBe(true);
	});
});
