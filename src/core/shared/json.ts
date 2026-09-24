export type JsonObject = Record<string, unknown>;

export function isRecord(value: unknown): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * A live layout and one read back from JSON can hold the same keys in a
 * different order. Plain `JSON.stringify` reports that as a difference.
 */
export function stableText(value: unknown): string {
	return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortKeys);
	if (!isRecord(value)) return value;

	const out: JsonObject = {};
	for (const key of Object.keys(value).sort()) out[key] = sortKeys(value[key]);
	return out;
}

export function withoutKeys(object: JsonObject, keys: readonly string[]): JsonObject {
	const out: JsonObject = {};
	for (const [key, value] of Object.entries(object)) {
		if (!keys.includes(key)) out[key] = value;
	}
	return out;
}
