/**
 * The plumbing every slice shares, and nothing any one slice owns.
 *
 * This is what used to sit in `main.ts` around the feature methods: the data,
 * the registry, saving, reloading, and turning a thrown error into a Notice.
 * Draining it here is what lets `main.ts` name no feature at all.
 *
 * Nothing in this file knows a feature exists.
 */

import { Notice, type Plugin } from "obsidian";
import { WorkspaceRegistry } from "./domain/workspace/WorkspaceRegistry";
import { userMessage } from "./domain/errors";
import type { MetaStore } from "./domain/workspace/ports";
import type { PersistedData } from "./domain/settings/PluginSettings";
import { DirectWorkspacesAdapter } from "./obsidian/DirectWorkspacesAdapter";
import { createCoreConflictWarner } from "./obsidian/coreConflict";
import { createActions } from "./actions";
import type { SettingsSection, SliceContext } from "./context";

export interface PluginRuntime {
	context: SliceContext;
	/** The contributed settings blocks, lowest order first. */
	sections(): SettingsSection[];
}

export function createRuntime(plugin: Plugin, initial: PersistedData): PluginRuntime {
	let data = initial;
	let registry: WorkspaceRegistry | null = null;

	const core = new DirectWorkspacesAdapter(plugin.app);
	const warnCoreConflict = createCoreConflictWarner(core);

	const repaintListeners: (() => void)[] = [];
	const beforeAction: (() => Promise<void>)[] = [];
	const sections: SettingsSection[] = [];

	const repaint = (): void => {
		for (const listener of repaintListeners) listener();
	};

	const runBeforeAction = async (): Promise<void> => {
		for (const hook of beforeAction) await hook();
	};

	const requireRegistry = (): WorkspaceRegistry => {
		if (!registry) {
			throw new Error("[workspace-organizer] no metadata store installed yet");
		}
		return registry;
	};

	const context: SliceContext = {
		app: plugin.app,
		plugin,

		registry: requireRegistry,
		settings: () => data.settings,
		data: () => data,
		replaceData: async (next) => {
			data = next;
			await plugin.saveData(data);
		},
		embeddedMeta: () => core,

		persist: async () => {
			await plugin.saveData(data);
			repaint();
		},

		/**
		 * Re-read the file and the core plugin state, then rebuild the metadata.
		 *
		 * Runs before anything that shows a list, because the vault can be synced
		 * from another device or edited by hand while the plugin is running.
		 */
		reload: async () => {
			await core.reload();
			await requireRegistry().refresh();
			await runBeforeAction();
			warnCoreConflict();
			repaint();
		},

		/**
		 * Run an action, reporting any failure once, in the user's language.
		 *
		 * Every action goes through here, which is what keeps the graph mode
		 * current without an event to subscribe to. A failed read leaves the last
		 * answer in place rather than stopping the action.
		 */
		attempt: async (fn) => {
			try {
				await runBeforeAction();
				await fn();
			} catch (err) {
				new Notice(userMessage(err));
				console.error("[workspace-organizer] action failed", err);
			}
			repaint();
		},

		repaint,
		onRepaint: (fn) => {
			repaintListeners.push(fn);
		},
		onBeforeAction: (fn) => {
			beforeAction.push(fn);
		},

		useStore: (store: MetaStore) => {
			registry = new WorkspaceRegistry(core, store);
		},
		addSection: (section) => {
			sections.push(section);
		},

		actions: createActions(),
	};

	return {
		context,
		sections: () => [...sections].sort((a, b) => a.order - b.order),
	};
}
