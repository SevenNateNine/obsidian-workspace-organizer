import { Setting } from "obsidian";
import type { SliceContext } from "../../../shared/context";
import type { StatusBarAction } from "../../../shared/domain/settings/vocabulary";

const ACTION_LABELS: Record<StatusBarAction, string> = {
	none: "Do nothing",
	menu: "Open menu",
	switcher: "Open switcher",
	save: "Save current layout",
	"save-as": "Save as new workspace",
	rename: "Rename active workspace",
	next: "Next workspace",
	prev: "Previous workspace",
};

export function statusBarSection(
	ctx: SliceContext,
	container: HTMLElement,
	redraw: () => void,
): void {
	const { statusBar } = ctx.settings();
	new Setting(container).setName("Status bar").setHeading();

	new Setting(container).setName("Show the active workspace").addToggle((toggle) =>
		toggle.setValue(statusBar.enabled).onChange(async (value) => {
			statusBar.enabled = value;
			await ctx.persist();
			redraw();
		}),
	);

	if (!statusBar.enabled) return;

	// `as const` keeps the literal key type, so the assignment below compiles
	// under noUncheckedIndexedAccess.
	const buttons = [
		["Click", "click"],
		["Middle click", "middleClick"],
		["Right click", "rightClick"],
	] as const;

	for (const [label, key] of buttons) {
		new Setting(container).setName(label).addDropdown((dropdown) => {
			for (const [action, text] of Object.entries(ACTION_LABELS)) {
				dropdown.addOption(action, text);
			}
			dropdown.setValue(statusBar[key]).onChange(async (value) => {
				statusBar[key] = value as StatusBarAction;
				await ctx.persist();
			});
		});
	}
}
