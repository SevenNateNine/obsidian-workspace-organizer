import type { GraphMode } from "../graph/graphOwners";

/** Bump when a stored shape changes in a way `migrateData` must handle. */
export const CURRENT_SCHEMA_VERSION = 1;

/** Everything this plugin knows about a workspace that core does not store. */
export interface WorkspaceMeta {
	/** Flat, normalized, no leading "#". See `core/domain/tags.ts`. */
	tags: string[];
	/** Archived workspaces stay in the manager but leave the switcher. */
	archived: boolean;
	/** Empty falls back to the generated layout preview. */
	description: string;
	/** Position in the manager. Contiguous from 0, see `reconcile`. */
	order: number;
	/**
	 * The core graph plugin's settings as they were when this workspace saved.
	 *
	 * Obsidian keeps these outside the layout, so `getLayout` cannot carry them.
	 * See `adapters/obsidian/GraphOptionsAdapter.ts`. Absent until a save made
	 * while `graphSettings` resolved active, and kept afterwards so turning the
	 * setting back on does not start from nothing.
	 */
	graph?: Record<string, unknown>;
}

export function defaultMeta(order = 0): WorkspaceMeta {
	return { tags: [], archived: false, description: "", order };
}

/**
 * Where workspace metadata is written.
 *
 * `sidecar` keeps `workspaces.json` byte-for-byte what vanilla Obsidian writes.
 * `embedded` puts metadata inside each workspace entry so it travels with the
 * vault config and survives uninstalling this plugin, at the cost of depending
 * on core preserving a key it does not know about.
 */
export type StorageMode = "sidecar" | "embedded";

export const STORAGE_MODES: StorageMode[] = ["sidecar", "embedded"];

/** What a status bar mouse button does. */
export type StatusBarAction =
	"none" | "menu" | "switcher" | "save" | "save-as" | "rename" | "next" | "prev";

export const STATUS_BAR_ACTIONS: StatusBarAction[] = [
	"none",
	"menu",
	"switcher",
	"save",
	"save-as",
	"rename",
	"next",
	"prev",
];

/** When the save prompt appears before a switch. */
export type SwitchPrompt = "always" | "changed" | "never";

export const SWITCH_PROMPTS: SwitchPrompt[] = ["always", "changed", "never"];

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
	 * See `core/domain/graphOwners.ts` for why that is the default and why the
	 * other two modes exist.
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

/** The whole of our `data.json`. */
export interface PersistedData {
	schemaVersion: number;
	settings: PluginSettings;
	/** Keyed by core's workspace name. Unused when `storage` is `embedded`. */
	workspaces: Record<string, WorkspaceMeta>;
}
