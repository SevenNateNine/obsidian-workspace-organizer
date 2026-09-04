import { LIVE_ONLY_KEY } from "./workspaceFile";
import { isRecord, stableText } from "../util";

/** A stored entry carries this; the live layout does not. */
const STORED_ONLY_KEY = "mtime";

/**
 * Tell whether the layout on screen still matches the stored workspace.
 *
 * The layout shape is private and core can change it without notice, so every
 * uncertainty answers "changed". A needless prompt costs one click. A missed
 * change loses the panes the user arranged.
 *
 * The two keys that always differ are dropped first. `mtime` is written at save
 * time and `lastOpenFiles` belongs to the vault, not to any one workspace.
 */
export function layoutsDiffer(live: unknown, stored: unknown): boolean {
	if (!isRecord(live) || !isRecord(stored)) return true;

	try {
		return stableText(comparable(live)) !== stableText(comparable(stored));
	} catch {
		return true;
	}
}

function comparable(entry: Record<string, unknown>): Record<string, unknown> {
	const { [LIVE_ONLY_KEY]: _live, [STORED_ONLY_KEY]: _stored, ...rest } = entry;
	return rest;
}
