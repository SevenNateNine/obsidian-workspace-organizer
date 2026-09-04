import type { SliceContext } from "../../shared/context";
import type { MetaStore } from "../../shared/domain/workspace/ports";
import type { StorageMode } from "../../shared/domain/settings/vocabulary";
import { EmbeddedStore } from "./EmbeddedStore";
import { SidecarStore } from "./SidecarStore";

/** Build the store for a mode. Both read and write the same metadata shape. */
export function createStore(ctx: SliceContext, mode: StorageMode): MetaStore {
	if (mode === "embedded") return new EmbeddedStore(ctx.embeddedMeta());

	return new SidecarStore({
		current: () => ctx.data(),
		replace: (data) => ctx.replaceData(data),
	});
}

/**
 * Move metadata to the other storage location, then forget the old one.
 *
 * Done in that order so a failure part way through leaves the metadata
 * readable in at least one place.
 */
export async function moveStorage(ctx: SliceContext, mode: StorageMode): Promise<void> {
	const settings = ctx.settings();
	if (mode === settings.storage) return;

	const from = createStore(ctx, settings.storage);
	const to = createStore(ctx, mode);
	await to.write(await from.read());
	await from.write({});

	settings.storage = mode;
	await ctx.persist();

	ctx.useStore(createStore(ctx, mode));
	await ctx.reload();
}
