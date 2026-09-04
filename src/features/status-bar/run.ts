import { Menu, Notice } from "obsidian";
import type { SliceContext } from "../../shared/context";
import type { StatusBarAction } from "../../shared/domain/settings/vocabulary";

/**
 * Turn a mouse button into the action bound to it.
 *
 * Every branch dispatches through `ctx.actions`. That is what keeps the status
 * bar from importing five other slices to offer one menu.
 */
export function run(ctx: SliceContext, action: StatusBarAction): void {
	const active = ctx.registry().activeName();

	switch (action) {
		case "switcher":
			return ctx.actions.openSwitcher();
		case "save":
			return ctx.actions.saveActive();
		case "save-as":
			return ctx.actions.promptSaveAs();
		case "rename":
			return active ? ctx.actions.promptRename(active) : warnNoActive();
		case "next":
			return ctx.actions.stepBy(1);
		case "prev":
			return ctx.actions.stepBy(-1);
		case "menu":
		case "none":
			return;
	}
}

export function buildMenu(ctx: SliceContext, menu: Menu): void {
	const active = ctx.registry().activeName();

	menu.addItem((item) =>
		item
			.setTitle("Switch workspace…")
			.setIcon("layout-grid")
			.onClick(() => ctx.actions.openSwitcher()),
	);
	menu.addItem((item) =>
		item
			.setTitle("Save current layout")
			.setIcon("save")
			.onClick(() => ctx.actions.saveActive()),
	);
	menu.addItem((item) =>
		item
			.setTitle("Save as new workspace…")
			.setIcon("copy-plus")
			.onClick(() => ctx.actions.promptSaveAs()),
	);

	if (!active) return;

	menu.addSeparator();
	menu.addItem((item) =>
		item
			.setTitle("Edit tags and description…")
			.setIcon("tag")
			.onClick(() => ctx.actions.openEditor(active)),
	);
	menu.addItem((item) =>
		item
			.setTitle("Rename…")
			.setIcon("pencil")
			.onClick(() => ctx.actions.promptRename(active)),
	);
	menu.addItem((item) =>
		item
			.setTitle("Duplicate…")
			.setIcon("copy")
			.onClick(() => ctx.actions.promptDuplicate(active)),
	);
}

function warnNoActive(): void {
	new Notice("No workspace is active yet. Save the current layout first.");
}
