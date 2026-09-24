import type { GraphMode } from "../settings";

/**
 * Community plugins that store graph settings per pane, which is better than the
 * one global set this plugin applies. With both on, a switch writes `graph.json`
 * twice and the last one wins, so `auto` stands aside.
 *
 * This list can never be complete. That is why `always` and `never` exist.
 */
export const GRAPH_OWNERS: Readonly<Record<string, string>> = {
	"graph-profiles": "Graph Profiles",
	"graph-presets": "Graph Presets",
	"extended-graph": "Extended Graph",
};

export type GraphModeResolution =
	| { readonly active: true; readonly blockedBy: null }
	| { readonly active: false; readonly blockedBy: string | null };

const ACTIVE: GraphModeResolution = { active: true, blockedBy: null };
const INACTIVE: GraphModeResolution = { active: false, blockedBy: null };

export function resolveGraphMode(
	mode: GraphMode,
	enabledIds: readonly string[],
): GraphModeResolution {
	if (mode === "never") return INACTIVE;
	if (mode === "always") return ACTIVE;

	for (const id of enabledIds) {
		const name = GRAPH_OWNERS[id];
		if (name) return { active: false, blockedBy: name };
	}
	return ACTIVE;
}
