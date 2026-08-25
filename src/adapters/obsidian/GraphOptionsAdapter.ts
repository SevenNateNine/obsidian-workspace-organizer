import type { App } from "obsidian";
import type { GraphOptionsPort } from "../../core/ports";

const GRAPH_PLUGIN_ID = "graph";

/** The part of the core graph plugin this adapter uses. */
interface GraphPluginInstance {
	options?: Record<string, unknown>;
	saveOptions?: () => void;
}

/** The undocumented shape, declared narrowly instead of cast to `any`. */
interface InternalPluginsHost {
	internalPlugins?: {
		getEnabledPluginById?: (id: string) => GraphPluginInstance | null;
	};
}

/**
 * Reads and writes the core graph plugin's settings.
 *
 * The global graph view has no `getState`, so a saved layout carries nothing
 * about the graph. The view reads `instance.options` in its own `onload`, and
 * that object is the only place the current settings exist. `graph.json` is
 * written from it, and core rereads that file only through a debounced watcher,
 * which races the layout change.
 *
 * This is the one place in the plugin that uses `app.internalPlugins`. It is
 * recorded in the deviations table in `AGENTS.md`. Every path answers "no graph
 * plugin" rather than throwing, so a future Obsidian release can lose this
 * feature and nothing else.
 */
export class GraphOptionsAdapter implements GraphOptionsPort {
	constructor(private readonly app: App) {}

	current(): Record<string, unknown> | null {
		const options = this.instance()?.options;
		return isRecord(options) ? clone(options) : null;
	}

	/**
	 * The clone is load bearing in both directions. Core mutates this object as
	 * the user drags a slider, which would otherwise edit the stored snapshot.
	 */
	async apply(options: Record<string, unknown>): Promise<void> {
		const instance = this.instance();
		if (!instance) return;

		instance.options = clone(options);
		instance.saveOptions?.();
	}

	/** Null when the core graph plugin is off, or when the hook is gone. */
	private instance(): GraphPluginInstance | null {
		try {
			const host = this.app as unknown as InternalPluginsHost;
			return host.internalPlugins?.getEnabledPluginById?.(GRAPH_PLUGIN_ID) ?? null;
		} catch {
			return null;
		}
	}
}

function clone(value: Record<string, unknown>): Record<string, unknown> {
	return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
