/**
 * What a slice can reach.
 *
 * Passed to every `register` function. A slice reads this and nothing else
 * about the plugin, which is what lets a feature live in one folder.
 *
 * Every workspace-shaped accessor is a function rather than a field, because
 * changing the storage mode replaces the registry. A captured reference would
 * keep answering from the old one.
 */

import type { App, Plugin } from "obsidian";
import type { WorkspaceRegistry } from "./domain/workspace/WorkspaceRegistry";
import type { EmbeddedMetaPort, MetaStore } from "./domain/workspace/ports";
import type { PersistedData, PluginSettings } from "./domain/settings/PluginSettings";
import type { WorkspaceActions } from "./actions";

/** One block of the settings tab, contributed by one slice. */
export interface SettingsSection {
	/** Lower paints first. Leave gaps of ten so a new section can slot in. */
	order: number;
	render(container: HTMLElement, redraw: () => void): void;
}

export interface SliceContext {
	app: App;
	/** For addCommand, addSettingTab, addStatusBarItem, and registerEvent. */
	plugin: Plugin;

	registry(): WorkspaceRegistry;
	settings(): PluginSettings;
	/** The whole of `data.json`. The storage slice needs it; others want `settings`. */
	data(): PersistedData;
	/** Replace `data.json` wholesale. Storage slice only. */
	replaceData(data: PersistedData): Promise<void>;
	/** Metadata carried inside the workspaces file, for the embedded storage mode. */
	embeddedMeta(): EmbeddedMetaPort;

	/** Write `data.json`, then repaint. */
	persist(): Promise<void>;
	/** Re-read the workspaces file and the core plugin state, then rebuild. */
	reload(): Promise<void>;
	/** Run an action, reporting one failure in the user's language. */
	attempt(fn: () => Promise<void>): Promise<void>;

	/** Repaint anything derived from the workspace list. */
	repaint(): void;
	/** The status bar is the only caller today. */
	onRepaint(fn: () => void): void;
	/**
	 * Run before every action, to re-read state that fires no event.
	 *
	 * The graph slice is the only caller: Obsidian announces no event when
	 * another plugin is turned on, so the enabled list is read again instead.
	 */
	onBeforeAction(fn: () => Promise<void>): void;

	/** Swap the metadata store and rebuild the registry. Storage slice only. */
	useStore(store: MetaStore): void;
	addSection(section: SettingsSection): void;

	/** Operations other slices can start. Filled in during registration. */
	actions: WorkspaceActions;
}
