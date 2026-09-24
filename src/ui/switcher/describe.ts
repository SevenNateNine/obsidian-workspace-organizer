import { formatSummary, summarizeLayout } from "../../core/layout";
import type { WorkspaceMeta } from "../../core/organize";

export interface Described {
	readonly primary: string;
	readonly tooltip: string;
}

/** A typed description wins the visible line. The generated preview moves to the tooltip. */
export function describe(
	layout: unknown,
	meta: WorkspaceMeta,
	maxNames: number,
): Described {
	const preview = formatSummary(summarizeLayout(layout), maxNames);
	if (!meta.description) return { primary: preview, tooltip: preview };

	return { primary: meta.description, tooltip: `${meta.description}\n${preview}` };
}
