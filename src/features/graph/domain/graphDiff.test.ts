import { describe, expect, it } from "vitest";
import { graphOptionsDiffer } from "./graphDiff";

const GRAPH = {
	search: "shark",
	showTags: false,
	colorGroups: [{ query: "fish", color: { a: 1, rgb: 14701138 } }],
	repelStrength: 10,
	scale: 1.102948889107043,
	close: true,
	"collapse-filter": false,
};

describe("graphOptionsDiffer", () => {
	it("sees no change in the same settings", () => {
		expect(graphOptionsDiffer({ ...GRAPH }, { ...GRAPH })).toBe(false);
	});

	it("sees a changed search", () => {
		expect(graphOptionsDiffer({ ...GRAPH, search: "whale" }, GRAPH)).toBe(true);
	});

	it("sees a changed colour group", () => {
		const recoloured = { ...GRAPH, colorGroups: [{ query: "whale", color: {} }] };
		expect(graphOptionsDiffer(recoloured, GRAPH)).toBe(true);
	});

	it("sees a changed force", () => {
		expect(graphOptionsDiffer({ ...GRAPH, repelStrength: 4 }, GRAPH)).toBe(true);
	});

	// Zooming and opening a control panel must not raise the switch prompt.
	it("ignores the keys the graph rewrites on its own", () => {
		const drifted = {
			...GRAPH,
			scale: 3.7,
			close: false,
			"collapse-filter": true,
			"collapse-forces": true,
		};
		expect(graphOptionsDiffer(drifted, GRAPH)).toBe(false);
	});

	it("ignores key order", () => {
		expect(graphOptionsDiffer({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(false);
	});

	it("reports a change when either side is unreadable", () => {
		for (const bad of [null, undefined, 42, "text", []]) {
			expect(graphOptionsDiffer(bad, GRAPH)).toBe(true);
			expect(graphOptionsDiffer(GRAPH, bad)).toBe(true);
		}
	});
});
