/**
 * The workspace list in settings: reorder, rename, duplicate, archive, delete.
 *
 * Each row button that belongs to another slice goes through `ctx.actions`, so
 * the row never imports the edit modal or the prompts it opens.
 */

import type { SliceContext } from "../../shared/context";
import { createManageActions } from "./manage";
import { managerSection } from "./ui/managerSection";

export function registerManager(ctx: SliceContext): void {
	const manage = createManageActions(ctx);

	ctx.actions.promptRename = manage.promptRename;
	ctx.actions.promptDuplicate = manage.promptDuplicate;
	ctx.actions.promptDelete = manage.promptDelete;

	ctx.addSection({
		order: 60,
		render: (container, redraw) => managerSection(ctx, container, redraw),
	});
}
