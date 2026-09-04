/**
 * What a tag is: how it is written down, and how a set of them is compared.
 *
 * Three surfaces have to agree on this. The edit modal accepts typed input,
 * the switcher filters on it, and the migration normalizes what was stored
 * before. Searching by tag is the switcher's own business and lives there.
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
