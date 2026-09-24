import { Setting } from "obsidian";
import type { WorkspaceEntry } from "../../core/workspaces";
import { describe } from "../switcher";
import type { SectionContext } from "./SectionContext";

interface RowButton {
	readonly icon: string;
	readonly tooltip: string;
	readonly disabled?: boolean;
	readonly onClick: () => void;
}

export function renderManager(ctx: SectionContext): void {
	const entries = ctx.service.registry.entries();
	new Setting(ctx.el).setName("Workspaces").setHeading();

	if (entries.length === 0) {
		ctx.el.createEl("p", {
			cls: "ew-empty",
			text: "No workspaces yet. Arrange your panes, then run “Save current layout as a new workspace”.",
		});
		return;
	}

	for (const [index, entry] of entries.entries()) {
		const position = { isFirst: index === 0, isLast: index === entries.length - 1 };
		renderRow(ctx, entry, position);
	}
}

function renderRow(
	ctx: SectionContext,
	entry: WorkspaceEntry,
	position: { isFirst: boolean; isLast: boolean },
): void {
	const { name, meta, isActive } = entry;
	const { primary } = describe(
		ctx.service.registry.layoutOf(name),
		meta,
		ctx.service.settings.previewNameCount,
	);
	const tags = meta.tags.map((tag) => `#${tag}`).join(" ");

	const setting = new Setting(ctx.el)
		.setName(name + (isActive ? " (active)" : ""))
		.setDesc([tags, primary].filter(Boolean).join(" · "));
	setting.settingEl.toggleClass("ew-archived-row", meta.archived);

	for (const button of rowButtons(ctx, entry, position)) {
		setting.addExtraButton((extra) =>
			extra
				.setIcon(button.icon)
				.setTooltip(button.tooltip)
				.setDisabled(button.disabled ?? false)
				.onClick(button.onClick),
		);
	}
}

function rowButtons(
	{ actions, redraw }: SectionContext,
	{ name, meta }: WorkspaceEntry,
	{ isFirst, isLast }: { isFirst: boolean; isLast: boolean },
): readonly RowButton[] {
	return [
		{
			icon: "arrow-up",
			tooltip: "Move up",
			disabled: isFirst,
			onClick: () => actions.moveBy(name, -1, redraw),
		},
		{
			icon: "arrow-down",
			tooltip: "Move down",
			disabled: isLast,
			onClick: () => actions.moveBy(name, 1, redraw),
		},
		{
			icon: "tag",
			tooltip: "Edit tags and description",
			onClick: () => actions.openEditor(name, redraw),
		},
		{
			icon: "pencil",
			tooltip: "Rename",
			onClick: () => actions.promptRename(name, redraw),
		},
		{
			icon: "copy",
			tooltip: "Duplicate",
			onClick: () => actions.promptDuplicate(name, redraw),
		},
		{
			icon: meta.archived ? "archive-restore" : "archive",
			tooltip: meta.archived ? "Unarchive" : "Archive",
			onClick: () => actions.toggleArchived(name, redraw),
		},
		{
			icon: "trash",
			tooltip: "Delete",
			onClick: () => actions.promptDelete(name, redraw),
		},
	];
}
