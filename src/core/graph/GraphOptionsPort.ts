export type GraphOptions = Readonly<Record<string, unknown>>;

/** The core graph plugin's settings, which Obsidian keeps outside the layout. */
export interface GraphOptionsPort {
	/** Null when the graph plugin is off or unreachable. */
	current(): GraphOptions | null;
	/** Applies `options` so that the next graph view reads them, and persists them. */
	apply(options: GraphOptions): Promise<void>;
}

/**
 * Obsidian fires no documented event when a plugin turns on or off, so callers
 * read this again at each decision.
 */
export type EnabledPluginIds = () => Promise<readonly string[]>;
