export interface WorkspaceMeta {
	/** Normalized by `normalizeTag`. */
	readonly tags: readonly string[];
	readonly archived: boolean;
	/** Empty falls back to the generated layout preview. */
	readonly description: string;
	/** Contiguous from 0 after `reconcile`. */
	readonly order: number;
	/**
	 * Obsidian keeps graph settings outside the layout, so `getLayout` cannot carry them.
	 * Kept when `graphSettings` turns off, so turning it on again does not start from nothing.
	 */
	readonly graph?: Readonly<Record<string, unknown>>;
}

export type MetaByName = Readonly<Record<string, WorkspaceMeta>>;

export type EditableMeta = Pick<WorkspaceMeta, "tags" | "description">;

export function defaultMeta(order = 0): WorkspaceMeta {
	return { tags: [], archived: false, description: "", order };
}
