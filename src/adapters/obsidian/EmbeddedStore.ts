import type { EmbeddedMetaPort, MetaStore } from "../../core/ports";
import { normalizeMetaMap } from "../../core/domain/migrations";
import type { WorkspaceMeta } from "../../core/domain/meta";

/**
 * Keeps workspace metadata inside `workspaces.json`, next to each layout.
 *
 * The trade: metadata travels with the vault config, survives uninstalling this
 * plugin, and needs no second file to stay in sync. Against that, it depends on
 * core preserving a key it does not recognize, which is undocumented behaviour.
 * That is why the sidecar is the default and this is opt-in.
 */
export class EmbeddedStore implements MetaStore {
	constructor(private readonly core: EmbeddedMetaPort) {}

	async read(): Promise<Record<string, WorkspaceMeta>> {
		return normalizeMetaMap(this.core.readMeta());
	}

	async write(workspaces: Record<string, WorkspaceMeta>): Promise<void> {
		await this.core.writeMeta({ ...workspaces });
	}
}
