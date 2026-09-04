import { Notice } from "obsidian";

/** What the warner needs to know, so it can be tested without an adapter. */
export interface CoreConflictSource {
	isBlockedByCore(): boolean;
}

/**
 * Say why nothing can be saved, once.
 *
 * Both this plugin and the core Workspaces plugin write `workspaces.json`, and
 * core caches it in memory, so with both running one silently overwrites the
 * other's workspaces. A reload is needed because core reads the file when it
 * loads.
 *
 * The flag resets when the conflict clears, so turning core off and on again
 * warns again.
 */
export function createCoreConflictWarner(source: CoreConflictSource): () => void {
	let warned = false;

	return () => {
		if (!source.isBlockedByCore()) {
			warned = false;
			return;
		}
		if (warned) return;

		warned = true;
		new Notice(
			"Workspace Organizer is read-only while the core Workspaces plugin is on. " +
				"Turn it off in Settings, Core plugins, then reload Obsidian.",
			10000,
		);
	};
}
