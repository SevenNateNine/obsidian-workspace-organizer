import { Menu } from "obsidian";
import type { StatusBarHandlers } from "../status-bar";
import { fillMenu } from "./menu";
import type { WorkspaceActions } from "./WorkspaceActions";

export function statusBarHandlers(actions: WorkspaceActions): StatusBarHandlers {
	return {
		none: () => undefined,
		menu: (event) => {
			const menu = new Menu();
			fillMenu(menu, actions);
			menu.showAtMouseEvent(event);
		},
		switcher: () => actions.openSwitcher(),
		save: () => void actions.saveActive(),
		"save-as": () => actions.promptSaveAs(),
		rename: () => actions.renameActive(),
		next: () => actions.step(1),
		prev: () => actions.step(-1),
	};
}
