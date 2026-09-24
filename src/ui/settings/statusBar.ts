import { Setting } from "obsidian";
import type { StatusBarAction, StatusBarButton } from "../../core/settings";
import { addOptions, type SectionContext } from "./SectionContext";

const ACTION_LABELS: Readonly<Record<StatusBarAction, string>> = {
	none: "Do nothing",
	menu: "Open menu",
	switcher: "Open switcher",
	save: "Save current layout",
	"save-as": "Save as new workspace",
	rename: "Rename active workspace",
	next: "Next workspace",
	prev: "Previous workspace",
};

const BUTTONS: ReadonlyArray<readonly [string, StatusBarButton]> = [
	["Click", "click"],
	["Middle click", "middleClick"],
	["Right click", "rightClick"],
];

export function renderStatusBarSettings({
	el,
	service,
	actions,
	redraw,
}: SectionContext): void {
	const current = () => service.settings.statusBar;
	new Setting(el).setName("Status bar").setHeading();

	new Setting(el)
		.setName("Show the active workspace")
		.addToggle((toggle) =>
			toggle
				.setValue(current().enabled)
				.onChange((enabled) =>
					actions.updateSettings({ statusBar: { ...current(), enabled } }, redraw),
				),
		);

	if (!current().enabled) return;

	for (const [label, button] of BUTTONS) {
		new Setting(el).setName(label).addDropdown((dropdown) => {
			addOptions(dropdown, ACTION_LABELS);
			dropdown.setValue(current()[button]).onChange((value) =>
				actions.updateSettings({
					statusBar: { ...current(), [button]: value as StatusBarAction },
				}),
			);
		});
	}
}
