/** Lower case, no leading "#", inner whitespace as a hyphen. "" means no tag. */
export function normalizeTag(raw: string): string {
	return raw.trim().replace(/^#+/, "").trim().toLowerCase().replace(/\s+/g, "-");
}

/** Accepts commas, spaces, and "#". */
export function parseTags(input: string): string[] {
	return dedupe(
		input
			.split(/[,\s]+/)
			.map(normalizeTag)
			.filter(Boolean),
	);
}

export function dedupe(tags: readonly string[]): string[] {
	return [...new Set(tags)];
}

export interface ParsedQuery {
	/** The query without its "#tag" tokens, for fuzzy matching. */
	readonly text: string;
	readonly tags: readonly string[];
}

/**
 * A bare "#" is dropped, so the list does not empty while the user types the
 * first character of a tag.
 */
export function parseQuery(query: string): ParsedQuery {
	const tags: string[] = [];
	const words: string[] = [];

	for (const word of query.split(/\s+/)) {
		if (word.startsWith("#")) {
			const tag = normalizeTag(word);
			if (tag) tags.push(tag);
		} else if (word) {
			words.push(word);
		}
	}

	return { text: words.join(" "), tags: dedupe(tags) };
}

/** AND, not OR: a second chip must narrow the list, or the filter looks broken. */
export function hasAllTags(
	tags: readonly string[],
	required: readonly string[],
): boolean {
	return required.every((tag) => tags.includes(tag));
}

export interface TagCount {
	readonly tag: string;
	readonly count: number;
}

/** Most used first, then alphabetical. */
export function countTags(
	taggedItems: ReadonlyArray<{ readonly tags: readonly string[] }>,
): TagCount[] {
	const counts = new Map<string, number>();

	for (const item of taggedItems) {
		for (const tag of dedupe(item.tags)) {
			counts.set(tag, (counts.get(tag) ?? 0) + 1);
		}
	}

	return [...counts.entries()]
		.map(([tag, count]) => ({ tag, count }))
		.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/**
 * Tags from `known` that match what the user typed, best match first: a prefix,
 * then a substring, then the letters in order. Ties keep the order of `known`.
 */
export function suggestTags(
	query: string,
	known: readonly TagCount[],
	chosen: readonly string[],
	limit = 8,
): string[] {
	const typed = normalizeTag(query);
	const ranked: { tag: string; rank: number }[] = [];

	for (const { tag } of known) {
		if (chosen.includes(tag)) continue;
		const rank = matchRank(tag, typed);
		if (rank !== null) ranked.push({ tag, rank });
	}

	return ranked
		.map((entry, index) => ({ ...entry, index }))
		.sort((a, b) => a.rank - b.rank || a.index - b.index)
		.slice(0, limit)
		.map(({ tag }) => tag);
}

function matchRank(tag: string, typed: string): number | null {
	if (tag.startsWith(typed)) return 0;
	if (tag.includes(typed)) return 1;
	return isSubsequence(typed, tag) ? 2 : null;
}

function isSubsequence(needle: string, haystack: string): boolean {
	let at = 0;
	for (const char of haystack) {
		if (char === needle[at]) at += 1;
	}
	return at === needle.length;
}
