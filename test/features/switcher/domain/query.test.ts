import { describe, expect, it } from "vitest";
import { countTags, parseQuery } from "@/features/switcher/domain/query";

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
