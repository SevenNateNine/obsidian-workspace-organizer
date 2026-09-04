/**
 * Searching the workspace list by text and by tag.
 *
 * `shared/domain/workspace/tags.ts` answers what a tag is. This answers how
 * you search by one, which only the switcher needs.
 */

import { dedupe, normalizeTag } from "../../../shared/domain/workspace/tags";

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
