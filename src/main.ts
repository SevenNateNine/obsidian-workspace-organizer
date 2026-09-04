import { Plugin } from "obsidian";
import { migrateData } from "./shared/domain/settings/migrations";
import { createRuntime } from "./shared/runtime";
import { assertActionsComplete } from "./shared/actions";
import { SettingsTab } from "./shared/ui/SettingsTab";
import { registerStorage } from "./features/storage";
import { registerGraph } from "./features/graph";
import { registerSave } from "./features/save";
import { registerSwitch } from "./features/switch";
import { registerSwitcher } from "./features/switcher";
import { registerMetadata } from "./features/metadata";
import { registerManager } from "./features/manager";
import { registerStatusBar } from "./features/status-bar";

/**
 * Composition root.
 *
 * Builds the runtime, registers every slice, then stands aside. Nothing here
 * decides anything. Each slice owns its commands, its screens, and its rules.
 *
 * Order matters twice. Storage goes first, because installing the metadata
 * store is what builds the registry. The status bar goes last, because it
 * dispatches into five other slices and they must have filled their actions in.
 */
export default class WorkspaceOrganizerPlugin extends Plugin {
	override async onload(): Promise<void> {
		const runtime = createRuntime(this, migrateData(await this.loadData()));
		const ctx = runtime.context;

		registerStorage(ctx);
		const graph = registerGraph(ctx);
		const save = registerSave(ctx, graph);
		registerSwitch(ctx, graph, save);
		registerSwitcher(ctx);
		registerMetadata(ctx);
		registerManager(ctx);
		registerStatusBar(ctx);
		assertActionsComplete(ctx.actions);

		this.addSettingTab(new SettingsTab(this.app, this, runtime));

		// Wait for the layout before touching it. `getLayout` on a half-built
		// workspace would capture panes that are not there yet.
		this.app.workspace.onLayoutReady(() => void ctx.reload());
		this.registerEvent(this.app.workspace.on("layout-change", () => ctx.repaint()));
	}
}
