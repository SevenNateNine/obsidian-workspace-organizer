import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
	entryFromLayout,
	formatMtime,
	parseWorkspacesFile,
	serializeWorkspacesFile,
} from "@/shared/domain/workspace/workspaceFile";

/** A real file written by core, trimmed to two workspaces. */
const SAMPLE = readFileSync(
	fileURLToPath(new URL("../../../fixtures/workspaces.sample.json", import.meta.url)),
	"utf8",
);

describe("round trip against a real core-written file", () => {
	/**
	 * The whole vanilla-format promise in one assertion. If this fails, a vault
	 * synced between devices gets a spurious diff, or worse, core reads back
	 * something it did not write.
	 */
	it("reproduces the file byte for byte", () => {
		expect(serializeWorkspacesFile(parseWorkspacesFile(SAMPLE))).toBe(SAMPLE);
	});

	it("keeps workspace order", () => {
		const parsed = parseWorkspacesFile(SAMPLE);
		expect(Object.keys(parsed.workspaces)).toEqual(["mammalian-research", "clean"]);
	});

	it("reads the active workspace", () => {
		expect(parseWorkspacesFile(SAMPLE).active).toBe("clean");
	});

	it("keeps each layout whole", () => {
		const entry = parseWorkspacesFile(SAMPLE).workspaces["mammalian-research"];
		expect(Object.keys(entry as object)).toEqual([
			"main",
			"left",
			"right",
			"left-ribbon",
			"active",
			"mtime",
		]);
	});
});

describe("parseWorkspacesFile", () => {
	it("treats a missing file as empty", () => {
		expect(parseWorkspacesFile("")).toEqual({ workspaces: {}, active: null });
	});

	it("survives a hand-edited file that is not valid JSON", () => {
		expect(parseWorkspacesFile("{ oops")).toEqual({ workspaces: {}, active: null });
	});

	it("survives a file of the wrong shape", () => {
		for (const bad of ["[]", "42", '"text"', "null", "{}"]) {
			expect(parseWorkspacesFile(bad)).toEqual({ workspaces: {}, active: null });
		}
	});

	// Such an entry would list in the switcher and then load nothing.
	it("drops a name whose layout is not an object", () => {
		const raw = '{"workspaces":{"good":{"main":{}},"bad":null},"active":"good"}';
		expect(Object.keys(parseWorkspacesFile(raw).workspaces)).toEqual(["good"]);
	});

	// Otherwise the switcher shows a selection that cannot be loaded.
	it("clears an active name that no longer resolves", () => {
		const raw = '{"workspaces":{"a":{"main":{}}},"active":"deleted"}';
		expect(parseWorkspacesFile(raw).active).toBeNull();
	});
});

describe("entryFromLayout", () => {
	const now = new Date(2026, 7, 20, 14, 45, 13);

	// Recent files belong to the vault, not to one workspace. Core drops them.
	it("drops lastOpenFiles", () => {
		const entry = entryFromLayout({ main: {}, lastOpenFiles: ["a.md"] }, now);
		expect(entry).not.toHaveProperty("lastOpenFiles");
		expect(entry).toHaveProperty("main");
	});

	it("adds an mtime", () => {
		expect(entryFromLayout({ main: {} }, now).mtime).toMatch(
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/,
		);
	});

	it("keeps every other key, including ones we do not know", () => {
		const entry = entryFromLayout({ main: {}, "left-ribbon": {}, future: 1 }, now);
		expect(Object.keys(entry)).toEqual(["main", "left-ribbon", "future", "mtime"]);
	});

	it("replaces a stale mtime rather than keeping two", () => {
		const entry = entryFromLayout({ main: {}, mtime: "old" }, now);
		expect(entry.mtime).not.toBe("old");
	});
});

describe("formatMtime", () => {
	/** Fix the zone so the assertion holds wherever the test runs. */
	function at(minutesBehindUtc: number): Date {
		const date = new Date(2026, 7, 20, 14, 45, 13);
		vi.spyOn(date, "getTimezoneOffset").mockReturnValue(minutesBehindUtc);
		return date;
	}

	// The exact string core writes. `toISOString` gives UTC with milliseconds
	// and a "Z", which is a different format.
	it("matches the format core writes", () => {
		expect(formatMtime(at(240))).toBe("2026-08-20T14:45:13-04:00");
	});

	it("handles a zone ahead of UTC", () => {
		expect(formatMtime(at(-60))).toBe("2026-08-20T14:45:13+01:00");
	});

	it("handles a half-hour offset", () => {
		expect(formatMtime(at(-330))).toBe("2026-08-20T14:45:13+05:30");
	});

	it("handles UTC", () => {
		expect(formatMtime(at(0))).toBe("2026-08-20T14:45:13+00:00");
	});

	it("pads every field", () => {
		const date = new Date(2026, 0, 2, 3, 4, 5);
		vi.spyOn(date, "getTimezoneOffset").mockReturnValue(240);
		expect(formatMtime(date)).toBe("2026-01-02T03:04:05-04:00");
	});
});
