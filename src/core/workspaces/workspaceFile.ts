import { LIVE_ONLY_KEY } from "../layout";
import { isRecord, type JsonObject } from "../shared";

// The format of `.obsidian/workspaces.json` is undocumented. It comes from a file
// that core wrote, kept in `test/fixtures/workspaces.sample.json`:
//
//   { "workspaces": { "<name>": { main, left, right, left-ribbon, active, mtime } },
//     "active": "<name>" }
//
// Our output must equal a core-written file byte for byte. Otherwise every synced
// vault gets a spurious diff.

export interface WorkspacesFile {
	workspaces: Record<string, unknown>;
	active: string | null;
}

export function emptyWorkspacesFile(): WorkspacesFile {
	return { workspaces: {}, active: null };
}

/** Anything unrecognized becomes empty. A lost entry is recoverable. A failed load is not. */
export function parseWorkspacesFile(raw: string): WorkspacesFile {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return emptyWorkspacesFile();
	}
	if (!isRecord(parsed)) return emptyWorkspacesFile();

	const workspaces: JsonObject = {};
	if (isRecord(parsed.workspaces)) {
		for (const [name, layout] of Object.entries(parsed.workspaces)) {
			// A name with no layout would list in the switcher and load nothing.
			if (name && isRecord(layout)) workspaces[name] = layout;
		}
	}

	const active = typeof parsed.active === "string" ? parsed.active : null;
	return { workspaces, active: active && active in workspaces ? active : null };
}

/**
 * Two-space indent and no trailing newline, as core writes it.
 *
 * Known limit: a name like "2024" sorts first in a JavaScript object, so key order
 * can differ from core. JSON key order has no meaning, so only a diff shows it.
 */
export function serializeWorkspacesFile(file: WorkspacesFile): string {
	return JSON.stringify({ workspaces: file.workspaces, active: file.active }, null, 2);
}

/** Core drops `lastOpenFiles` and adds `mtime` when it stores a live layout. */
export function entryFromLayout(layout: JsonObject, now: Date): JsonObject {
	const { [LIVE_ONLY_KEY]: _dropped, ...rest } = layout;
	return { ...rest, mtime: formatMtime(now) };
}

/**
 * Local time with an offset, to the second: "2026-08-20T14:45:13-04:00".
 * `toISOString` gives UTC with milliseconds, which is a different string.
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
