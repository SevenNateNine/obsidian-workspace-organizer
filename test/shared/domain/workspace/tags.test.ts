import { describe, expect, it } from "vitest";
import { hasAllTags, normalizeTag, parseTags } from "@/shared/domain/workspace/tags";

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

describe("hasAllTags", () => {
	it("requires every selected tag, not just one", () => {
		expect(hasAllTags(["dev", "writing"], ["dev", "writing"])).toBe(true);
		expect(hasAllTags(["dev"], ["dev", "writing"])).toBe(false);
	});

	it("matches everything when nothing is selected", () => {
		expect(hasAllTags([], [])).toBe(true);
	});
});
