/**
 * The whole of `data.json`, and the defaults every field falls back to.
 *
 * `PluginSettings` stays one flat object. Each feature reads its own fields,
 * but the object is loaded, migrated, and written as a unit, so assembling the
 * defaults from separate contributions would only add an ordering problem.
 */

import type {
	GraphMode,
	StatusBarAction,
	StorageMode,
	SwitchPrompt,
} from "./vocabulary";
import type { WorkspaceMeta } from "../workspace/meta";

/** Bump when a stored shape changes in a way `migrateData` must handle. */
export const CURRENT_SCHEMA_VERSION = 1;

export interface StatusBarSettings {
	enabled: boolean;
	click: StatusBarAction;
	middleClick: StatusBarAction;
	rightClick: StatusBarAction;
}

export interface PluginSettings {
	storage: StorageMode;
	/**
	 * When to ask what to do with the current layout before switching away.
	 *
	 * `changed` compares the layout on screen with the stored one. The layout
	 * shape is private and core can change it without notice, so the comparison
	 * fails toward the prompt. Anything it cannot read counts as changed.
	 */
	promptOnSwitch: SwitchPrompt;
	/**
	 * Whether to save and restore the core graph plugin's settings with each
	 * workspace.
	 *
	 * Obsidian holds one global set of graph settings, so restoring a workspace
	 * changes the graph everywhere. Local graph views carry their own settings
	 * already and are not affected.
	 *
	 * `auto` stands down when a plugin that owns the graph itself is enabled.
	 * See `graphOwners.ts` for why that is the default and why the other two
	 * modes exist.
	 */
	graphSettings: GraphMode;
	/** Show archived workspaces in the switcher anyway. */
	showArchived: boolean;
	/** How many file names the generated layout preview lists. */
	previewNameCount: number;
	statusBar: StatusBarSettings;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	storage: "sidecar",
	promptOnSwitch: "always",
	graphSettings: "auto",
	showArchived: false,
	previewNameCount: 3,
	statusBar: {
		enabled: true,
		click: "switcher",
		middleClick: "save",
		rightClick: "menu",
	},
};

export interface PersistedData {
	schemaVersion: number;
	settings: PluginSettings;
	/** Keyed by core's workspace name. Unused when `storage` is `embedded`. */
	workspaces: Record<string, WorkspaceMeta>;
}
