import { App, Plugin, PluginSettingTab } from "obsidian";
import type { WorkspaceService } from "../../core/switching";
import type { WorkspaceActions } from "../commands";
import { renderListOptions, renderSwitchPrompt } from "./general";
import { renderGraphSettings, type GraphStatusMemo } from "./graph";
import { renderManager } from "./manager";
import type { SectionContext } from "./SectionContext";
import { renderStatusBarSettings } from "./statusBar";
import { renderStorageSettings } from "./storage";

const CORE_CONFLICT_WARNING =
	"The core Workspaces plugin is turned on. Both it and this plugin write workspaces.json, so they would overwrite each other. Nothing can be saved until you turn it off under Settings, Core plugins, then reload Obsidian.";

export class SettingsTab extends PluginSettingTab {
	private readonly graphMemo: GraphStatusMemo = { last: null };

	constructor(
		app: App,
		plugin: Plugin,
		private readonly service: WorkspaceService,
		private readonly actions: WorkspaceActions,
	) {
		super(app, plugin);
	}

	override display(): void {
		const el = this.containerEl;
		el.empty();

		if (!this.service.registry.canMutate()) {
			el.createEl("p", { cls: "ew-warning" }).setText(CORE_CONFLICT_WARNING);
		}

		const ctx: SectionContext = {
			el,
			service: this.service,
			actions: this.actions,
			redraw: () => this.display(),
		};
		renderSwitchPrompt(ctx);
		renderGraphSettings(ctx, this.graphMemo);
		renderListOptions(ctx);
		renderStatusBarSettings(ctx);
		renderStorageSettings(ctx);
		renderManager(ctx);
	}
}
