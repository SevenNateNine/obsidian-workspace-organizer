import { Menu, Notice, Plugin } from "obsidian";
import type { WorkspaceRegistry } from "./shared/domain/workspace/WorkspaceRegistry";
import type { MetaStore } from "./shared/domain/workspace/ports";
import { migrateData } from "./shared/domain/settings/migrations";
import type { PersistedData } from "./shared/domain/settings/PluginSettings";
import type { StatusBarAction, StorageMode } from "./shared/domain/settings/vocabulary";
import { createRuntime, type PluginRuntime } from "./shared/runtime";
import type { SliceContext } from "./shared/context";
import { registerGraph, type GraphService } from "./features/graph";
import { EmbeddedStore } from "./adapters/obsidian/EmbeddedStore";
import { SidecarStore } from "./adapters/obsidian/SidecarStore";
import { SwitcherModal } from "./ui/SwitcherModal";
import { WorkspaceEditModal } from "./ui/WorkspaceEditModal";
import { SettingsTab } from "./shared/ui/SettingsTab";
import { StatusBar } from "./ui/statusBar";
import { ConfirmModal, PromptModal, SaveOnSwitchModal } from "./shared/ui/prompts";
import {
	managerSection,
	statusBarSection,
	storageSection,
	switcherSection,
	switchingSection,
} from "./ui/settingsSections";

/**
 * Composition root and Obsidian adapter.
 *
 * Builds the runtime, then registers what is not yet carved into a slice. The
 * plumbing lives in `shared/runtime.ts` and every decision lives in a domain
 * folder, so what is left here is the feature work still waiting for a home.
 */
export default class WorkspaceOrganizerPlugin extends Plugin {
	private runtime!: PluginRuntime;
	private ctx!: SliceContext;

	private graph!: GraphService;
	private statusBar: StatusBar | null = null;

	/** Read by the settings sections and the switcher until both become slices. */
	get data(): PersistedData {
		return this.ctx.data();
	}

	get registry(): WorkspaceRegistry {
		return this.ctx.registry();
	}

	override async onload(): Promise<void> {
		this.runtime = createRuntime(this, migrateData(await this.loadData()));
		this.ctx = this.runtime.context;

		this.ctx.useStore(this.store());
		this.graph = registerGraph(this.ctx);
		this.registerRemainingSections();

		// Wait for the layout before touching it. `getLayout` on a half-built
		// workspace would capture panes that are not there yet.
		this.app.workspace.onLayoutReady(() => void this.ctx.reload());

		this.registerCommands();
		this.createStatusBar();
		this.addSettingTab(new SettingsTab(this.app, this, this.runtime));

		this.registerEvent(
			this.app.workspace.on("layout-change", () => this.ctx.repaint()),
		);
	}

	async reload(): Promise<void> {
		await this.ctx.reload();
	}

	/** Registered here until each block moves into its own slice. */
	private registerRemainingSections(): void {
		this.ctx.addSection({
			order: 10,
			render: (el) => switchingSection(this, el),
		});
		this.ctx.addSection({
			order: 30,
			render: (el) => switcherSection(this, el),
		});
		this.ctx.addSection({
			order: 40,
			render: (el, redraw) => statusBarSection(this, el, redraw),
		});
		this.ctx.addSection({
			order: 50,
			render: (el, redraw) => storageSection(this, el, redraw),
		});
		this.ctx.addSection({
			order: 60,
			render: (el, redraw) => managerSection(this, el, redraw),
		});
	}

	private store(mode: StorageMode = this.data.settings.storage): MetaStore {
		if (mode === "embedded") return new EmbeddedStore(this.ctx.embeddedMeta());

		return new SidecarStore({
			current: () => this.ctx.data(),
			replace: (data) => this.ctx.replaceData(data),
		});
	}

	private registerCommands(): void {
		this.addCommand({
			id: "open-switcher",
			name: "Open workspace switcher",
			callback: () => this.openSwitcher(),
		});

		this.addCommand({
			id: "save-workspace",
			name: "Save current layout to the active workspace",
			callback: () => void this.saveActive(),
		});

		this.addCommand({
			id: "save-workspace-as",
			name: "Save current layout as a new workspace…",
			callback: () => this.promptSaveAs(),
		});

		this.addCommand({
			id: "next-workspace",
			name: "Switch to next workspace",
			callback: () => this.stepBy(1),
		});

		this.addCommand({
			id: "previous-workspace",
			name: "Switch to previous workspace",
			callback: () => this.stepBy(-1),
		});
	}

	private createStatusBar(): void {
		this.statusBar = new StatusBar(this.addStatusBarItem(), {
			settings: () => this.data.settings.statusBar,
			activeName: () => this.registry.activeName(),
			run: (action) => this.run(action),
			buildMenu: (menu) => this.buildMenu(menu),
		});
		this.ctx.onRepaint(() => this.statusBar?.render());
		this.statusBar.render();
	}

	async persist(): Promise<void> {
		await this.ctx.persist();
	}

	/**
	 * Move metadata to the other storage location, then forget the old one.
	 *
	 * Done in that order so a failure part way through leaves the metadata
	 * readable in at least one place.
	 */
	async setStorage(mode: StorageMode): Promise<void> {
		if (mode === this.data.settings.storage) return;

		const from = this.store();
		const to = this.store(mode);
		await to.write(await from.read());
		await from.write({});

		this.data.settings.storage = mode;
		await this.persist();

		this.ctx.useStore(this.store());
		await this.reload();
	}

	// --- actions ---------------------------------------------------------

	run(action: StatusBarAction): void {
		const active = this.registry.activeName();

		switch (action) {
			case "switcher":
				return this.openSwitcher();
			case "save":
				return void this.saveActive();
			case "save-as":
				return this.promptSaveAs();
			case "rename":
				return active ? this.promptRename(active) : this.warnNoActive();
			case "next":
				return this.stepBy(1);
			case "prev":
				return this.stepBy(-1);
			case "menu":
			case "none":
				return;
		}
	}

	openSwitcher(): void {
		void this.attempt(async () => {
			await this.reload();
			new SwitcherModal(this.app, {
				registry: this.registry,
				settings: this.data.settings,
				onChoose: (name) => this.switchTo(name),
			}).open();
		});
	}

	/**
	 * Switch, asking first what to do with the layout on screen.
	 *
	 * The prompt exists because core overwrites a workspace only when told to,
	 * so any rearranging done since the last save is otherwise dropped in
	 * silence.
	 */
	switchTo(name: string): void {
		const current = this.registry.activeName();
		if (!current || current === name || !this.needsPrompt(current)) {
			return this.switchNow(name);
		}

		new SaveOnSwitchModal(this.app, {
			current,
			target: name,
			onChoose: (choice) => {
				if (choice === "save-as") return this.promptSaveAs(() => this.switchNow(name));

				void this.attempt(async () => {
					if (choice === "save") await this.saveWorkspace(current);
					await this.loadWorkspace(name);
				});
			},
		}).open();
	}

	/** In `changed` mode an unreadable layout counts as changed. See `layoutsDiffer`. */
	private needsPrompt(current: string): boolean {
		const mode = this.data.settings.promptOnSwitch;
		if (mode === "never") return false;
		if (mode === "always") return true;
		if (this.registry.hasUnsavedChanges(current)) return true;
		return (
			this.graph.isActive() &&
			this.graph.hasChanged(this.registry.metaOf(current)?.graph)
		);
	}

	private switchNow(name: string): void {
		void this.attempt(() => this.loadWorkspace(name));
	}

	/**
	 * Save the layout, and the graph settings that the layout cannot hold.
	 *
	 * The graph goes in through `setMeta` after the layout, because a workspace
	 * has to exist before it can carry metadata.
	 */
	private async saveWorkspace(name: string): Promise<void> {
		await this.registry.save(name);
		if (!this.graph.isActive()) return;

		const options = this.graph.current();
		if (options) await this.registry.setMeta(name, { graph: options });
	}

	/**
	 * Restore the graph before the layout, not after.
	 *
	 * `changeLayout` rebuilds every view, and a new graph view reads the graph
	 * plugin's settings as it loads. Applying them first means the layout
	 * arrives with the right graph and never shows the previous one.
	 */
	private async loadWorkspace(name: string): Promise<void> {
		// `canMutate` because the switch below refuses while the core Workspaces
		// plugin is on. Without the check, a refused switch would still leave the
		// graph changed.
		if (this.graph.isActive() && this.registry.canMutate()) {
			const saved = this.registry.metaOf(name)?.graph;
			if (saved) await this.graph.apply(saved);
		}
		await this.registry.switchTo(name);
	}

	private async saveActive(): Promise<void> {
		const active = this.registry.activeName();
		if (!active) return this.promptSaveAs();

		await this.attempt(async () => {
			await this.saveWorkspace(active);
			new Notice(`Saved "${active}".`);
		});
	}

	promptSaveAs(after?: () => void): void {
		new PromptModal(this.app, {
			title: "Save layout as",
			placeholder: "Workspace name",
			cta: "Save",
			onSubmit: (name) =>
				void this.attempt(async () => {
					await this.saveWorkspace(name);
					new Notice(`Saved "${name}".`);
					after?.();
				}),
		}).open();
	}

	promptRename(name: string, after?: () => void): void {
		new PromptModal(this.app, {
			title: `Rename "${name}"`,
			initial: name,
			cta: "Rename",
			onSubmit: (next) =>
				void this.attempt(async () => {
					await this.registry.rename(name, next);
					after?.();
				}),
		}).open();
	}

	promptDuplicate(name: string, after?: () => void): void {
		new PromptModal(this.app, {
			title: `Duplicate "${name}"`,
			initial: `${name} copy`,
			cta: "Duplicate",
			onSubmit: (next) =>
				void this.attempt(async () => {
					await this.registry.duplicate(name, next);
					after?.();
				}),
		}).open();
	}

	promptDelete(name: string, after?: () => void): void {
		new ConfirmModal(this.app, {
			title: `Delete "${name}"`,
			message: "The saved layout is removed. Open notes are not affected.",
			cta: "Delete",
			onConfirm: () =>
				void this.attempt(async () => {
					await this.registry.remove(name);
					after?.();
				}),
		}).open();
	}

	openEditor(name: string, after?: () => void): void {
		const meta = this.registry.metaOf(name);
		if (!meta) return;

		new WorkspaceEditModal(this.app, {
			name,
			meta,
			layout: this.registry.layoutOf(name),
			previewNameCount: this.data.settings.previewNameCount,
			onSave: (patch) =>
				void this.attempt(async () => {
					await this.registry.setMeta(name, patch);
					after?.();
				}),
		}).open();
	}

	private stepBy(delta: number): void {
		const next = this.registry.step(delta, {
			tags: [],
			includeArchived: this.data.settings.showArchived,
		});
		if (!next) {
			new Notice("No other workspace to switch to.");
			return;
		}
		this.switchTo(next);
	}

	private buildMenu(menu: Menu): void {
		const active = this.registry.activeName();

		menu.addItem((item) =>
			item
				.setTitle("Switch workspace…")
				.setIcon("layout-grid")
				.onClick(() => this.openSwitcher()),
		);
		menu.addItem((item) =>
			item
				.setTitle("Save current layout")
				.setIcon("save")
				.onClick(() => void this.saveActive()),
		);
		menu.addItem((item) =>
			item
				.setTitle("Save as new workspace…")
				.setIcon("copy-plus")
				.onClick(() => this.promptSaveAs()),
		);

		if (!active) return;

		menu.addSeparator();
		menu.addItem((item) =>
			item
				.setTitle("Edit tags and description…")
				.setIcon("tag")
				.onClick(() => this.openEditor(active)),
		);
		menu.addItem((item) =>
			item
				.setTitle("Rename…")
				.setIcon("pencil")
				.onClick(() => this.promptRename(active)),
		);
		menu.addItem((item) =>
			item
				.setTitle("Duplicate…")
				.setIcon("copy")
				.onClick(() => this.promptDuplicate(active)),
		);
	}

	private warnNoActive(): void {
		new Notice("No workspace is active yet. Save the current layout first.");
	}

	/** Kept while the actions still live here. The work is in the runtime. */
	async attempt(fn: () => Promise<void>): Promise<void> {
		await this.ctx.attempt(fn);
	}
}
