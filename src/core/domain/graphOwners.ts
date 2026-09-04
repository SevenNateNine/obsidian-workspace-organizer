/**
 * Who owns the graph settings when more than one plugin wants them.
 *
 * This plugin stores one set of graph settings per workspace and applies them
 * globally, through the one undocumented access in `GraphOptionsAdapter`. Other
 * plugins do the same job per pane, which is strictly better when they are
 * installed: with both running, a switch writes `graph.json` twice and whichever
 * applies last wins.
 *
 * So the default is to step aside when one of them is on. The list below can
 * never be complete, which is why `always` and `never` exist: auto is a
 * convenience, and the explicit modes are the answer for anything it misses.
 */

import type { GraphMode } from "./vocabulary";

/**
 * Community plugins that own graph settings themselves, by plugin id.
 *
 * The value is the display name, shown in settings so the user can see what
 * auto reacted to rather than only that it backed off.
 */
export const GRAPH_OWNERS: Record<string, string> = {
	"graph-profiles": "Graph Profiles",
	"graph-presets": "Graph Presets",
	"extended-graph": "Extended Graph",
};

export interface GraphModeResolution {
	/** Whether to capture and apply graph settings at all. */
	active: boolean;
	/** The plugin auto stepped aside for, or null. Null whenever mode is not `auto`. */
	blockedBy: string | null;
}

/**
 * Turn the setting plus the enabled plugin list into a yes or no.
 *
 * `enabledIds` is read fresh at each decision point rather than cached, because
 * Obsidian fires no documented event when another plugin is turned on or off.
 */
export function resolveGraphMode(
	mode: GraphMode,
	enabledIds: readonly string[],
): GraphModeResolution {
	if (mode === "never") return { active: false, blockedBy: null };
	if (mode === "always") return { active: true, blockedBy: null };

	for (const id of enabledIds) {
		const name = GRAPH_OWNERS[id];
		if (name) return { active: false, blockedBy: name };
	}

	return { active: true, blockedBy: null };
}
