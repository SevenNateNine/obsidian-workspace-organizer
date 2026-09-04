/**
 * Small helpers that more than one module needs.
 *
 * Each one was defined privately in several files before. Sharing them keeps
 * the definitions from drifting apart, which matters most for `isRecord`: it
 * guards every read of untrusted data, so two versions of it would mean two
 * different ideas of what counts as safe.
 */

/**
 * An array is not a record here. Core's layout tree and our own `data.json`
 * are both untrusted, and an unknown shape must read as absent, never crash.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Copy a value, dropping every reference the caller could still hold.
 *
 * Used where a caller must not be able to change our stored copy by editing
 * the object it got back.
 */
export function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Serialize with object keys in sorted order.
 *
 * A live layout and one read back from JSON can hold the same keys in a
 * different order, which plain `JSON.stringify` reports as a difference.
 */
export function stableText(value: unknown): string {
	return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortKeys);
	if (!isRecord(value)) return value;

	const out: Record<string, unknown> = {};
	for (const key of Object.keys(value).sort()) out[key] = sortKeys(value[key]);
	return out;
}
