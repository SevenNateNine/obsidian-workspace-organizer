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
		if (!meta) return;

		new WorkspaceEditModal(ctx.app, {
			name,
			meta,
			layout: ctx.registry().layoutOf(name),
			previewNameCount: ctx.settings().previewNameCount,
			onSave: (patch) =>
				void ctx.attempt(async () => {
					await ctx.registry().setMeta(name, patch);
					after?.();
				}),
		}).open();
	};
}
