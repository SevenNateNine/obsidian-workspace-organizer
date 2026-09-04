import { Setting } from "obsidian";
import type { SliceContext } from "../../../shared/context";
import type { WorkspaceEntry } from "../../../shared/domain/workspace/WorkspaceRegistry";
import { describeEntry } from "../../../shared/ui/describe";

export interface RowPosition {
	entry: WorkspaceEntry;
	index: number;
	total: number;
}

export function workspaceRow(
	ctx: SliceContext,
	container: HTMLElement,
	redraw: () => void,
	position: RowPosition,
): void {
	const { entry } = position;
	const { name, meta, isActive } = entry;
	const { primary } = describeEntry(ctx, entry);
	const tags = meta.tags.map((tag) => `#${tag}`).join(" ");

	const setting = new Setting(container)
		.setName(name + (isActive ? " (active)" : ""))
		.setDesc([tags, primary].filter(Boolean).join(" · "));

	setting.settingEl.toggleClass("ew-archived-row", meta.archived);

	orderButtons(ctx, setting, redraw, position);
	editButtons(ctx, setting, redraw, entry);
}

function orderButtons(
	ctx: SliceContext,
	setting: Setting,
	redraw: () => void,
	{ entry, index, total }: RowPosition,
): void {
	const { name } = entry;

	setting
		.addExtraButton((button) =>
			button
				.setIcon("arrow-up")
				.setTooltip("Move up")
				.setDisabled(index === 0)
				.onClick(
					() =>
						void ctx.attempt(async () => {
							await ctx.registry().moveBy(name, -1);
							redraw();
						}),
				),
		)
		.addExtraButton((button) =>
			button
				.setIcon("arrow-down")
				.setTooltip("Move down")
				.setDisabled(index === total - 1)
				.onClick(
					() =>
						void ctx.attempt(async () => {
							await ctx.registry().moveBy(name, 1);
							redraw();
						}),
				),
		);
}

/** Each button belongs to another slice. */
function editButtons(
	ctx: SliceContext,
	setting: Setting,
	redraw: () => void,
	entry: WorkspaceEntry,
): void {
	const { name, meta } = entry;

	setting
		.addExtraButton((button) =>
			button
				.setIcon("tag")
				.setTooltip("Edit tags and description")
				.onClick(() => ctx.actions.openEditor(name, redraw)),
		)
		.addExtraButton((button) =>
			button
				.setIcon("pencil")
				.setTooltip("Rename")
				.onClick(() => ctx.actions.promptRename(name, redraw)),
		)
		.addExtraButton((button) =>
			button
				.setIcon("copy")
				.setTooltip("Duplicate")
				.onClick(() => ctx.actions.promptDuplicate(name, redraw)),
		)
		.addExtraButton((button) =>
			button
				.setIcon(meta.archived ? "archive-restore" : "archive")
				.setTooltip(meta.archived ? "Unarchive" : "Archive")
				.onClick(
					() =>
						void ctx.attempt(async () => {
							await ctx.registry().setMeta(name, { archived: !meta.archived });
							redraw();
						}),
				),
		)
		.addExtraButton((button) =>
			button
				.setIcon("trash")
				.setTooltip("Delete")
				.onClick(() => ctx.actions.promptDelete(name, redraw)),
		);
}
