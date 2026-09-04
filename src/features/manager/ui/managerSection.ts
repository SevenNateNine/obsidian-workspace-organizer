import { Setting } from "obsidian";
import type { SliceContext } from "../../../shared/context";
import { workspaceRow } from "./workspaceRow";

export function managerSection(
	ctx: SliceContext,
	container: HTMLElement,
	redraw: () => void,
): void {
	const entries = ctx.registry().entries();
	new Setting(container).setName("Workspaces").setHeading();

	if (entries.length === 0) {
		container.createEl("p", {
			cls: "ew-empty",
			text: "No workspaces yet. Arrange your panes, then run “Save current layout as a new workspace”.",
		});
		return;
	}

	for (const [index, entry] of entries.entries()) {
		workspaceRow(ctx, container, redraw, { entry, index, total: entries.length });
	}
}
