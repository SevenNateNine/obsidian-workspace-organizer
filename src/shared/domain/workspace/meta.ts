/**
 * What this plugin knows about a workspace that core does not store.
 *
 * Core stores a name and an opaque layout. Everything else a user can give a
 * workspace lives here, and is written to whichever place the storage mode
 * chooses. See `MetaStore`.
 */

export interface WorkspaceMeta {
	/** Flat, normalized, no leading "#". See `tags.ts`. */
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
	 * See `GraphOptionsAdapter`. Absent until a save made while `graphSettings`
	 * resolved active, and kept afterwards so turning the setting back on does
	 * not start from nothing.
	 */
	graph?: Record<string, unknown>;
}

export function defaultMeta(order = 0): WorkspaceMeta {
	return { tags: [], archived: false, description: "", order };
}
