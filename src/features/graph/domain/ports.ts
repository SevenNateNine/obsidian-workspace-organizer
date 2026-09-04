/**
 * The core graph plugin's settings, which Obsidian keeps outside the layout.
 *
 * The global graph view has no view state, so a saved layout carries nothing
 * about the graph. Reaching the settings needs the one undocumented access in
 * this plugin, which is why it sits behind its own port.
 */
export interface GraphOptionsPort {
	/** The settings in use now. Null when the graph plugin is off or unreachable. */
	current(): Record<string, unknown> | null;
	/** Apply `options` so the next graph view reads them, and persist them. */
	apply(options: Record<string, unknown>): Promise<void>;
}
