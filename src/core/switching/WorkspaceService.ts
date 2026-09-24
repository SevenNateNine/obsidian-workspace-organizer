import {
	graphOptionsDiffer,
	resolveGraphMode,
	type EnabledPluginIds,
	type GraphModeResolution,
	type GraphOptionsPort,
} from "../graph";
import type { EditableMeta } from "../organize";
import type { PluginSettings, StorageMode } from "../settings";
import type { DataOwner, MetaStore } from "../storage";
import { WorkspaceRegistry, type WorkspacesPort } from "../workspaces";

export interface WorkspaceEdit extends EditableMeta {
	readonly name: string;
}

export interface WorkspaceServiceDeps {
	readonly workspaces: WorkspacesPort;
	/** Reads `workspaces.json` and the core plugin state again. */
	readonly reloadWorkspaces: () => Promise<void>;
	readonly graph: GraphOptionsPort;
	readonly enabledPluginIds: EnabledPluginIds;
	readonly data: DataOwner;
	readonly storeFor: (mode: StorageMode) => MetaStore;
}

/**
 * The use cases behind every command. The graph mode is resolved again for each
 * one, because Obsidian fires no event when another plugin turns on or off.
 */
export class WorkspaceService {
	private currentRegistry: WorkspaceRegistry;

	constructor(private readonly deps: WorkspaceServiceDeps) {
		this.currentRegistry = this.registryFor(this.settings.storage);
	}

	get registry(): WorkspaceRegistry {
		return this.currentRegistry;
	}

	get settings(): PluginSettings {
		return this.deps.data.current().settings;
	}

	/** Call before showing a list. The file can change by sync or by hand. */
	async reload(): Promise<void> {
		await this.deps.reloadWorkspaces();
		await this.currentRegistry.refresh();
	}

	async graphMode(): Promise<GraphModeResolution> {
		return resolveGraphMode(
			this.settings.graphSettings,
			await this.deps.enabledPluginIds(),
		);
	}

	/** In `changed` mode, a layout that cannot be read counts as changed. */
	async needsPrompt(target: string): Promise<boolean> {
		const current = this.currentRegistry.activeName();
		if (!current || current === target) return false;

		switch (this.settings.promptOnSwitch) {
			case "never":
				return false;
			case "always":
				return true;
			case "changed":
				if (this.currentRegistry.hasUnsavedChanges(current)) return true;
				return (await this.graphMode()).active && this.graphChanged(current);
		}
	}

	/** No snapshot is no change, so turning graph mode on does not make every workspace ask. */
	private graphChanged(name: string): boolean {
		const saved = this.currentRegistry.metaOf(name)?.graph;
		if (!saved) return false;
		return graphOptionsDiffer(this.deps.graph.current(), saved);
	}

	/** The layout goes first, because a workspace must exist before it can carry metadata. */
	async save(name: string): Promise<void> {
		await this.currentRegistry.save(name);
		if (!(await this.graphMode()).active) return;

		const options = this.deps.graph.current();
		if (options) await this.currentRegistry.setMeta(name, { graph: options });
	}

	/**
	 * The graph goes first. `changeLayout` rebuilds every view, and a new graph view
	 * reads the graph settings as it loads, so it never shows the previous ones.
	 * `canMutate` is checked because the switch refuses while core Workspaces is on,
	 * and a refused switch must not leave the graph changed.
	 */
	async load(name: string): Promise<void> {
		if (this.currentRegistry.canMutate() && (await this.graphMode()).active) {
			const saved = this.currentRegistry.metaOf(name)?.graph;
			if (saved) await this.deps.graph.apply(saved);
		}
		await this.currentRegistry.switchTo(name);
	}

	/** The rename goes first. If the new name is taken, nothing changes. */
	async edit(
		name: string,
		{ name: nextName, tags, description }: WorkspaceEdit,
	): Promise<void> {
		const target = nextName.trim();
		if (target !== name) await this.currentRegistry.rename(name, target);
		await this.currentRegistry.setMeta(target, { tags, description });
	}

	/** Archived workspaces are skipped unless the switcher shows them. */
	step(delta: number): string | null {
		return this.currentRegistry.step(delta, {
			tags: [],
			includeArchived: this.settings.showArchived,
		});
	}

	async updateSettings(patch: Partial<PluginSettings>): Promise<void> {
		const data = this.deps.data.current();
		await this.deps.data.replace({ ...data, settings: { ...data.settings, ...patch } });
	}

	/** Writes the new store before it clears the old, so a failure leaves one readable copy. */
	async setStorage(mode: StorageMode): Promise<void> {
		if (mode === this.settings.storage) return;

		const from = this.deps.storeFor(this.settings.storage);
		const to = this.deps.storeFor(mode);
		await to.write(await from.read());
		await from.write({});

		await this.updateSettings({ storage: mode });
		this.currentRegistry = this.registryFor(mode);
		await this.reload();
	}

	private registryFor(mode: StorageMode): WorkspaceRegistry {
		return new WorkspaceRegistry(this.deps.workspaces, this.deps.storeFor(mode));
	}
}
