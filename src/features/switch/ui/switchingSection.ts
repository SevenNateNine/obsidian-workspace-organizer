import { Setting } from "obsidian";
import type { SliceContext } from "../../../shared/context";
import type { SwitchPrompt } from "../../../shared/domain/settings/vocabulary";

const SWITCH_PROMPT_LABELS: Record<SwitchPrompt, string> = {
	always: "Always",
	changed: "Only when the layout changed",
	never: "Never",
};

export function switchingSection(ctx: SliceContext, container: HTMLElement): void {
	const settings = ctx.settings();
	new Setting(container).setName("Switching").setHeading();

	new Setting(container)
		.setName("Ask before switching")
		.setDesc(
			"Offer to save the layout on screen before loading another workspace. Without the prompt, anything rearranged since the last save is dropped. The changed mode compares the layout on screen with the stored one, and still asks when it cannot read either of them.",
		)
		.addDropdown((dropdown) => {
			for (const [mode, label] of Object.entries(SWITCH_PROMPT_LABELS)) {
				dropdown.addOption(mode, label);
			}
			dropdown.setValue(settings.promptOnSwitch).onChange(async (value) => {
				settings.promptOnSwitch = value as SwitchPrompt;
				await ctx.persist();
			});
		});
}
