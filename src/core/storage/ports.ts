import type { MetaByName } from "../organize";
import type { PersistedData } from "./PersistedData";

/** Two implementations: the sidecar `data.json` and the embedded `workspaces.json` key. */
export interface MetaStore {
	read(): Promise<MetaByName>;
	write(workspaces: MetaByName): Promise<void>;
}

/** The plugin's `data.json`. Settings and sidecar metadata share one read and one write. */
export interface DataOwner {
	current(): PersistedData;
	replace(data: PersistedData): Promise<void>;
}
