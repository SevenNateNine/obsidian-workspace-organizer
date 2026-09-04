/**
 * Writing the layout on screen into a workspace.
 *
 * Reaches the graph slice directly, because the order matters: the layout is
 * saved first, then the graph snapshot goes in as metadata, since a workspace
 * has to exist before it can carry any.
 */

import type { SliceContext } from "../../shared/context";
import type { GraphService } from "../graph";
import { createSaveService, type SaveService } from "./save";

export type { SaveService } from "./save";

export function registerSave(ctx: SliceContext, graph: GraphService): SaveService {
	const save = createSaveService(ctx, graph);

	ctx.actions.saveActive = () => void save.saveActive();
	ctx.actions.promptSaveAs = (after) => save.promptSaveAs(after);

	ctx.plugin.addCommand({
		id: "save-workspace",
		name: "Save current layout to the active workspace",
		callback: () => void save.saveActive(),
	});

	ctx.plugin.addCommand({
		id: "save-workspace-as",
		name: "Save current layout as a new workspace…",
		callback: () => save.promptSaveAs(),
	});

	return save;
}
