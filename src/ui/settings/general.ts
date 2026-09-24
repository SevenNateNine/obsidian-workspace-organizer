import { Setting } from "obsidian";
import { PREVIEW_NAME_COUNT, type SwitchPrompt } from "../../core/settings";
import { addOptions, type SectionContext } from "./SectionContext";

const SWITCH_PROMPT_LABELS: Readonly<Record<SwitchPrompt, string>> = {
	always: "Always",
	changed: "Only when the layout changed",
	never: "Never",
};

export function renderSwitchPrompt({ el, service, actions }: SectionContext): void {
	new Setting(el).setName("Switching").setHeading();

	new Setting(el)
		.setName("Ask before switching")
		.setDesc(
			"Offer to save the layout on screen before loading another workspace. Without the prompt, anything rearranged since the last save is dropped. The changed mode compares the layout on screen with the stored one, and still asks when it cannot read either of them.",
		)
		.addDropdown((dropdown) => {
			addOptions(dropdown, SWITCH_PROMPT_LABELS);
			dropdown
				.setValue(service.settings.promptOnSwitch)
				.onChange((value) =>
					actions.updateSettings({ promptOnSwitch: value as SwitchPrompt }),
				);
		});
}

export function renderListOptions({ el, service, actions }: SectionContext): void {
	new Setting(el)
		.setName("Show archived workspaces in the switcher")
		.setDesc("Archived workspaces always stay listed in the manager below.")
		.addToggle((toggle) =>
			toggle
				.setValue(service.settings.showArchived)
				.onChange((value) => actions.updateSettings({ showArchived: value })),
		);

	new Setting(el)
		.setName("File names in a preview")
		.setDesc("How many names the generated layout preview lists before it says +N.")
		.addSlider((slider) =>
			slider
				.setLimits(PREVIEW_NAME_COUNT.min, PREVIEW_NAME_COUNT.max, 1)
				.setValue(service.settings.previewNameCount)
				.setDynamicTooltip()
				.onChange((value) => actions.updateSettings({ previewNameCount: value })),
		);
}
