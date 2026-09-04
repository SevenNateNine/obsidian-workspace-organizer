import { Setting } from "obsidian";
import type { SliceContext } from "../../../shared/context";
import { moveStorage } from "../storage";

export function storageSection(
	ctx: SliceContext,
	container: HTMLElement,
	redraw: () => void,
): void {
	new Setting(container).setName("Storage").setHeading();

	new Setting(container)
		.setName("Where tags and descriptions are kept")
		.setDesc(
			"Sidecar keeps workspaces.json exactly as vanilla Obsidian writes it, so turning the core Workspaces plugin back on stays safe. Embedded stores the metadata inside workspaces.json so it travels with the vault. Switching moves the existing metadata across.",
		)
		.addDropdown((dropdown) =>
			dropdown
				.addOption("sidecar", "Sidecar file (recommended)")
				.addOption("embedded", "Inside workspaces.json (experimental)")
				.setValue(ctx.settings().storage)
				.onChange(async (value) => {
					await moveStorage(ctx, value === "embedded" ? "embedded" : "sidecar");
					redraw();
				}),
		);
}
