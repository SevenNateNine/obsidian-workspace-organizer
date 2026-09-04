import { Setting } from "obsidian";
import type { SliceContext } from "../../../shared/context";

export function switcherSection(ctx: SliceContext, container: HTMLElement): void {
	const settings = ctx.settings();

	new Setting(container)
		.setName("Show archived workspaces in the switcher")
		.setDesc("Archived workspaces always stay listed in the manager below.")
		.addToggle((toggle) =>
			toggle.setValue(settings.showArchived).onChange(async (value) => {
				settings.showArchived = value;
				await ctx.persist();
			}),
		);

	// Read by the manager and the edit modal too. It sits here because this is
	// where a user first meets the preview it controls.
	new Setting(container)
		.setName("File names in a preview")
		.setDesc("How many names the generated layout preview lists before it says +N.")
		.addSlider((slider) =>
			slider
				.setLimits(1, 8, 1)
				.setValue(settings.previewNameCount)
				.setDynamicTooltip()
				.onChange(async (value) => {
					settings.previewNameCount = value;
					await ctx.persist();
				}),
		);
}
