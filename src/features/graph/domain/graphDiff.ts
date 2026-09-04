import { isRecord, stableText } from "../../../shared/domain/util";

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
 * Same contract as `layoutsDiffer`: anything unreadable answers "changed". A
 * needless prompt costs one click, and a missed change loses the settings the
 * user arranged.
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
