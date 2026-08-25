/**
 * Tag rules, kept in one place because three surfaces need to agree: the edit
 * modal that accepts typed input, the chip bar that lists what exists, and the
 * switcher query that filters on "#tag".
 */

/**
 * A tag as stored: lower case, no leading "#", inner runs of whitespace
 * collapsed to a hyphen. Returns "" for anything that normalizes to nothing,
 * which callers drop.
 */
export function normalizeTag(raw: string): string {
	return raw.trim().replace(/^#+/, "").trim().toLowerCase().replace(/\s+/g, "-");
}

/** Parse user input from the edit modal. Accepts commas, spaces, and "#". */
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
	/** The query with every "#tag" token removed, for fuzzy matching. */
	text: string;
	/** Tags typed inline. Combined with the chip bar selection. */
	tags: string[];
}

/**
 * Split "#dev api notes" into the tags to filter on and the text to match.
 *
 * A bare trailing "#" is dropped rather than treated as a tag, so the list does
 * not empty out while the user is still typing the first character.
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
 * True when `tags` carries every tag in `required`.
 *
 * AND rather than OR: selecting a second chip should narrow the list. OR would
 * make each extra chip show more, which reads as the filter not working.
 */
export function hasAllTags(
	tags: readonly string[],
	required: readonly string[],
): boolean {
	return required.every((tag) => tags.includes(tag));
}

export interface TagCount {
	tag: string;
	count: number;
}

/** Every tag in use, most used first, then alphabetical. Drives the chip bar. */
export function countTags(taggedItems: ReadonlyArray<{ tags: string[] }>): TagCount[] {
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
