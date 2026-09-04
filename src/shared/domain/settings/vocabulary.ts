/**
 * The fixed words a setting can hold, and the runtime lists of them.
 *
 * Every value here is a closed set of strings that `migrateData` validates
 * against, so a hand-edited or synced `data.json` cannot smuggle in a mode
 * nothing knows how to run.
 *
 * This module holds no behaviour and imports nothing. That is deliberate: the
 * settings schema and every feature both need these words, so anything else
 * living here would make one import the other.
 */

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

/**
 * When to save and restore graph settings with a workspace.
 *
 * The rules behind `auto` live with the graph feature, in `graphOwners.ts`.
 * Only the word itself belongs here, because the settings schema validates it.
 */
export type GraphMode = "auto" | "always" | "never";

export const GRAPH_MODES: GraphMode[] = ["auto", "always", "never"];
