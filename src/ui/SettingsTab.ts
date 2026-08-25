import { App, PluginSettingTab, Setting } from "obsidian";
import type WorkspaceOrganizerPlugin from "../main";
import type { StatusBarAction, SwitchPrompt } from "../core/domain/types";
import type { GraphMode, GraphModeResolution } from "../core/domain/graphOwners";
import { describe } from "./describe";

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

const SWITCH_PROMPT_LABELS: Record<SwitchPrompt, string> = {
	always: "Always",
	changed: "Only when the layout changed",
	never: "Never",
};

const GRAPH_MODE_LABELS: Record<GraphMode, string> = {
	auto: "Automatic",
	always: "Always",
	never: "Never",
};

/**
 * Say out loud what the mode resolved to.
 *
 * Automatic changes behaviour based on something the user cannot see from this
 * screen, so showing only the dropdown would make the graph silently stop being
 * saved with no explanation anywhere.
 */
function graphStatus(mode: GraphMode, resolved: GraphModeResolution): string {
	if (mode === "always") {
		return "Always on. With another graph plugin also enabled, both write the graph on a switch and whichever runs last wins.";
	}
	if (mode === "never") {
		return "Off. Workspaces carry no graph settings.";
	}
	return resolved.blockedBy
		? `Automatic: off, because ${resolved.blockedBy} is enabled and saves the graph per pane, which is more precise than this plugin can be. Choose Always to override.`
		: "Automatic: on, because no plugin that owns the graph is enabled.";
}

export class SettingsTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: WorkspaceOrganizerPlugin,
	) {
		super(app, plugin);
	}

	override display(): void {
		this.containerEl.empty();

		if (!this.plugin.registry.canMutate()) {
			this.containerEl
				.createEl("p", { cls: "ew-warning" })
				.setText(
					"The core Workspaces plugin is turned on. Both it and this plugin write workspaces.json, so they would overwrite each other. Nothing can be saved until you turn it off under Settings, Core plugins, then reload Obsidian.",
				);
		}

		this.behaviourSection();
		this.statusBarSection();
		this.storageSection();
		this.managerSection();
	}

	private behaviourSection(): void {
		const { settings } = this.plugin.data;
		new Setting(this.containerEl).setName("Switching").setHeading();

		new Setting(this.containerEl)
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
					await this.plugin.persist();
				});
			});

		new Setting(this.containerEl)
			.setName("Save graph settings with each workspace")
			.setDesc(
				"Obsidian keeps one global set of graph settings, so a saved workspace cannot hold them by itself. When this is on, the search, filters, colour groups, and forces are stored with the workspace and applied when you switch back. Switching therefore changes the graph everywhere. Local graph views carry their own settings and are not affected. Automatic stands aside when a plugin that owns the graph itself is enabled.",
			)
			.addDropdown((dropdown) => {
				for (const [mode, label] of Object.entries(GRAPH_MODE_LABELS)) {
					dropdown.addOption(mode, label);
				}
				dropdown.setValue(settings.graphSettings).onChange(async (value) => {
					settings.graphSettings = value as GraphMode;
					await this.plugin.persist();
					await this.plugin.refreshGraphMode();
					this.display();
				});
			});

		// Painted twice: once from the cached answer so the line is never empty,
		// and again once the enabled plugin list has been read from disk.
		const status = this.containerEl.createEl("p", { cls: "ew-graph-status" });
		const paint = (): void => {
			status.setText(
				graphStatus(settings.graphSettings, this.plugin.graphResolution()),
			);
		};

		paint();
		void this.plugin.refreshGraphMode().then(paint);

		new Setting(this.containerEl)
			.setName("Show archived workspaces in the switcher")
			.setDesc("Archived workspaces always stay listed in the manager below.")
			.addToggle((toggle) =>
				toggle.setValue(settings.showArchived).onChange(async (value) => {
					settings.showArchived = value;
					await this.plugin.persist();
				}),
			);

		new Setting(this.containerEl)
			.setName("File names in a preview")
			.setDesc("How many names the generated layout preview lists before it says +N.")
			.addSlider((slider) =>
				slider
					.setLimits(1, 8, 1)
					.setValue(settings.previewNameCount)
					.setDynamicTooltip()
					.onChange(async (value) => {
						settings.previewNameCount = value;
						await this.plugin.persist();
					}),
			);
	}

	private statusBarSection(): void {
		const { statusBar } = this.plugin.data.settings;
		new Setting(this.containerEl).setName("Status bar").setHeading();

		new Setting(this.containerEl)
			.setName("Show the active workspace")
			.addToggle((toggle) =>
				toggle.setValue(statusBar.enabled).onChange(async (value) => {
					statusBar.enabled = value;
					await this.plugin.persist();
					this.display();
				}),
			);

		if (!statusBar.enabled) return;

		const buttons = [
			["Click", "click"],
			["Middle click", "middleClick"],
			["Right click", "rightClick"],
		] as const;

		for (const [label, key] of buttons) {
			new Setting(this.containerEl).setName(label).addDropdown((dropdown) => {
				for (const [action, text] of Object.entries(ACTION_LABELS)) {
					dropdown.addOption(action, text);
				}
				dropdown.setValue(statusBar[key]).onChange(async (value) => {
					statusBar[key] = value as StatusBarAction;
					await this.plugin.persist();
				});
			});
		}
	}

	private storageSection(): void {
		new Setting(this.containerEl).setName("Storage").setHeading();

		new Setting(this.containerEl)
			.setName("Where tags and descriptions are kept")
			.setDesc(
				"Sidecar keeps workspaces.json exactly as vanilla Obsidian writes it, so turning the core Workspaces plugin back on stays safe. Embedded stores the metadata inside workspaces.json so it travels with the vault. Switching moves the existing metadata across.",
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOption("sidecar", "Sidecar file (recommended)")
					.addOption("embedded", "Inside workspaces.json (experimental)")
					.setValue(this.plugin.data.settings.storage)
					.onChange(async (value) => {
						await this.plugin.setStorage(value === "embedded" ? "embedded" : "sidecar");
						this.display();
					}),
			);
	}

	private managerSection(): void {
		const entries = this.plugin.registry.entries();
		new Setting(this.containerEl).setName("Workspaces").setHeading();

		if (entries.length === 0) {
			this.containerEl.createEl("p", {
				cls: "ew-empty",
				text: "No workspaces yet. Arrange your panes, then run “Save current layout as a new workspace”.",
			});
			return;
		}

		const redraw = (): void => this.display();
		const { previewNameCount } = this.plugin.data.settings;

		for (const [index, entry] of entries.entries()) {
			const { name, meta, isActive } = entry;
			const { primary } = describe(
				this.plugin.registry.layoutOf(name),
				meta,
				previewNameCount,
			);
			const tags = meta.tags.map((tag) => `#${tag}`).join(" ");

			const setting = new Setting(this.containerEl)
				.setName(name + (isActive ? " (active)" : ""))
				.setDesc([tags, primary].filter(Boolean).join(" · "));

			setting.settingEl.toggleClass("ew-archived-row", meta.archived);

			setting
				.addExtraButton((button) =>
					button
						.setIcon("arrow-up")
						.setTooltip("Move up")
						.setDisabled(index === 0)
						.onClick(
							() =>
								void this.plugin.attempt(async () => {
									await this.plugin.registry.moveBy(name, -1);
									redraw();
								}),
						),
				)
				.addExtraButton((button) =>
					button
						.setIcon("arrow-down")
						.setTooltip("Move down")
						.setDisabled(index === entries.length - 1)
						.onClick(
							() =>
								void this.plugin.attempt(async () => {
									await this.plugin.registry.moveBy(name, 1);
									redraw();
								}),
						),
				)
				.addExtraButton((button) =>
					button
						.setIcon("tag")
						.setTooltip("Edit tags and description")
						.onClick(() => this.plugin.openEditor(name, redraw)),
				)
				.addExtraButton((button) =>
					button
						.setIcon("pencil")
						.setTooltip("Rename")
						.onClick(() => this.plugin.promptRename(name, redraw)),
				)
				.addExtraButton((button) =>
					button
						.setIcon("copy")
						.setTooltip("Duplicate")
						.onClick(() => this.plugin.promptDuplicate(name, redraw)),
				)
				.addExtraButton((button) =>
					button
						.setIcon(meta.archived ? "archive-restore" : "archive")
						.setTooltip(meta.archived ? "Unarchive" : "Archive")
						.onClick(
							() =>
								void this.plugin.attempt(async () => {
									await this.plugin.registry.setMeta(name, {
										archived: !meta.archived,
									});
									redraw();
								}),
						),
				)
				.addExtraButton((button) =>
					button
						.setIcon("trash")
						.setTooltip("Delete")
						.onClick(() => this.plugin.promptDelete(name, redraw)),
				);
		}
	}
}
