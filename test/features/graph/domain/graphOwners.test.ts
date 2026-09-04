import { describe, expect, it } from "vitest";
import { GRAPH_OWNERS, resolveGraphMode } from "@/features/graph/domain/graphOwners";

describe("resolveGraphMode", () => {
	const owners = Object.keys(GRAPH_OWNERS);

	it("steps aside in auto when a graph plugin is on", () => {
		for (const id of owners) {
			const result = resolveGraphMode("auto", ["dataview", id]);
			expect(result.active).toBe(false);
			expect(result.blockedBy).toBe(GRAPH_OWNERS[id]);
		}
	});

	it("stays on in auto when no graph plugin is on", () => {
		expect(resolveGraphMode("auto", [])).toEqual({ active: true, blockedBy: null });
		expect(resolveGraphMode("auto", ["dataview", "templater"])).toEqual({
			active: true,
			blockedBy: null,
		});
	});

	// The list of graph plugins can never be complete, so the explicit modes have
	// to win outright. That is what makes an unknown plugin recoverable.
	it("ignores the plugin list in the explicit modes", () => {
		const withOwner = ["graph-profiles"];

		expect(resolveGraphMode("always", withOwner)).toEqual({
			active: true,
			blockedBy: null,
		});
		expect(resolveGraphMode("never", withOwner)).toEqual({
			active: false,
			blockedBy: null,
		});
		expect(resolveGraphMode("never", [])).toEqual({ active: false, blockedBy: null });
	});

	it("names the first graph plugin it finds", () => {
		const result = resolveGraphMode("auto", ["graph-presets", "extended-graph"]);
		expect(result.blockedBy).toBe("Graph Presets");
	});
});
