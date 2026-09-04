import { App, PluginSettingTab, type Plugin } from "obsidian";
import type { PluginRuntime } from "../runtime";

/**
 * The settings screen, which owns no settings of its own.
 *
 * Each slice contributes a block through `SliceContext.addSection`, and this
 * paints them in order. A slice therefore never learns what sits above or
 * below it, and adding a feature never edits this file.
 *
 * The constructor takes the base `Plugin` type on purpose. Naming the concrete
 * plugin class here would make every settings screen depend on the composition
 * root, which is the import cycle this layout exists to avoid.
 */
export class SettingsTab extends PluginSettingTab {
	constructor(
		app: App,
		plugin: Plugin,
		private readonly runtime: PluginRuntime,
	) {
		super(app, plugin);
	}

	override display(): void {
		this.containerEl.empty();

		if (!this.runtime.context.registry().canMutate()) {
			this.containerEl
				.createEl("p", { cls: "ew-warning" })
				.setText(
					"The core Workspaces plugin is turned on. Both it and this plugin write workspaces.json, so they would overwrite each other. Nothing can be saved until you turn it off under Settings, Core plugins, then reload Obsidian.",
				);
		}

		const redraw = (): void => this.display();
		for (const section of this.runtime.sections()) {
			section.render(this.containerEl, redraw);
		}
	}
}
