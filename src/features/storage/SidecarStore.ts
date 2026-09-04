import type { MetaStore } from "../../shared/domain/workspace/ports";
import type { PersistedData } from "../../shared/domain/settings/PluginSettings";
import type { WorkspaceMeta } from "../../shared/domain/workspace/meta";

/**
 * Keeps workspace metadata in this plugin's own `data.json`.
 *
 * The default, because it leaves `workspaces.json` byte-for-byte what vanilla
 * Obsidian writes. Settings live in the same file, so both share one read and
 * one write.
 */
export class SidecarStore implements MetaStore {
	constructor(
		private readonly data: () => PersistedData,
		private readonly replaceData: (data: PersistedData) => Promise<void>,
	) {}

	async read(): Promise<Record<string, WorkspaceMeta>> {
		return this.data().workspaces;
	}

	async write(workspaces: Record<string, WorkspaceMeta>): Promise<void> {
		await this.replaceData({ ...this.data(), workspaces });
	}
}
