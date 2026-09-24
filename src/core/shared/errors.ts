/**
 * Typed failure reasons.
 *
 * Every one of these is something the user can act on, so each maps to a
 * specific sentence rather than a generic "something went wrong".
 */
export type WorkspaceErrorKind =
	"core-conflict" | "not-found" | "name-taken" | "empty-name" | "no-active" | "unknown";

export class WorkspaceError extends Error {
	constructor(
		readonly kind: WorkspaceErrorKind,
		readonly detail?: string,
	) {
		super(kind);
		this.name = "WorkspaceError";
	}
}

const MESSAGES: Record<WorkspaceErrorKind, string> = {
	"core-conflict":
		"Turn off the core Workspaces plugin first: Settings, Core plugins, Workspaces. Both write the same file and would overwrite each other.",
	"not-found": "That workspace no longer exists.",
	"name-taken": "A workspace with that name already exists.",
	"empty-name": "Give the workspace a name.",
	"no-active": "No workspace is active yet. Save the current layout first.",
	unknown: "The workspace action failed.",
};

export function userMessage(err: unknown): string {
	if (err instanceof WorkspaceError) {
		return err.detail ? `${MESSAGES[err.kind]} (${err.detail})` : MESSAGES[err.kind];
	}
	if (err instanceof Error && err.message) return err.message;
	return MESSAGES.unknown;
}
