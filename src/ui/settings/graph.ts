import { Setting } from "obsidian";
import type { GraphModeResolution } from "../../core/graph";
import type { GraphMode } from "../../core/settings";
import { addOptions, type SectionContext } from "./SectionContext";

const GRAPH_MODE_LABELS: Readonly<Record<GraphMode, string>> = {
	auto: "Automatic",
	always: "Always",
	never: "Never",
};

/** The last answer, so a redraw does not show an empty line while the plugin list loads. */
export interface GraphStatusMemo {
	last: GraphModeResolution | null;
}

export function renderGraphSettings(ctx: SectionContext, memo: GraphStatusMemo): void {
	const { el, service, actions, redraw } = ctx;

	new Setting(el)
		.setName("Save graph settings with each workspace")
		.setDesc(
			"Obsidian keeps one global set of graph settings, so a saved workspace cannot hold them by itself. When this is on, the search, filters, colour groups, and forces are stored with the workspace and applied when you switch back. Switching therefore changes the graph everywhere. Local graph views carry their own settings and are not affected. Automatic stands aside when a plugin that owns the graph itself is enabled.",
		)
		.addDropdown((dropdown) => {
			addOptions(dropdown, GRAPH_MODE_LABELS);
			dropdown
				.setValue(service.settings.graphSettings)
				.onChange((value) =>
					actions.updateSettings({ graphSettings: value as GraphMode }, redraw),
				);
		});

	// Automatic depends on other plugins, which this screen does not show. Without
	// this line the graph stops being saved with no explanation.
	const status = el.createEl("p", { cls: "ew-graph-status" });
	const paint = (resolution: GraphModeResolution | null): void => {
		status.setText(graphStatus(service.settings.graphSettings, resolution));
	};

	paint(memo.last);
	void service.graphMode().then((resolution) => {
		memo.last = resolution;
		paint(resolution);
	});
}

function graphStatus(mode: GraphMode, resolved: GraphModeResolution | null): string {
	switch (mode) {
		case "always":
			return "Always on. With another graph plugin also enabled, both write the graph on a switch and whichever runs last wins.";
		case "never":
			return "Off. Workspaces carry no graph settings.";
		case "auto":
			if (!resolved) return "";
			return resolved.blockedBy
				? `Automatic: off, because ${resolved.blockedBy} is enabled and saves the graph per pane, which is more precise than this plugin can be. Choose Always to override.`
				: "Automatic: on, because no plugin that owns the graph is enabled.";
	}
}
