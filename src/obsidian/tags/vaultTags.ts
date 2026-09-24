import { getAllTags, type App } from "obsidian";
import { countTags, normalizeTag, type TagCount } from "../../core/organize";

/**
 * The tags used in notes, counted once for each note, like the tags property
 * suggests them. `metadataCache.getTags()` is faster but is not public API.
 */
export function vaultTagCounts(app: App): TagCount[] {
	const notes = app.vault.getMarkdownFiles().map((file) => {
		const cache = app.metadataCache.getFileCache(file);
		const tags = cache ? (getAllTags(cache) ?? []) : [];
		return { tags: tags.map(normalizeTag).filter(Boolean) };
	});
	return countTags(notes);
}
