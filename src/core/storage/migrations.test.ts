import { describe, expect, it } from "vitest";
import { migrateData, normalizeMeta } from "./migrations";
import { DEFAULT_SETTINGS } from "../settings";
import { CURRENT_SCHEMA_VERSION } from "./PersistedData";

describe("migrateData", () => {
	it("returns defaults for a first run", () => {
		const data = migrateData(undefined);

		expect(data.settings).toEqual(DEFAULT_SETTINGS);
		expect(data.workspaces).toEqual({});
		expect(data.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
	});

	it("survives a hand-edited file of the wrong type", () => {
		for (const bad of [null, 42, "text", []]) {
			expect(migrateData(bad).settings).toEqual(DEFAULT_SETTINGS);
		}
	});

	it("keeps recognized settings and defaults the rest", () => {
		const data = migrateData({
			settings: { storage: "embedded", promptOnSwitch: "changed" },
		});

		expect(data.settings.storage).toBe("embedded");
		expect(data.settings.promptOnSwitch).toBe("changed");
		expect(data.settings.showArchived).toBe(DEFAULT_SETTINGS.showArchived);
	});

	it("reads the switch prompt a older build wrote as a boolean", () => {
		expect(
			migrateData({ settings: { promptOnSwitch: true } }).settings.promptOnSwitch,
		).toBe("always");
		expect(
			migrateData({ settings: { promptOnSwitch: false } }).settings.promptOnSwitch,
		).toBe("never");
	});

	it("rejects an unknown switch prompt mode", () => {
		expect(
			migrateData({ settings: { promptOnSwitch: "sometimes" } }).settings
				.promptOnSwitch,
		).toBe(DEFAULT_SETTINGS.promptOnSwitch);
	});
});

describe("migrateData settings", () => {
	// The graph feature is removed. Its settings stay in `data.json` for a possible return.
	it("keeps the graph settings it no longer reads", () => {
		const settings = migrateData({
			settings: { graphSettings: "always", saveGraphSettings: false },
		}).settings;

		expect(settings).toHaveProperty("graphSettings", "always");
		expect(settings).toHaveProperty("saveGraphSettings", false);
	});

	it("rejects an unknown storage mode", () => {
		expect(migrateData({ settings: { storage: "cloud" } }).settings.storage).toBe(
			"sidecar",
		);
	});

	it("rejects an unknown status bar action", () => {
		const data = migrateData({ settings: { statusBar: { click: "explode" } } });
		expect(data.settings.statusBar.click).toBe(DEFAULT_SETTINGS.statusBar.click);
	});

	// Zero would render a preview with counts but no file names at all.
	it("clamps the preview name count into a usable range", () => {
		expect(
			migrateData({ settings: { previewNameCount: 0 } }).settings.previewNameCount,
		).toBe(1);
		expect(
			migrateData({ settings: { previewNameCount: 99 } }).settings.previewNameCount,
		).toBe(8);
	});

	it("normalizes stored workspace metadata", () => {
		const data = migrateData({
			workspaces: { Draft: { tags: ["#Writing", "writing", 7], archived: "yes" } },
		});

		// Case is kept, and case variants are one tag.
		expect(data.workspaces.Draft?.tags).toEqual(["Writing"]);
		// "yes" is not a boolean, so the safe default wins.
		expect(data.workspaces.Draft?.archived).toBe(false);
	});

	// Older builds allowed tags that Obsidian rejects. Dropping them would lose data.
	it("keeps a stored tag that the current rules reject", () => {
		const data = migrateData({ workspaces: { Draft: { tags: ["c++", "v1.2"] } } });
		expect(data.workspaces.Draft?.tags).toEqual(["c++", "v1.2"]);
	});
});

describe("normalizeMeta", () => {
	it("fills every field from garbage input", () => {
		expect(normalizeMeta("nonsense")).toEqual({
			tags: [],
			archived: false,
			description: "",
			order: 0,
		});
	});

	it("keeps a valid entry as it is", () => {
		const meta = { tags: ["dev"], archived: true, description: "API work", order: 3 };
		expect(normalizeMeta(meta)).toEqual(meta);
	});

	it("keeps a valid subtitle choice and drops an unknown one", () => {
		expect(normalizeMeta({ subtitle: "preview" }).subtitle).toBe("preview");
		expect(normalizeMeta({ subtitle: "description" }).subtitle).toBe("description");
		expect(normalizeMeta({ subtitle: "banner" })).not.toHaveProperty("subtitle");
	});
});

describe("normalizeMeta graph snapshot", () => {
	it("keeps a stored graph snapshot as it is", () => {
		const graph = { search: "shark", colorGroups: [] };
		expect(normalizeMeta({ graph }).graph).toEqual(graph);
	});

	// The key is omitted rather than set to undefined, so an absent snapshot
	// never reaches `apply`.
	it("omits a snapshot that is not a record", () => {
		for (const bad of [null, 42, "text", [], undefined]) {
			expect("graph" in normalizeMeta({ graph: bad })).toBe(false);
		}
	});
});
