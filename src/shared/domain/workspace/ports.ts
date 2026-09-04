import type { WorkspaceMeta } from "./meta";

/**
 * The workspace engine: whatever reads and writes `workspaces.json` and applies
 * a stored layout to the screen.
 *
 * Reading and writing are separate permissions. The engine can be readable but
 * not writable, which is what happens when the core Workspaces plugin is turned
 * on: both would write the same file and overwrite each other.
 */
export interface WorkspacesPort {
	/** False when the list cannot be read at all. */
	isAvailable(): boolean;
	/** False when writing would risk losing a workspace. */
	canMutate(): boolean;
	/** Workspace names, in file order. */
	list(): string[];
	activeName(): string | null;
	/** The opaque stored layout, for `summarizeLayout`. Null when unknown. */
	layoutOf(name: string): unknown;
	/** The opaque layout on screen now, for `layoutsDiffer`. */
	liveLayout(): unknown;
	/** Save the live layout under `name`, creating or overwriting it. */
	save(name: string): Promise<void>;
	/** Save `layout` under `name` without touching the live layout. */
	saveLayout(name: string, layout: unknown): Promise<void>;
	load(name: string): Promise<void>;
	delete(name: string): Promise<void>;
	/** Record which workspace is current. Null when none is. */
	setActive(name: string | null): Promise<void>;
}

/** Where the tags, archive flags, and descriptions live. */
export interface MetaStore {
	read(): Promise<Record<string, WorkspaceMeta>>;
	write(workspaces: Record<string, WorkspaceMeta>): Promise<void>;
}

/**
 * Metadata carried inside the workspaces file, for the embedded storage mode.
 *
 * Separate from `WorkspacesPort` so the ordinary path does not grow two
 * methods that only one storage mode uses. The same adapter implements both.
 */
export interface EmbeddedMetaPort {
	readMeta(): Record<string, unknown>;
	writeMeta(raw: Record<string, unknown>): Promise<void>;
}
