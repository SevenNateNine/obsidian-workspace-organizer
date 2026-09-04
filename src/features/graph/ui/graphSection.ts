import { Setting } from "obsidian";
import type { SliceContext } from "../../../shared/context";
import type { GraphMode } from "../../../shared/domain/settings/vocabulary";
import type { GraphModeResolution } from "../domain/graphOwners";
import type { GraphService } from "../graphService";

const GRAPH_MODE_LABELS: Record<GraphMode, string> = {
	auto: "Automatic",
	always: "Always",
	never: "Never",
};

/**
 * Say out loud what the mode resolved to.
 *
 * Automatic changes behaviour based on something the user cannot see from this
 * screen, so showing only the dropdown would make the graph silently stop being
 * saved with no explanation anywhere.
 */
function graphStatus(mode: GraphMode, resolved: GraphModeResolution): string {
	if (mode === "always") {
		return "Always on. With another graph plugin also enabled, both write the graph on a switch and whichever runs last wins.";
	}
	if (mode === "never") {
		return "Off. Workspaces carry no graph settings.";
	}
	return resolved.blockedBy
		? `Automatic: off, because ${resolved.blockedBy} is enabled and saves the graph per pane, which is more precise than this plugin can be. Choose Always to override.`
		: "Automatic: on, because no plugin that owns the graph is enabled.";
}

export function graphSection(
	ctx: SliceContext,
	graph: GraphService,
	container: HTMLElement,
	redraw: () => void,
): void {
	const settings = ctx.settings();

	new Setting(container)
		.setName("Save graph settings with each workspace")
		.setDesc(
			"Obsidian keeps one global set of graph settings, so a saved workspace cannot hold them by itself. When this is on, the search, filters, colour groups, and forces are stored with the workspace and applied when you switch back. Switching therefore changes the graph everywhere. Local graph views carry their own settings and are not affected. Automatic stands aside when a plugin that owns the graph itself is enabled.",
		)
		.addDropdown((dropdown) => {
			for (const [mode, label] of Object.entries(GRAPH_MODE_LABELS)) {
				dropdown.addOption(mode, label);
			}
			dropdown.setValue(settings.graphSettings).onChange(async (value) => {
				settings.graphSettings = value as GraphMode;
				await ctx.persist();
				await graph.refresh();
				redraw();
			});
		});

	// Painted twice: once from the cached answer so the line is never empty,
	// and again once the enabled plugin list has been read from disk.
	const status = container.createEl("p", { cls: "ew-graph-status" });
	const paint = (): void => {
		status.setText(graphStatus(settings.graphSettings, graph.resolution()));
	};

	paint();
	void graph.refresh().then(paint);
}
