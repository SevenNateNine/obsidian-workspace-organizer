import type { StatusBarAction, StatusBarSettings } from "../../core/settings";

export type StatusBarHandlers = Readonly<
	Record<StatusBarAction, (event: MouseEvent) => void>
>;

export interface StatusBarSource {
	readonly settings: () => StatusBarSettings;
	readonly activeName: () => string | null;
}

export class StatusBar {
	constructor(
		private readonly el: HTMLElement,
		private readonly source: StatusBarSource,
	) {
		el.addClass("ew-statusbar", "mod-clickable");
	}

	listen(handlers: StatusBarHandlers): void {
		const fire = (event: MouseEvent, action: StatusBarAction): void => {
			if (action === "none") return;
			event.preventDefault();
			handlers[action](event);
		};

		this.el.addEventListener("click", (event) =>
			fire(event, this.source.settings().click),
		);
		this.el.addEventListener("auxclick", (event) => {
			// Button 1 is the middle button. The other buttons have their own events.
			if (event.button === 1) fire(event, this.source.settings().middleClick);
		});
		this.el.addEventListener("contextmenu", (event) =>
			fire(event, this.source.settings().rightClick),
		);
	}

	render(): void {
		if (!this.source.settings().enabled) {
			this.el.hide();
			return;
		}

		this.el.show();
		const active = this.source.activeName();
		this.el.setText(active ?? "No workspace");
		this.el.setAttr(
			"aria-label",
			active ? `Workspace: ${active}` : "No workspace saved yet",
		);
	}
}
