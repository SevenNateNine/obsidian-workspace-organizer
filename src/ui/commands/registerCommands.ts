import type { Plugin } from "obsidian";
import type { WorkspaceActions } from "./WorkspaceActions";

// Users bind hotkeys to these ids. Changing one silently drops the binding.
export function registerCommands(plugin: Plugin, actions: WorkspaceActions): void {
	plugin.addCommand({
		id: "open-switcher",
		name: "Open workspace switcher",
		callback: () => actions.openSwitcher(),
	});
	plugin.addCommand({
		id: "save-workspace",
		name: "Save current layout to the active workspace",
		callback: () => void actions.saveActive(),
	});
	plugin.addCommand({
		id: "save-workspace-as",
		name: "Save current layout as a new workspace…",
		callback: () => actions.promptSaveAs(),
	});
	plugin.addCommand({
		id: "next-workspace",
		name: "Switch to next workspace",
		callback: () => actions.step(1),
	});
	plugin.addCommand({
		id: "previous-workspace",
		name: "Switch to previous workspace",
		callback: () => actions.step(-1),
	});
}
