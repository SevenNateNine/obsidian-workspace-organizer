import type { MetaByName } from "../organize";
import type { PluginSettings } from "../settings";

/** Increase when a stored shape changes in a way that `migrateData` must handle. */
export const CURRENT_SCHEMA_VERSION = 1;

export interface PersistedData {
	readonly schemaVersion: number;
	readonly settings: PluginSettings;
	/** Keyed by core's workspace name. Empty when `storage` is `embedded`. */
	readonly workspaces: MetaByName;
}
