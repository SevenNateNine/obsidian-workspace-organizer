/**
 * The format of `.obsidian/workspaces.json`.
 *
 * This plugin is the only writer of that file, so every rule about its shape
 * lives here, with no Obsidian import, and is covered by tests against a real
 * file captured from a vault.
 *
 * The format is undocumented. It was established by reading a file that core
 * wrote:
 *
 *   { "workspaces": { "<name>": { main, left, right, left-ribbon, active, mtime } },
 *     "active": "<name>" }
 *
 * `JSON.stringify(file, null, 2)` with no trailing newline reproduces a
 * core-written file byte for byte. Keep it that way: a vault synced between
 * devices should see no spurious diff because this plugin wrote the file.
 */

import { isRecord } from "../../shared/domain/util";

export interface WorkspacesFile {
	/** Layouts by workspace name. Opaque to us apart from the keys below. */
	workspaces: Record<string, unknown>;
	/** Name of the workspace last loaded, or null when none has been. */
	active: string | null;
}

/** A live layout carries this; a stored workspace does not. */
export const LIVE_ONLY_KEY = "lastOpenFiles";

export const EMPTY_FILE: WorkspacesFile = { workspaces: {}, active: null };

/**
 * Read a file that may be absent, truncated, or hand-edited.
 *
 * Anything unrecognized becomes an empty file rather than an exception. Losing
 * the metadata for one bad entry is recoverable; failing to load is not.
 */
export function parseWorkspacesFile(raw: string): WorkspacesFile {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return { ...EMPTY_FILE };
	}

	if (!isRecord(parsed)) return { ...EMPTY_FILE };

	const workspaces: Record<string, unknown> = {};
	if (isRecord(parsed.workspaces)) {
		for (const [name, layout] of Object.entries(parsed.workspaces)) {
			// A name with no layout would list in the switcher and load nothing.
			if (name && isRecord(layout)) workspaces[name] = layout;
		}
	}

	const active = typeof parsed.active === "string" ? parsed.active : null;

	return {
		workspaces,
		// An active name that no longer resolves would show a phantom selection.
		active: active && active in workspaces ? active : null,
	};
}

/**
 * Serialize exactly the way core does: two-space indent, no trailing newline.
 *
 * Known cosmetic limit: a workspace named like an integer ("2024") sorts first
 * in a JavaScript object, so key order can differ from core's. JSON object
 * order carries no meaning, so this affects a diff and nothing else.
 */
export function serializeWorkspacesFile(file: WorkspacesFile): string {
	return JSON.stringify({ workspaces: file.workspaces, active: file.active }, null, 2);
}

/**
 * Turn the live layout into a stored workspace entry.
 *
 * Two differences from `app.workspace.getLayout()`, both matching what core
 * writes: `lastOpenFiles` is dropped, because recent files belong to the vault
 * rather than to any one workspace, and `mtime` is added.
 */
export function entryFromLayout(
	layout: Record<string, unknown>,
	now: Date,
): Record<string, unknown> {
	const { [LIVE_ONLY_KEY]: _dropped, ...rest } = layout;
	return { ...rest, mtime: formatMtime(now) };
}

/**
 * The timestamp format core writes, for example "2026-08-20T14:45:13-04:00".
 *
 * ISO 8601 in local time with an offset, to the second. `toISOString` gives UTC
 * with milliseconds and a "Z", which is a different string.
 */
export function formatMtime(now: Date): string {
	const offset = -now.getTimezoneOffset();
	const sign = offset < 0 ? "-" : "+";
	const abs = Math.abs(offset);

	return (
		`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
		`T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}` +
		`${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
	);
}

function pad(value: number): string {
	return String(value).padStart(2, "0");
}
