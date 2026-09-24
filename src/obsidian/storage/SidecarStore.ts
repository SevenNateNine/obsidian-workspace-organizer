import type { MetaByName } from "../../core/organize";
import type { DataOwner, MetaStore } from "../../core/storage";

/** The default. It leaves `workspaces.json` byte-for-byte what vanilla Obsidian writes. */
export class SidecarStore implements MetaStore {
	constructor(private readonly owner: DataOwner) {}

	async read(): Promise<MetaByName> {
		return this.owner.current().workspaces;
	}

	async write(workspaces: MetaByName): Promise<void> {
		await this.owner.replace({ ...this.owner.current(), workspaces });
	}
}
