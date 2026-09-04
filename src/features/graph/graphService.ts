import type { SliceContext } from "../../shared/context";
import { enabledCommunityPluginIds } from "../../shared/obsidian/pluginState";
import { GraphOptionsAdapter } from "./GraphOptionsAdapter";
import { graphOptionsDiffer } from "./domain/graphDiff";
import { resolveGraphMode, type GraphModeResolution } from "./domain/graphOwners";

/**
 * Whether this plugin owns the graph settings, and the settings themselves.
 *
 * Saving and switching both need this, so it is the one part of the graph
 * slice other slices may reach. Everything else here stays private.
 */
export interface GraphService {
	/** What the settings tab reports, so the user can see what auto decided. */
	resolution(): GraphModeResolution;
	/** Whether to capture and apply graph settings at all right now. */
	isActive(): boolean;
	/** The settings in use now. Null when the graph plugin is off or unreachable. */
	current(): Record<string, unknown> | null;
	apply(options: Record<string, unknown>): Promise<void>;
	/**
	 * Whether the graph moved away from a stored snapshot.
	 *
	 * A workspace with no snapshot yet is not treated as changed, so turning the
	 * setting on does not make every existing workspace ask at once.
	 */
	hasChanged(saved: Record<string, unknown> | undefined): boolean;
	/** Re-read the enabled plugin list and resolve the mode again. */
	refresh(): Promise<void>;
}

export function createGraphService(ctx: SliceContext): GraphService {
	const adapter = new GraphOptionsAdapter(ctx.app);

	/**
	 * Cached because the switch prompt decides synchronously. Refreshed before
	 * every action, which is often enough that a plugin toggled mid-session is
	 * picked up without an event to listen for. Starts inactive so nothing is
	 * written before the first read.
	 */
	let mode: GraphModeResolution = { active: false, blockedBy: null };

	const refresh = async (): Promise<void> => {
		// Obsidian fires no documented event when another plugin is turned on or
		// off, so the enabled list is read again rather than watched. The file is
		// small and this runs on a reload or an action, not on every keystroke.
		const enabled = await enabledCommunityPluginIds(
			ctx.app.vault.adapter,
			ctx.app.vault.configDir,
		);
		mode = resolveGraphMode(ctx.settings().graphSettings, enabled);
	};

	return {
		resolution: () => mode,
		isActive: () => mode.active,
		current: () => adapter.current(),
		apply: (options) => adapter.apply(options),
		hasChanged: (saved) =>
			saved ? graphOptionsDiffer(adapter.current(), saved) : false,
		refresh,
	};
}
