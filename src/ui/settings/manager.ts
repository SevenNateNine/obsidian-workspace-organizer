import { Menu, Setting, setIcon } from "obsidian";
import type { WorkspaceEntry } from "../../core/workspaces";
import { describe } from "../switcher";
import { enableDragReorder, type ReorderRow } from "./dragReorder";
import type { SectionContext } from "./SectionContext";

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

	const rows = entries.map((entry) => renderRow(ctx, entry));
	enableDragReorder(rows, (from, delta) => {
		const entry = entries[from];
		if (entry) ctx.actions.moveBy(entry.name, delta, ctx.redraw);
	});
}

function renderRow(ctx: SectionContext, entry: WorkspaceEntry): ReorderRow {
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
	setting.settingEl.addClass("ew-manager-row");
	setting.settingEl.toggleClass("ew-archived-row", meta.archived);

	const handle = createDiv({
		cls: "ew-drag-handle",
		attr: { "aria-label": "Drag to reorder" },
	});
	setIcon(handle, "grip-vertical");
	setting.settingEl.prepend(handle);

	setting
		.addExtraButton((button) =>
			button
				.setIcon("pencil")
				.setTooltip("Edit name, tags, and description")
				.onClick(() => ctx.actions.openEditor(name, ctx.redraw)),
		)
		.addExtraButton((button) =>
			button
				.setIcon("more-vertical")
				.setTooltip("More")
				.onClick(() => showMoreMenu(ctx, entry, button.extraSettingsEl)),
		);

	return { row: setting.settingEl, handle };
}

function showMoreMenu(
	{ actions, redraw }: SectionContext,
	{ name, meta }: WorkspaceEntry,
	anchor: HTMLElement,
): void {
	const menu = new Menu();
	menu.addItem((item) =>
		item
			.setTitle("Duplicate")
			.setIcon("copy")
			.onClick(() => actions.promptDuplicate(name, redraw)),
	);
	menu.addItem((item) =>
		item
			.setTitle(meta.archived ? "Unarchive" : "Archive")
			.setIcon(meta.archived ? "archive-restore" : "archive")
			.onClick(() => actions.toggleArchived(name, redraw)),
	);
	menu.addItem((item) =>
		item
			.setTitle("Delete")
			.setIcon("trash")
			.setWarning(true)
			.onClick(() => actions.promptDelete(name, redraw)),
	);

	const rect = anchor.getBoundingClientRect();
	menu.showAtPosition({ x: rect.left, y: rect.bottom });
}
