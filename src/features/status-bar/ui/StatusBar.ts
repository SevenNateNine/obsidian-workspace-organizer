import { Menu } from "obsidian";
import type { SliceContext } from "../../../shared/context";
import type { StatusBarAction } from "../../../shared/domain/settings/vocabulary";
import { buildMenu, run } from "../run";

/**
 * Shows the active workspace, and turns each mouse button into an action.
 *
 * Obsidian gives a status bar item no built-in behaviour, so the three buttons
 * are wired here and their meaning comes from settings.
 */
export class StatusBar {
	constructor(
		private readonly el: HTMLElement,
		private readonly ctx: SliceContext,
	) {
		el.addClass("ew-statusbar", "mod-clickable");

		el.addEventListener("click", (event) =>
			this.fire(event, this.ctx.settings().statusBar.click),
		);
		el.addEventListener("auxclick", (event) => {
			// Button 1 is the middle button. Anything else is already handled.
			if (event.button === 1)
				this.fire(event, this.ctx.settings().statusBar.middleClick);
		});
		el.addEventListener("contextmenu", (event) =>
			this.fire(event, this.ctx.settings().statusBar.rightClick),
		);
	}

	render(): void {
		if (!this.ctx.settings().statusBar.enabled) {
			this.el.hide();
			return;
		}

		this.el.show();
		const active = this.ctx.registry().activeName();
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
			buildMenu(this.ctx, menu);
			menu.showAtMouseEvent(event);
			return;
		}

		run(this.ctx, action);
	}
}
