/**
 * Loading another workspace, and asking what to do with the layout on screen.
 *
 * Reaches the save slice, because "save and switch" has to finish saving
 * before it loads, and the graph slice, because the graph is applied before
 * the layout rather than after. Both orderings are load bearing.
 */

import type { SliceContext } from "../../shared/context";
import type { GraphService } from "../graph";
import type { SaveService } from "../save";
import { createSwitchService } from "./switch";
import { switchingSection } from "./ui/switchingSection";

export function registerSwitch(
	ctx: SliceContext,
	graph: GraphService,
	save: SaveService,
): void {
	const change = createSwitchService(ctx, graph, save);

	ctx.actions.switchTo = (name) => change.switchTo(name);
	ctx.actions.stepBy = (delta) => change.stepBy(delta);

	ctx.plugin.addCommand({
		id: "next-workspace",
		name: "Switch to next workspace",
		callback: () => change.stepBy(1),
	});

	ctx.plugin.addCommand({
		id: "previous-workspace",
		name: "Switch to previous workspace",
		callback: () => change.stepBy(-1),
	});

	ctx.addSection({
		order: 10,
		render: (container) => switchingSection(ctx, container),
	});
}
