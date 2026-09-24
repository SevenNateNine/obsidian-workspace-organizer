import { Setting } from "obsidian";
import type { StorageMode } from "../../core/settings";
import { addOptions, type SectionContext } from "./SectionContext";

const STORAGE_LABELS: Readonly<Record<StorageMode, string>> = {
	sidecar: "Sidecar file (recommended)",
	embedded: "Inside workspaces.json (experimental)",
};

export function renderStorageSettings({
	el,
	service,
	actions,
	redraw,
}: SectionContext): void {
	new Setting(el).setName("Storage").setHeading();

	new Setting(el)
		.setName("Where tags and descriptions are kept")
		.setDesc(
			"Sidecar keeps workspaces.json exactly as vanilla Obsidian writes it, so turning the core Workspaces plugin back on stays safe. Embedded stores the metadata inside workspaces.json so it travels with the vault. Switching moves the existing metadata across.",
		)
		.addDropdown((dropdown) => {
			addOptions(dropdown, STORAGE_LABELS);
			dropdown
				.setValue(service.settings.storage)
				.onChange((value) =>
					actions.setStorage(value === "embedded" ? "embedded" : "sidecar", redraw),
				);
		});
}
