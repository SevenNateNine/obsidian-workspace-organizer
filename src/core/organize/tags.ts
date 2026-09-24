/**
 * The characters Obsidian does not allow in a tag. Emoji and letters of any
 * script are allowed. Source: https://help.obsidian.md/tags#Tag+format
 */
const FORBIDDEN_IN_TAG = /[\s!"#$%&'()*+,.:;<=>?@[\]^`{|}~]/;

/**
 * Keeps the case, like Obsidian. Returns "" when the text is not a valid tag:
 * a forbidden character, digits only, or an empty segment in a nested tag.
 */
export function normalizeTag(raw: string): string {
	const tag = storedTag(raw);
	if (!tag || FORBIDDEN_IN_TAG.test(tag)) return "";
	if (!/[^\d/]/.test(tag)) return "";
	return tag.split("/").includes("") ? "" : tag;
}

/**
 * For a tag read from storage. Older builds used other rules, so a stored tag is
 * kept even when `normalizeTag` rejects it. Deleting it would lose user data.
 */
export function storedTag(raw: string): string {
	return raw.trim().replace(/^#+/, "").trim();
}

/** Obsidian treats tags that differ only in case as the same tag. */
export function tagKey(tag: string): string {
	return tag.toLowerCase();
}

export function sameTag(a: string, b: string): boolean {
	return tagKey(a) === tagKey(b);
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

/** Ignores case. The first spelling wins. */
export function dedupe(tags: readonly string[]): string[] {
	const byKey = new Map<string, string>();
	for (const tag of tags) {
		if (!byKey.has(tagKey(tag))) byKey.set(tagKey(tag), tag);
	}
	return [...byKey.values()];
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

/**
 * AND, not OR: a second chip must narrow the list, or the filter looks broken.
 * A parent matches its nested tags, as in Obsidian's tag search.
 */
export function hasAllTags(
	tags: readonly string[],
	required: readonly string[],
): boolean {
	const keys = tags.map(tagKey);
	return required.every((tag) => {
		const wanted = tagKey(tag);
		return keys.some((key) => key === wanted || key.startsWith(`${wanted}/`));
	});
}

export interface TagCount {
	readonly tag: string;
	readonly count: number;
}

/** Most used first, then alphabetical. A tag counts once for each item. */
export function countTags(
	taggedItems: ReadonlyArray<{ readonly tags: readonly string[] }>,
): TagCount[] {
	return mergeTagCounts(
		taggedItems.map((item) => dedupe(item.tags).map((tag) => ({ tag, count: 1 }))),
	);
}

/** Adds the counts of the same tag in any case. The first spelling wins. */
export function mergeTagCounts(lists: ReadonlyArray<readonly TagCount[]>): TagCount[] {
	const byKey = new Map<string, TagCount>();

	for (const list of lists) {
		for (const { tag, count } of list) {
			const seen = byKey.get(tagKey(tag));
			byKey.set(tagKey(tag), {
				tag: seen?.tag ?? tag,
				count: (seen?.count ?? 0) + count,
			});
		}
	}

	return [...byKey.values()].sort(
		(a, b) => b.count - a.count || a.tag.localeCompare(b.tag),
	);
}

/**
 * Tags from `known` that match what the user typed, best match first: a prefix,
 * then a substring, then the letters in order. Ties keep the order of `known`.
 * Case is ignored everywhere.
 */
export function suggestTags(
	query: string,
	known: readonly TagCount[],
	chosen: readonly string[],
	limit = 8,
): string[] {
	const typed = tagKey(storedTag(query));
	const chosenKeys = chosen.map(tagKey);
	const ranked: { tag: string; rank: number }[] = [];

	for (const { tag } of known) {
		if (chosenKeys.includes(tagKey(tag))) continue;
		const rank = matchRank(tagKey(tag), typed);
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
