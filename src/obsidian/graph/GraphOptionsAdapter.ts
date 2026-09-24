import type { App } from "obsidian";
import type { GraphOptions, GraphOptionsPort } from "../../core/graph";
import { clone, isRecord } from "../../core/shared";

const GRAPH_PLUGIN_ID = "graph";

interface GraphPluginInstance {
	options?: Record<string, unknown>;
	saveOptions?: () => void;
}

interface InternalPluginsHost {
	internalPlugins?: {
		getEnabledPluginById?: (id: string) => GraphPluginInstance | null;
	};
}

/**
 * The only use of `app.internalPlugins` in this plugin. See the deviations table
 * in `AGENTS.md`.
 *
 * The global graph view has no view state. It reads `instance.options` when it
 * loads, and that object is the only place the current settings exist. Core
 * rereads `graph.json` only through a debounced watcher, which races
 * `changeLayout`. Every failure answers "no graph plugin", so an Obsidian release
 * can remove this feature and nothing else.
 */
export class GraphOptionsAdapter implements GraphOptionsPort {
	constructor(private readonly app: App) {}

	current(): GraphOptions | null {
		const options = this.instance()?.options;
		return isRecord(options) ? clone(options) : null;
	}

	/** Core mutates `options` while the user drags a slider, so both directions clone. */
	async apply(options: GraphOptions): Promise<void> {
		const instance = this.instance();
		if (!instance) return;

		instance.options = clone(options);
		instance.saveOptions?.();
	}

	private instance(): GraphPluginInstance | null {
		try {
			const host = this.app as unknown as InternalPluginsHost;
			return host.internalPlugins?.getEnabledPluginById?.(GRAPH_PLUGIN_ID) ?? null;
		} catch {
			return null;
		}
	}
}
