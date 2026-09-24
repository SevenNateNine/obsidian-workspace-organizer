import { describe, expect, it } from "vitest";
import { layoutsDiffer } from "./layoutDiff";

const STORED = {
	main: { type: "split", children: [{ type: "leaf", file: "Chapter 1.md" }] },
	left: { type: "split", collapsed: false },
	active: "leaf-1",
	mtime: "2026-08-20T14:45:13-04:00",
};

/** What `getLayout` returns for the same arrangement. */
const LIVE = {
	main: { type: "split", children: [{ type: "leaf", file: "Chapter 1.md" }] },
	left: { type: "split", collapsed: false },
	active: "leaf-1",
	lastOpenFiles: ["Chapter 1.md", "Outline.md"],
};

describe("layoutsDiffer", () => {
	it("sees no change in the same arrangement", () => {
		expect(layoutsDiffer(LIVE, STORED)).toBe(false);
	});

	it("ignores the keys that only one side carries", () => {
		expect(layoutsDiffer({ main: 1 }, { main: 1, mtime: "x" })).toBe(false);
		expect(layoutsDiffer({ main: 1, lastOpenFiles: ["a"] }, { main: 1 })).toBe(false);
	});

	// The same layout read back from JSON can hold its keys in another order.
	it("ignores key order", () => {
		expect(
			layoutsDiffer({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 }),
		).toBe(false);
	});

	it("sees an added pane", () => {
		expect(layoutsDiffer({ ...LIVE, right: { type: "split" } }, STORED)).toBe(true);
	});

	it("sees a changed file", () => {
		const moved = { ...LIVE, active: "leaf-2" };
		expect(layoutsDiffer(moved, STORED)).toBe(true);
	});

	// Array order carries meaning: two panes swapped is a different layout.
	it("sees reordered children", () => {
		expect(layoutsDiffer({ main: [1, 2] }, { main: [2, 1] })).toBe(true);
	});

	it("reports a change when either side is unreadable", () => {
		for (const bad of [null, undefined, 42, "text", []]) {
			expect(layoutsDiffer(bad, STORED)).toBe(true);
			expect(layoutsDiffer(LIVE, bad)).toBe(true);
		}
	});

	// A layout core cannot serialize is a layout we cannot compare.
	it("reports a change when serializing throws", () => {
		const cyclic: Record<string, unknown> = { main: 1 };
		cyclic.self = cyclic;
		expect(layoutsDiffer(cyclic, STORED)).toBe(true);
	});
});
