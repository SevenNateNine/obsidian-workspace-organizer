// The enum values are stored in `data.json`. Renaming one resets every user who chose it.

/**
 * `sidecar` keeps `workspaces.json` byte-for-byte what vanilla Obsidian writes.
 * `embedded` depends on core preserving a key it does not know about.
 */
export const STORAGE_MODES = ["sidecar", "embedded"] as const;
export type StorageMode = (typeof STORAGE_MODES)[number];

export const STATUS_BAR_ACTIONS = [
	"none",
	"menu",
	"switcher",
	"save",
	"save-as",
	"rename",
	"next",
	"prev",
] as const;
export type StatusBarAction = (typeof STATUS_BAR_ACTIONS)[number];

export const SWITCH_PROMPTS = ["always", "changed", "never"] as const;
export type SwitchPrompt = (typeof SWITCH_PROMPTS)[number];

/** See `core/graph/graphOwners.ts` for why `always` and `never` exist beside `auto`. */
export const GRAPH_MODES = ["auto", "always", "never"] as const;
export type GraphMode = (typeof GRAPH_MODES)[number];

export const PREVIEW_NAME_COUNT = { min: 1, max: 8 } as const;

export interface StatusBarSettings {
	readonly enabled: boolean;
	readonly click: StatusBarAction;
	readonly middleClick: StatusBarAction;
	readonly rightClick: StatusBarAction;
}

export type StatusBarButton = Exclude<keyof StatusBarSettings, "enabled">;

export interface PluginSettings {
	readonly storage: StorageMode;
	readonly promptOnSwitch: SwitchPrompt;
	readonly graphSettings: GraphMode;
	readonly showArchived: boolean;
	readonly previewNameCount: number;
	readonly statusBar: StatusBarSettings;
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
