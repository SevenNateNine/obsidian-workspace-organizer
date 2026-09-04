import type { SliceContext } from "../context";
import { formatSummary, summarizeLayout } from "../domain/workspace/layoutSummary";
import type { WorkspaceMeta } from "../domain/workspace/meta";
import type { WorkspaceEntry } from "../domain/workspace/WorkspaceRegistry";

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
export function describeWorkspace(
	layout: unknown,
	meta: WorkspaceMeta,
	maxNames: number,
): Described {
	const preview = formatSummary(summarizeLayout(layout), maxNames);
	if (!meta.description) return { primary: preview, tooltip: preview };

	return { primary: meta.description, tooltip: `${meta.description}\n${preview}` };
}

/** The same, for a row that already holds the context. */
export function describeEntry(ctx: SliceContext, entry: WorkspaceEntry): Described {
	return describeWorkspace(
		ctx.registry().layoutOf(entry.name),
		entry.meta,
		ctx.settings().previewNameCount,
	);
}
