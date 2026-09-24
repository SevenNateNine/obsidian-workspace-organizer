import { Menu } from "obsidian";
import type { WorkspaceActions } from "./WorkspaceActions";

interface MenuEntry {
	readonly title: string;
	readonly icon: string;
	readonly run: () => void;
}

export function fillMenu(menu: Menu, actions: WorkspaceActions): void {
	const always: readonly MenuEntry[] = [
		{
			title: "Switch workspace…",
			icon: "layout-grid",
			run: () => actions.openSwitcher(),
		},
		{
			title: "Save current layout",
			icon: "save",
			run: () => void actions.saveActive(),
		},
		{
			title: "Save as new workspace…",
			icon: "copy-plus",
			run: () => actions.promptSaveAs(),
		},
	];
	addEntries(menu, always);

	const active = actions.activeName();
	if (!active) return;

	menu.addSeparator();
	addEntries(menu, [
		{
			title: "Edit name, tags, and description…",
			icon: "tag",
			run: () => actions.openEditor(active),
		},
		{ title: "Rename…", icon: "pencil", run: () => actions.promptRename(active) },
		{ title: "Duplicate…", icon: "copy", run: () => actions.promptDuplicate(active) },
	]);
}

function addEntries(menu: Menu, entries: readonly MenuEntry[]): void {
	for (const { title, icon, run } of entries) {
		menu.addItem((item) => item.setTitle(title).setIcon(icon).onClick(run));
	}
}
