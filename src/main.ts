import { Plugin } from "obsidian";
import { WorkspaceService } from "./core/switching";
import { EmbeddedStore, SidecarStore, loadPluginData } from "./obsidian/storage";
import { DirectWorkspacesAdapter } from "./obsidian/workspaces";
import { WorkspaceActions, registerCommands, statusBarHandlers } from "./ui/commands";
import { SettingsTab } from "./ui/settings";
import { StatusBar } from "./ui/status-bar";

interface Context {
	readonly service: WorkspaceService;
	readonly actions: WorkspaceActions;
	readonly statusBar: StatusBar;
}

export default class WorkspaceOrganizerPlugin extends Plugin {
	override async onload(): Promise<void> {
		const { service, actions, statusBar } = await buildContext(this);

		registerCommands(this, actions);
		statusBar.listen(statusBarHandlers(actions));
		statusBar.render();
		this.addSettingTab(new SettingsTab(this.app, this, service, actions));
		this.registerEvent(
			this.app.workspace.on("layout-change", () => statusBar.render()),
		);

		// `getLayout` on a half-built workspace captures panes that are not there yet.
		this.app.workspace.onLayoutReady(() => void actions.run(() => actions.reload()));
	}
}

async function buildContext(plugin: Plugin): Promise<Context> {
	const { app } = plugin;
	const data = await loadPluginData(plugin);
	const file = new DirectWorkspacesAdapter(app);
	const sidecar = new SidecarStore(data);
	const embedded = new EmbeddedStore(file);

	const service = new WorkspaceService({
		workspaces: file,
		reloadWorkspaces: () => file.reload(),
		data,
		storeFor: (mode) => (mode === "embedded" ? embedded : sidecar),
	});

	const statusBar = new StatusBar(plugin.addStatusBarItem(), {
		settings: () => service.settings.statusBar,
		activeName: () => service.registry.activeName(),
	});
	const actions = new WorkspaceActions(app, service, () => statusBar.render());

	return { service, actions, statusBar };
}
