/** What a row shows under the workspace name. Stored in `data.json`. */
export const SUBTITLES = ["description", "preview"] as const;
export type Subtitle = (typeof SUBTITLES)[number];

export interface WorkspaceMeta {
	/** Normalized by `normalizeTag`. */
	readonly tags: readonly string[];
	readonly archived: boolean;
	readonly description: string;
	/** Contiguous from 0 after `reconcile`. */
	readonly order: number;
	/** Absent in data from older builds, which means `description`. */
	readonly subtitle?: Subtitle;
	/**
	 * A graph settings snapshot from the removed graph feature. Nothing reads it.
	 * It is kept so that stored snapshots survive if the feature returns.
	 */
	readonly graph?: Readonly<Record<string, unknown>>;
}

export type MetaByName = Readonly<Record<string, WorkspaceMeta>>;

export interface EditableMeta {
	readonly tags: readonly string[];
	readonly description: string;
	readonly subtitle: Subtitle;
}

export function defaultMeta(order = 0): WorkspaceMeta {
	return { tags: [], archived: false, description: "", order };
}

export function subtitleOf(meta: WorkspaceMeta): Subtitle {
	return meta.subtitle ?? "description";
}

/** An empty description falls back to the preview, so a row never shows a blank line. */
export function showsPreview(meta: WorkspaceMeta): boolean {
	return subtitleOf(meta) === "preview" || !meta.description;
}
