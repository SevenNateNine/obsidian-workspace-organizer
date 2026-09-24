import type { MetaByName } from "../../core/organize";
import { normalizeMetaMap, type MetaStore } from "../../core/storage";
import type { EmbeddedMetaPort } from "../../core/workspaces";

/**
 * Opt-in. The metadata travels with the vault config, but it depends on core
 * keeping a key that core does not know, which is undocumented behavior.
 */
export class EmbeddedStore implements MetaStore {
	constructor(private readonly file: EmbeddedMetaPort) {}

	async read(): Promise<MetaByName> {
		return normalizeMetaMap(this.file.readMeta());
	}

	async write(workspaces: MetaByName): Promise<void> {
		await this.file.writeMeta({ ...workspaces });
	}
}
