/**
 * Read and write are separate permissions. While the core Workspaces plugin is on,
 * the list is readable but not writable: both plugins write the same file.
 */
export interface WorkspacesPort {
	isAvailable(): boolean;
	canMutate(): boolean;
	/** In file order. */
	list(): string[];
	activeName(): string | null;
	/** Opaque. Null when unknown. */
	layoutOf(name: string): unknown;
	liveLayout(): unknown;
	/** Saves the live layout under `name`, and creates or overwrites it. */
	save(name: string): Promise<void>;
	/** Saves `layout` under `name`, and leaves the live layout alone. */
	saveLayout(name: string, layout: unknown): Promise<void>;
	load(name: string): Promise<void>;
	delete(name: string): Promise<void>;
	setActive(name: string | null): Promise<void>;
}

/**
 * Metadata inside `workspaces.json`, for the embedded storage mode. Kept apart
 * from `WorkspacesPort` because only that one mode uses it.
 */
export interface EmbeddedMetaPort {
	readMeta(): Record<string, unknown>;
	writeMeta(raw: Record<string, unknown>): Promise<void>;
}
