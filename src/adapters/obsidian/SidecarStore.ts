import type { MetaStore } from "../../core/ports";
import type { PersistedData } from "../../core/domain/PluginSettings";
import type { WorkspaceMeta } from "../../core/domain/meta";

/**
 * Keeps workspace metadata in this plugin's own `data.json`.
 *
 * The default, because it leaves `workspaces.json` byte-for-byte what vanilla
 * Obsidian writes. Settings live in the same file, so both share one read and
 * one write through the owner below.
 */
export interface DataOwner {
	current(): PersistedData;
	replace(data: PersistedData): Promise<void>;
}

export class SidecarStore implements MetaStore {
	constructor(private readonly owner: DataOwner) {}

	async read(): Promise<Record<string, WorkspaceMeta>> {
		return this.owner.current().workspaces;
	}

	async write(workspaces: Record<string, WorkspaceMeta>): Promise<void> {
		await this.owner.replace({ ...this.owner.current(), workspaces });
	}
}
