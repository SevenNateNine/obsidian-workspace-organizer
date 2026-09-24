import { describe, expect, it } from "vitest";
import { move, reconcile, renameKey, sortedNames } from "./reconcile";
import { defaultMeta, type WorkspaceMeta } from "../settings/settings";

function meta(overrides: Partial<WorkspaceMeta> = {}): WorkspaceMeta {
	return { ...defaultMeta(), ...overrides };
}

describe("reconcile", () => {
	it("adds defaults for a workspace created outside the plugin", () => {
		const result = reconcile(["Draft", "Research"], { Draft: meta({ order: 0 }) });

		expect(Object.keys(result.workspaces)).toEqual(["Draft", "Research"]);
		expect(result.workspaces.Research).toEqual(meta({ order: 1 }));
		expect(result.changed).toBe(true);
	});

	it("prunes metadata for a workspace deleted outside the plugin", () => {
		const result = reconcile(["Draft"], {
			Draft: meta({ order: 0 }),
			Gone: meta({ order: 1, tags: ["dev"] }),
		});

		expect(Object.keys(result.workspaces)).toEqual(["Draft"]);
		expect(result.changed).toBe(true);
	});

	it("keeps tags, description, and archived state intact", () => {
		const stored = {
			Draft: meta({ tags: ["writing"], description: "Long form", archived: true }),
		};

		expect(reconcile(["Draft"], stored).workspaces.Draft).toMatchObject({
			tags: ["writing"],
			description: "Long form",
			archived: true,
		});
	});

	it("renumbers sparse orders while preserving relative order", () => {
		const result = reconcile(["A", "B"], {
			A: meta({ order: 40 }),
			B: meta({ order: 5 }),
		});

		expect(sortedNames(result.workspaces)).toEqual(["B", "A"]);
		expect(result.workspaces.B?.order).toBe(0);
		expect(result.workspaces.A?.order).toBe(1);
	});

	// The caller writes to disk only when this is true, so a false positive means
	// a write on every switcher open.
	it("reports no change when nothing moved", () => {
		const stored = { A: meta({ order: 0 }), B: meta({ order: 1 }) };
		expect(reconcile(["A", "B"], stored).changed).toBe(false);
	});

	it("appends several new workspaces alphabetically", () => {
		const result = reconcile(["Zed", "Alpha"], {});
		expect(sortedNames(result.workspaces)).toEqual(["Alpha", "Zed"]);
	});

	it("handles an empty vault", () => {
		expect(reconcile([], {})).toEqual({ workspaces: {}, changed: false });
	});
});

describe("renameKey", () => {
	it("moves metadata to the new name", () => {
		const out = renameKey({ Old: meta({ tags: ["dev"] }) }, "Old", "New");

		expect(Object.keys(out)).toEqual(["New"]);
		expect(out.New?.tags).toEqual(["dev"]);
	});

	it("leaves the map alone when the name is unknown", () => {
		const stored = { A: meta() };
		expect(renameKey(stored, "Missing", "New")).toEqual(stored);
	});
});

describe("move", () => {
	const stored = {
		A: meta({ order: 0 }),
		B: meta({ order: 1 }),
		C: meta({ order: 2 }),
	};

	it("moves a workspace down", () => {
		expect(sortedNames(move(stored, "A", 1))).toEqual(["B", "A", "C"]);
	});

	it("moves a workspace up", () => {
		expect(sortedNames(move(stored, "C", -1))).toEqual(["A", "C", "B"]);
	});

	it("refuses to move past either end", () => {
		expect(sortedNames(move(stored, "A", -1))).toEqual(["A", "B", "C"]);
		expect(sortedNames(move(stored, "C", 1))).toEqual(["A", "B", "C"]);
	});
});
