/**
 * Where workspace metadata is written, and moving it between the two places.
 *
 * Registers first, because installing the metadata store is what builds the
 * registry every other slice reads.
 *
 * The workspaces file adapter stays in `shared/obsidian/`. It is the only
 * writer of `workspaces.json`, so this slice borrows it rather than owning it.
 */

import type { SliceContext } from "../../shared/context";
import { createStore } from "./storage";
import { storageSection } from "./ui/storageSection";

export function registerStorage(ctx: SliceContext): void {
	ctx.useStore(createStore(ctx, ctx.settings().storage));

	ctx.addSection({
		order: 50,
		render: (container, redraw) => storageSection(ctx, container, redraw),
	});
}
