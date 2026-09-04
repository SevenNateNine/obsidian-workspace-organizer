import { Menu } from "obsidian";
import type { StatusBarSettings } from "../../../shared/domain/settings/PluginSettings";
import type { StatusBarAction } from "../../../shared/domain/settings/vocabulary";

export interface StatusBarDeps {
	settings: () => StatusBarSettings;
	activeName: () => string | null;
	run: (action: StatusBarAction) => void;
	/** Fills the right-click menu, and the "menu" action on any button. */
	buildMenu: (menu: Menu) => void;
}

/**
 * Shows the active workspace, and turns each mouse button into an action.
 *
 * Obsidian gives a status bar item no built-in behaviour, so the three buttons
 * are wired here and their meaning comes from settings.
 */
export class StatusBar {
	constructor(
		private readonly el: HTMLElement,
		private readonly deps: StatusBarDeps,
	) {
		el.addClass("ew-statusbar", "mod-clickable");

		el.addEventListener("click", (event) =>
			this.fire(event, this.deps.settings().click),
		);
		el.addEventListener("auxclick", (event) => {
			// Button 1 is the middle button. Anything else is already handled.
			if (event.button === 1) this.fire(event, this.deps.settings().middleClick);
		});
		el.addEventListener("contextmenu", (event) =>
			this.fire(event, this.deps.settings().rightClick),
		);
	}

	render(): void {
		const settings = this.deps.settings();
		if (!settings.enabled) {
			this.el.hide();
			return;
		}

		this.el.show();
		const active = this.deps.activeName();
		this.el.setText(active ?? "No workspace");
		this.el.setAttr(
			"aria-label",
			active ? `Workspace: ${active}` : "No workspace saved yet",
		);
	}

	private fire(event: MouseEvent, action: StatusBarAction): void {
		if (action === "none") return;
		event.preventDefault();

		if (action === "menu") {
			const menu = new Menu();
			this.deps.buildMenu(menu);
			menu.showAtMouseEvent(event);
			return;
		}

		this.deps.run(action);
	}
}
