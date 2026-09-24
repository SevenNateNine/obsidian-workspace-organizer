import { describe, expect, it } from "vitest";
import { formatSummary, summarizeLayout } from "./layoutSummary";

/** A markdown editor tab, shaped the way core stores one. */
function fileLeaf(file: string) {
	return { id: file, type: "leaf", state: { type: "markdown", state: { file } } };
}

function viewLeaf(type: string) {
	return { id: type, type: "leaf", state: { type, state: {} } };
}

function tabs(...children: unknown[]) {
	return { id: "tabs", type: "tabs", children, currentTab: 0 };
}

function split(...children: unknown[]) {
	return { id: "split", type: "split", children, direction: "vertical" };
}

/** A sidebar full of panels, which must not be mistaken for editor tabs. */
const SIDEBAR = split(tabs(viewLeaf("file-explorer"), viewLeaf("search")));

describe("summarizeLayout", () => {
	it("counts editor tabs and names them by file", () => {
		const summary = summarizeLayout({
			main: split(tabs(fileLeaf("Notes/Chapter 1.md"), fileLeaf("Outline.md"))),
			left: SIDEBAR,
			right: SIDEBAR,
			active: "Outline.md",
			lastOpenFiles: ["Chapter 1.md"],
		});

		expect(summary.tabs).toBe(2);
		expect(summary.names).toEqual(["Chapter 1", "Outline"]);
	});

	it("ignores both sidebars", () => {
		const summary = summarizeLayout({ left: SIDEBAR, right: SIDEBAR });
		expect(summary.tabs).toBe(0);
	});

	it("labels a leaf that holds no file by its view", () => {
		const summary = summarizeLayout({ main: split(tabs(viewLeaf("graph"))) });
		expect(summary.names).toEqual(["Graph"]);
	});

	it("title cases an unknown view type rather than showing the raw id", () => {
		const summary = summarizeLayout({ main: split(tabs(viewLeaf("kanban-board"))) });
		expect(summary.names).toEqual(["Kanban board"]);
	});

	it("keeps a non-markdown extension", () => {
		const summary = summarizeLayout({ main: split(tabs(fileLeaf("Board.canvas"))) });
		expect(summary.names).toEqual(["Board.canvas"]);
	});

	// Core wraps a single pane in a split, so counting those would report a split
	// on every workspace.
	it("does not count a split holding one child", () => {
		const summary = summarizeLayout({ main: split(tabs(fileLeaf("A.md"))) });
		expect(summary.splits).toBe(0);
	});

	it("counts a split that really divides the editor", () => {
		const summary = summarizeLayout({
			main: split(tabs(fileLeaf("A.md")), tabs(fileLeaf("B.md"))),
		});

		expect(summary.splits).toBe(1);
		expect(summary.tabs).toBe(2);
	});

	it("counts popout windows and includes their tabs", () => {
		const summary = summarizeLayout({
			main: split(tabs(fileLeaf("A.md"))),
			floatingSplit: {
				id: "float",
				type: "floating",
				children: [
					{ id: "w1", type: "window", children: [split(tabs(fileLeaf("B.md")))] },
				],
			},
		});

		expect(summary.windows).toBe(1);
		expect(summary.tabs).toBe(2);
		expect(summary.names).toEqual(["A", "B"]);
	});

	it("shows the same file open twice only once", () => {
		const summary = summarizeLayout({
			main: split(tabs(fileLeaf("A.md")), tabs(fileLeaf("A.md"))),
		});

		expect(summary.tabs).toBe(2);
		expect(summary.names).toEqual(["A"]);
	});

	// The layout tree is undocumented and can change shape between releases. A
	// summary is decoration: it must never be the reason the switcher fails.
	it("survives malformed input", () => {
		for (const bad of [null, undefined, 42, "layout", [], { main: "nonsense" }]) {
			expect(() => summarizeLayout(bad)).not.toThrow();
			expect(summarizeLayout(bad).tabs).toBe(0);
		}
	});
});

describe("formatSummary", () => {
	it("reads as a sentence fragment", () => {
		const summary = { tabs: 5, splits: 2, windows: 1, names: ["A", "B"] };
		expect(formatSummary(summary)).toBe("5 tabs, 2 splits, 1 window · A, B");
	});

	it("omits counts that are zero", () => {
		expect(formatSummary({ tabs: 1, splits: 0, windows: 0, names: ["A"] })).toBe(
			"1 tab · A",
		);
	});

	it("truncates the name list with a remainder", () => {
		const summary = {
			tabs: 5,
			splits: 0,
			windows: 0,
			names: ["A", "B", "C", "D", "E"],
		};
		expect(formatSummary(summary, 3)).toBe("5 tabs · A, B, C, +2");
	});

	it("describes an empty workspace in words", () => {
		expect(formatSummary({ tabs: 0, splits: 0, windows: 0, names: [] })).toBe(
			"Empty workspace",
		);
	});
});
