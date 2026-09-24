import { describe, expect, it } from "vitest";
import {
	countTags,
	dedupe,
	hasAllTags,
	mergeTagCounts,
	normalizeTag,
	parseQuery,
	parseTags,
	sameTag,
	storedTag,
	suggestTags,
} from "./tags";

describe("suggestTags", () => {
	const known = [
		{ tag: "writing", count: 3 },
		{ tag: "deep-work", count: 2 },
		{ tag: "rewrite", count: 1 },
		{ tag: "web", count: 1 },
	];

	it("lists the most used tags for an empty query", () => {
		expect(suggestTags("", known, [], 2)).toEqual(["writing", "deep-work"]);
	});

	it("ranks a prefix, then a substring, then letters in order", () => {
		expect(suggestTags("w", known, [])).toEqual([
			"writing",
			"web",
			"deep-work",
			"rewrite",
		]);
		expect(suggestTags("wr", known, [])).toEqual(["writing", "rewrite", "deep-work"]);
		expect(suggestTags("dw", known, [])).toEqual(["deep-work"]);
	});

	it("ignores a leading hash and the case of the query", () => {
		expect(suggestTags("#Deep-W", known, [])).toEqual(["deep-work"]);
	});

	it("keeps the stored spelling of a suggestion", () => {
		expect(suggestTags("pro", [{ tag: "Project", count: 1 }], [])).toEqual(["Project"]);
	});

	it("leaves out tags that are already chosen, in any case", () => {
		expect(suggestTags("w", known, ["Writing", "web"])).toEqual([
			"deep-work",
			"rewrite",
		]);
	});

	it("returns nothing when no tag matches", () => {
		expect(suggestTags("zzz", known, [])).toEqual([]);
	});
});

describe("normalizeTag", () => {
	it("strips a leading hash and keeps the case", () => {
		expect(normalizeTag("  #Writing ")).toBe("Writing");
	});

	it("accepts nested tags, other scripts, and emoji", () => {
		expect(normalizeTag("work/client-a")).toBe("work/client-a");
		expect(normalizeTag("日本語")).toBe("日本語");
		expect(normalizeTag("idea_💡")).toBe("idea_💡");
		expect(normalizeTag("y1984")).toBe("y1984");
	});

	// Obsidian does not treat these as tags, so a workspace must not get them.
	it("rejects what Obsidian rejects", () => {
		for (const bad of ["deep work", "v1.2", "c++", "a,b", "1984", "a//b", "/a", "a/"]) {
			expect(normalizeTag(bad)).toBe("");
		}
	});

	it("returns empty for no text", () => {
		expect(normalizeTag("#")).toBe("");
		expect(normalizeTag("   ")).toBe("");
	});
});

describe("storedTag", () => {
	it("only trims and strips the hash", () => {
		expect(storedTag(" #c++ ")).toBe("c++");
	});
});

describe("sameTag and dedupe", () => {
	it("ignore case", () => {
		expect(sameTag("Work", "work")).toBe(true);
		expect(sameTag("work", "work/a")).toBe(false);
	});

	it("keep the first spelling", () => {
		expect(dedupe(["Work", "work", "WORK", "home"])).toEqual(["Work", "home"]);
	});
});

describe("parseTags", () => {
	it("accepts commas, spaces, and hashes together", () => {
		expect(parseTags("#dev, writing  #Focus")).toEqual(["dev", "writing", "Focus"]);
	});

	it("drops duplicates, empties, and invalid tags", () => {
		expect(parseTags("dev,,Dev, #dev v1.2")).toEqual(["dev"]);
	});

	it("returns nothing for empty input", () => {
		expect(parseTags("")).toEqual([]);
	});
});

describe("parseQuery", () => {
	it("separates tags from search text", () => {
		expect(parseQuery("#dev api notes")).toEqual({ text: "api notes", tags: ["dev"] });
	});

	it("keeps text when no tag is present", () => {
		expect(parseQuery("draft mode")).toEqual({ text: "draft mode", tags: [] });
	});

	// Otherwise the list empties the moment the user types "#", before they have
	// had a chance to type the tag itself.
	it("ignores a bare hash still being typed", () => {
		expect(parseQuery("notes #")).toEqual({ text: "notes", tags: [] });
	});

	it("collects several tags and de-duplicates them", () => {
		expect(parseQuery("#dev #Dev #writing").tags).toEqual(["dev", "writing"]);
	});
});

describe("hasAllTags", () => {
	it("requires every selected tag, not just one", () => {
		expect(hasAllTags(["dev", "writing"], ["dev", "writing"])).toBe(true);
		expect(hasAllTags(["dev"], ["dev", "writing"])).toBe(false);
	});

	it("matches everything when nothing is selected", () => {
		expect(hasAllTags([], [])).toBe(true);
	});

	it("ignores case", () => {
		expect(hasAllTags(["Dev"], ["dev"])).toBe(true);
	});

	// As in Obsidian's tag search: "#work" finds "#work/client".
	it("matches a parent to its nested tags, not the reverse", () => {
		expect(hasAllTags(["work/client"], ["work"])).toBe(true);
		expect(hasAllTags(["work"], ["work/client"])).toBe(false);
		expect(hasAllTags(["workshop"], ["work"])).toBe(false);
	});
});

describe("countTags", () => {
	it("orders by count, then alphabetically", () => {
		const counts = countTags([
			{ tags: ["dev", "writing"] },
			{ tags: ["dev"] },
			{ tags: ["admin"] },
		]);

		expect(counts).toEqual([
			{ tag: "dev", count: 2 },
			{ tag: "admin", count: 1 },
			{ tag: "writing", count: 1 },
		]);
	});

	it("counts a repeated tag on one item once, in any case", () => {
		expect(countTags([{ tags: ["dev", "Dev"] }])).toEqual([{ tag: "dev", count: 1 }]);
	});

	it("merges case variants under the first spelling", () => {
		expect(countTags([{ tags: ["Dev"] }, { tags: ["dev"] }])).toEqual([
			{ tag: "Dev", count: 2 },
		]);
	});
});

describe("mergeTagCounts", () => {
	it("adds the counts of the same tag from each list", () => {
		const workspaces = [{ tag: "dev", count: 2 }];
		const notes = [
			{ tag: "Dev", count: 5 },
			{ tag: "reading", count: 9 },
		];

		expect(mergeTagCounts([workspaces, notes])).toEqual([
			{ tag: "reading", count: 9 },
			{ tag: "dev", count: 7 },
		]);
	});
});
