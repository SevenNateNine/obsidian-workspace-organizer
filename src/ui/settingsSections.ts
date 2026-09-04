import { Setting } from "obsidian";
import type WorkspaceOrganizerPlugin from "../main";
import type {
	StatusBarAction,
	SwitchPrompt,
} from "../shared/domain/settings/vocabulary";
import { describeWorkspace } from "../shared/ui/describe";

/**
 * The settings blocks that do not have a slice yet.
 *
 * Each function here moves into its feature folder as that slice is carved.
 * They still take the plugin, which is why this file stays outside `shared/`:
 * nothing in `shared/` may name the composition root.
 */

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

export function switchingSection(
	plugin: WorkspaceOrganizerPlugin,
	container: HTMLElement,
): void {
	const { settings } = plugin.data;
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
				await plugin.persist();
			});
		});
}

export function switcherSection(
	plugin: WorkspaceOrganizerPlugin,
	container: HTMLElement,
): void {
	const { settings } = plugin.data;

	new Setting(container)
		.setName("Show archived workspaces in the switcher")
		.setDesc("Archived workspaces always stay listed in the manager below.")
		.addToggle((toggle) =>
			toggle.setValue(settings.showArchived).onChange(async (value) => {
				settings.showArchived = value;
				await plugin.persist();
			}),
		);

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
					await plugin.persist();
				}),
		);
}

export function statusBarSection(
	plugin: WorkspaceOrganizerPlugin,
	container: HTMLElement,
	redraw: () => void,
): void {
	const { statusBar } = plugin.data.settings;
	new Setting(container).setName("Status bar").setHeading();

	new Setting(container).setName("Show the active workspace").addToggle((toggle) =>
		toggle.setValue(statusBar.enabled).onChange(async (value) => {
			statusBar.enabled = value;
			await plugin.persist();
			redraw();
		}),
	);

	if (!statusBar.enabled) return;

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
				await plugin.persist();
			});
		});
	}
}

export function managerSection(
	plugin: WorkspaceOrganizerPlugin,
	container: HTMLElement,
	redraw: () => void,
): void {
	const entries = plugin.registry.entries();
	new Setting(container).setName("Workspaces").setHeading();

	if (entries.length === 0) {
		container.createEl("p", {
			cls: "ew-empty",
			text: "No workspaces yet. Arrange your panes, then run “Save current layout as a new workspace”.",
		});
		return;
	}

	const { previewNameCount } = plugin.data.settings;

	for (const [index, entry] of entries.entries()) {
		workspaceRow(plugin, container, redraw, {
			entry,
			index,
			total: entries.length,
			previewNameCount,
		});
	}
}

interface RowPosition {
	entry: ReturnType<WorkspaceOrganizerPlugin["registry"]["entries"]>[number];
	index: number;
	total: number;
	previewNameCount: number;
}

function workspaceRow(
	plugin: WorkspaceOrganizerPlugin,
	container: HTMLElement,
	redraw: () => void,
	{ entry, index, total, previewNameCount }: RowPosition,
): void {
	const { name, meta, isActive } = entry;
	const { primary } = describeWorkspace(
		plugin.registry.layoutOf(name),
		meta,
		previewNameCount,
	);
	const tags = meta.tags.map((tag) => `#${tag}`).join(" ");

	const setting = new Setting(container)
		.setName(name + (isActive ? " (active)" : ""))
		.setDesc([tags, primary].filter(Boolean).join(" · "));

	setting.settingEl.toggleClass("ew-archived-row", meta.archived);

	orderButtons(plugin, setting, redraw, { entry, index, total, previewNameCount });
	editButtons(plugin, setting, redraw, entry);
}

/** Move a workspace up or down the manager list. */
function orderButtons(
	plugin: WorkspaceOrganizerPlugin,
	setting: Setting,
	redraw: () => void,
	{ entry, index, total }: RowPosition,
): void {
	const { name } = entry;

	setting
		.addExtraButton((button) =>
			button
				.setIcon("arrow-up")
				.setTooltip("Move up")
				.setDisabled(index === 0)
				.onClick(
					() =>
						void plugin.attempt(async () => {
							await plugin.registry.moveBy(name, -1);
							redraw();
						}),
				),
		)
		.addExtraButton((button) =>
			button
				.setIcon("arrow-down")
				.setTooltip("Move down")
				.setDisabled(index === total - 1)
				.onClick(
					() =>
						void plugin.attempt(async () => {
							await plugin.registry.moveBy(name, 1);
							redraw();
						}),
				),
		);
}

/** Change or remove a workspace. */
function editButtons(
	plugin: WorkspaceOrganizerPlugin,
	setting: Setting,
	redraw: () => void,
	entry: RowPosition["entry"],
): void {
	const { name, meta } = entry;

	setting
		.addExtraButton((button) =>
			button
				.setIcon("tag")
				.setTooltip("Edit tags and description")
				.onClick(() => plugin.openEditor(name, redraw)),
		)
		.addExtraButton((button) =>
			button
				.setIcon("pencil")
				.setTooltip("Rename")
				.onClick(() => plugin.promptRename(name, redraw)),
		)
		.addExtraButton((button) =>
			button
				.setIcon("copy")
				.setTooltip("Duplicate")
				.onClick(() => plugin.promptDuplicate(name, redraw)),
		)
		.addExtraButton((button) =>
			button
				.setIcon(meta.archived ? "archive-restore" : "archive")
				.setTooltip(meta.archived ? "Unarchive" : "Archive")
				.onClick(
					() =>
						void plugin.attempt(async () => {
							await plugin.registry.setMeta(name, { archived: !meta.archived });
							redraw();
						}),
				),
		)
		.addExtraButton((button) =>
			button
				.setIcon("trash")
				.setTooltip("Delete")
				.onClick(() => plugin.promptDelete(name, redraw)),
		);
}
