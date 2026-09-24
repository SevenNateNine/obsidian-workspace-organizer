import { formatSummary, summarizeLayout } from "../../core/layout/layoutSummary";
import type { WorkspaceMeta } from "../../core/settings/settings";

export interface Described {
	/** The subtext line. */
	primary: string;
	/** The hover tooltip, which always includes the generated preview. */
	tooltip: string;
}

/**
 * Decide what a workspace row says about itself.
 *
 * A written description wins the visible line, because someone typed it on
 * purpose. The generated preview is never lost though: it moves to the tooltip,
 * where it stays available without costing a second row of height.
 */
export function describe(
	layout: unknown,
	meta: WorkspaceMeta,
	maxNames: number,
): Described {
	const preview = formatSummary(summarizeLayout(layout), maxNames);
	if (!meta.description) return { primary: preview, tooltip: preview };

	return { primary: meta.description, tooltip: `${meta.description}\n${preview}` };
}
