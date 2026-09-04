/**
 * The operations one slice starts on behalf of another.
 *
 * The status bar menu and the manager rows each dispatch into four or five
 * slices. Importing all of them would make a leaf screen depend on the whole
 * plugin, so the dispatch is late bound here instead.
 *
 * Every entry starts as a stub that throws. `assertActionsComplete` runs once
 * at load, so a slice that forgets to fill its entry fails while Obsidian is
 * still starting, not under the user's cursor a week later.
 */

export interface WorkspaceActions {
	openSwitcher(): void;
	saveActive(): void;
	promptSaveAs(after?: () => void): void;
	switchTo(name: string): void;
	stepBy(delta: number): void;
	promptRename(name: string, after?: () => void): void;
	promptDuplicate(name: string, after?: () => void): void;
	promptDelete(name: string, after?: () => void): void;
	openEditor(name: string, after?: () => void): void;
}

const ACTION_NAMES: (keyof WorkspaceActions)[] = [
	"openSwitcher",
	"saveActive",
	"promptSaveAs",
	"switchTo",
	"stepBy",
	"promptRename",
	"promptDuplicate",
	"promptDelete",
	"openEditor",
];

/** A marker the stubs carry, so a filled entry can be told from an empty one. */
const UNFILLED = Symbol("unfilled action");

type Stub = { (): never; [UNFILLED]?: true };

function stub(name: keyof WorkspaceActions): Stub {
	const fn: Stub = () => {
		throw new Error(`[workspace-organizer] no slice registered the ${name} action`);
	};
	fn[UNFILLED] = true;
	return fn;
}

export function createActions(): WorkspaceActions {
	const actions = {} as Record<keyof WorkspaceActions, Stub>;
	for (const name of ACTION_NAMES) actions[name] = stub(name);
	return actions as unknown as WorkspaceActions;
}

/**
 * Fail at load when a slice forgot to fill its entry.
 *
 * This is the whole reason a late bound hub is acceptable. Without it, a
 * missed registration is a click that does nothing.
 */
export function assertActionsComplete(actions: WorkspaceActions): void {
	const missing = ACTION_NAMES.filter((name) => (actions[name] as Stub)[UNFILLED]);
	if (missing.length > 0) {
		throw new Error(
			`[workspace-organizer] unregistered actions: ${missing.join(", ")}`,
		);
	}
}
