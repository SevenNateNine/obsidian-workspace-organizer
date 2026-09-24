import { LIVE_ONLY_KEY } from "../workspaces/workspaceFile";

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

/**
 * Keys the graph rewrites on its own, which must not count as a change.
 *
 * `scale` moves on any zoom and the `collapse` flags and `close` only say
 * which control panels are open. They stay in a saved snapshot, so the zoom
 * comes back, and they are dropped only from this comparison.
 */
const VOLATILE_GRAPH_KEYS = [
	"scale",
	"close",
	"collapse-filter",
	"collapse-color-groups",
	"collapse-display",
	"collapse-forces",
];

/**
 * Tell whether the graph settings on screen still match the stored snapshot.
 *
 * Same contract as `layoutsDiffer`: anything unreadable answers "changed".
 */
export function graphOptionsDiffer(live: unknown, stored: unknown): boolean {
	if (!isRecord(live) || !isRecord(stored)) return true;

	try {
		return stableText(steady(live)) !== stableText(steady(stored));
	} catch {
		return true;
	}
}

function steady(options: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(options)) {
		if (!VOLATILE_GRAPH_KEYS.includes(key)) out[key] = value;
	}
	return out;
}

function comparable(entry: Record<string, unknown>): Record<string, unknown> {
	const { [LIVE_ONLY_KEY]: _live, [STORED_ONLY_KEY]: _stored, ...rest } = entry;
	return rest;
}

/**
 * Serialize with object keys in sorted order.
 *
 * A live layout and one read back from JSON can hold the same keys in a
 * different order, which plain `JSON.stringify` reports as a difference.
 */
function stableText(value: unknown): string {
	return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortKeys);
	if (!isRecord(value)) return value;

	const out: Record<string, unknown> = {};
	for (const key of Object.keys(value).sort()) out[key] = sortKeys(value[key]);
	return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
