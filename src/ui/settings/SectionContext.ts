import type { WorkspaceService } from "../../core/switching";
import type { WorkspaceActions } from "../commands";

export interface SectionContext {
	readonly el: HTMLElement;
	readonly service: WorkspaceService;
	readonly actions: WorkspaceActions;
	readonly redraw: () => void;
}

export function addOptions(
	dropdown: { addOption(value: string, display: string): unknown },
	labels: Readonly<Record<string, string>>,
): void {
	for (const [value, label] of Object.entries(labels)) dropdown.addOption(value, label);
}
