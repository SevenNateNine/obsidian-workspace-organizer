/**
 * Graph settings per workspace.
 *
 * Obsidian holds one global set of graph settings, outside the layout, so a
 * saved workspace cannot carry them by itself. This slice captures them on a
 * save and applies them on a switch, and stands aside when another plugin owns
 * the graph. See `domain/graphOwners.ts` for why standing aside is the default.
 *
 * The save and switch slices reach this one, because the ordering rules around
 * the graph are theirs to honour. Nothing else here is public.
 */

import type { SliceContext } from "../../shared/context";
import { createGraphService, type GraphService } from "./graphService";
import { graphSection } from "./ui/graphSection";

export type { GraphService } from "./graphService";

export function registerGraph(ctx: SliceContext): GraphService {
	const graph = createGraphService(ctx);

	// Obsidian announces no event when another plugin is enabled, so the mode is
	// resolved again before each action rather than watched.
	ctx.onBeforeAction(() => graph.refresh());

	ctx.addSection({
		order: 20,
		render: (container, redraw) => graphSection(ctx, graph, container, redraw),
	});

	return graph;
}
