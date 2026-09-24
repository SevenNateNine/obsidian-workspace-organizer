import { formatSummary, summarizeLayout } from "../../core/layout";
import { showsPreview, type WorkspaceMeta } from "../../core/organize";

export interface Described {
	readonly primary: string;
	readonly tooltip: string;
}

/** The workspace chooses the visible line. The tooltip always holds both. */
export function describe(
	layout: unknown,
	meta: WorkspaceMeta,
	maxNames: number,
): Described {
	const preview = formatSummary(summarizeLayout(layout), maxNames);
	const tooltip = meta.description ? `${meta.description}\n${preview}` : preview;
	return { primary: showsPreview(meta) ? preview : meta.description, tooltip };
}
