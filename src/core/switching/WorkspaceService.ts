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
	readonly data: DataOwner;
	readonly storeFor: (mode: StorageMode) => MetaStore;
}

/** The use cases behind every command. */
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
				return this.currentRegistry.hasUnsavedChanges(current);
		}
	}

	async save(name: string): Promise<void> {
		await this.currentRegistry.save(name);
	}

	async load(name: string): Promise<void> {
		await this.currentRegistry.switchTo(name);
	}

	/** The rename goes first. If the new name is taken, nothing changes. */
	async edit(name: string, { name: nextName, ...meta }: WorkspaceEdit): Promise<void> {
		const target = nextName.trim();
		if (target !== name) await this.currentRegistry.rename(name, target);
		await this.currentRegistry.setMeta(target, meta);
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
