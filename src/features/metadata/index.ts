/**
 * The tags and description a user gives a workspace.
 *
 * Core stores neither, so this is the only place either is edited.
 */

import type { SliceContext } from "../../shared/context";
import { WorkspaceEditModal } from "./ui/WorkspaceEditModal";

export function registerMetadata(ctx: SliceContext): void {
	ctx.actions.openEditor = (name, after) => {
		const meta = ctx.registry().metaOf(name);
		if (meta) new WorkspaceEditModal(ctx, name, meta, after).open();
	};
}
