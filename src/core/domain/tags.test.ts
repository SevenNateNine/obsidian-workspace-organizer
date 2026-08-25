import { describe, expect, it } from "vitest";
import { countTags, hasAllTags, normalizeTag, parseQuery, parseTags } from "./tags";

describe("normalizeTag", () => {
	it("strips a leading hash and lower cases", () => {
		expect(normalizeTag("#Writing")).toBe("writing");
	});

	it("collapses inner whitespace to a hyphen", () => {
		expect(normalizeTag("  deep   work ")).toBe("deep-work");
	});

	it("returns empty for a tag that is only punctuation", () => {
		expect(normalizeTag("#")).toBe("");
		expect(normalizeTag("   ")).toBe("");
	});
});

describe("parseTags", () => {
	it("accepts commas, spaces, and hashes together", () => {
		expect(parseTags("#dev, writing  #Focus")).toEqual(["dev", "writing", "focus"]);
	});

	it("drops duplicates and empties", () => {
		expect(parseTags("dev,,dev, #dev")).toEqual(["dev"]);
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

	it("counts a repeated tag on one workspace once", () => {
		expect(countTags([{ tags: ["dev", "dev"] }])).toEqual([{ tag: "dev", count: 1 }]);
	});
});
