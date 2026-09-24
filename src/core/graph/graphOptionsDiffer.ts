import { isRecord, stableText, withoutKeys } from "../shared";

/**
 * The graph rewrites these on its own: `scale` on any zoom, and the others when a
 * control panel opens. They stay in a saved snapshot so the zoom comes back.
 */
const VOLATILE_GRAPH_KEYS = [
	"scale",
	"close",
	"collapse-filter",
	"collapse-color-groups",
	"collapse-display",
	"collapse-forces",
] as const;

/** Same contract as `layoutsDiffer`: anything unreadable answers "changed". */
export function graphOptionsDiffer(live: unknown, stored: unknown): boolean {
	if (!isRecord(live) || !isRecord(stored)) return true;

	try {
		return (
			stableText(withoutKeys(live, VOLATILE_GRAPH_KEYS)) !==
			stableText(withoutKeys(stored, VOLATILE_GRAPH_KEYS))
		);
	} catch {
		return true;
	}
}
