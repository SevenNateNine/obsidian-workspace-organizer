/**
 * Describe a stored workspace layout in one line.
 *
 * Core stores an opaque layout tree per workspace and shows the user nothing
 * about it, so a workspace list is a list of bare names. This walks that tree
 * and reports what is actually in it.
 *
 * The tree is an undocumented shape that can change between Obsidian releases,
 * so everything here treats it as untrusted: an unknown node type recurses into
 * its children, and a malformed tree summarizes as empty rather than throwing.
 */

import { isRecord } from "../util";

export interface LayoutSummary {
	/** Editor tabs. Sidebar panels are not counted. */
	tabs: number;
	/** Split containers holding more than one child. */
	splits: number;
	windows: number;
	/** De-duplicated, in layout order. Not truncated: see `formatSummary`. */
	names: string[];
}

const EMPTY: LayoutSummary = { tabs: 0, splits: 0, windows: 0, names: [] };

/**
 * Sidebar roots. Their contents are panels, not tabs, and counting them makes
 * every workspace look the same.
 */
const SIDEBAR_KEYS = ["left", "right", "leftRibbon", "rightRibbon"];

/** Friendlier than the raw view type for the panes a user recognizes. */
const VIEW_LABELS: Record<string, string> = {
	empty: "New tab",
	graph: "Graph",
	localgraph: "Local graph",
	canvas: "Canvas",
	search: "Search",
	backlink: "Backlinks",
	"outgoing-link": "Outgoing links",
	outline: "Outline",
	tag: "Tags",
	bookmarks: "Bookmarks",
	"file-explorer": "Files",
	"all-properties": "Properties",
	bases: "Base",
	pdf: "PDF",
	image: "Image",
	audio: "Audio",
	video: "Video",
};

export function summarizeLayout(layout: unknown): LayoutSummary {
	if (!isRecord(layout)) return EMPTY;

	const acc = { tabs: 0, splits: 0, windows: 0, names: [] as string[] };

	for (const [key, value] of Object.entries(layout)) {
		if (SIDEBAR_KEYS.includes(key)) continue;
		walk(value, acc);
	}

	return { ...acc, names: [...new Set(acc.names)] };
}

interface Acc {
	tabs: number;
	splits: number;
	windows: number;
	names: string[];
}

function walk(node: unknown, acc: Acc): void {
	if (!isRecord(node)) return;

	switch (node.type) {
		case "leaf":
			acc.tabs += 1;
			acc.names.push(leafName(node));
			return;
		case "split":
			// A split of one is how core wraps a single pane. Only a real division
			// of the editor area is worth reporting.
			if (childrenOf(node).length > 1) acc.splits += 1;
			break;
		case "window":
			acc.windows += 1;
			break;
		default:
			break;
	}

	for (const child of childrenOf(node)) walk(child, acc);
}

function childrenOf(node: Record<string, unknown>): unknown[] {
	return Array.isArray(node.children) ? node.children : [];
}

/** A leaf names itself by its file, or by the kind of view it holds. */
function leafName(leaf: Record<string, unknown>): string {
	const state = isRecord(leaf.state) ? leaf.state : {};
	const inner = isRecord(state.state) ? state.state : {};
	const file = typeof inner.file === "string" ? inner.file : "";

	if (file) return basename(file);

	const type = typeof state.type === "string" ? state.type : "";
	return VIEW_LABELS[type] ?? titleCase(type) ?? "Pane";
}

/** Last path segment, without the markdown extension. Other kinds keep theirs. */
function basename(path: string): string {
	const last = path.split("/").pop() ?? path;
	return last.replace(/\.md$/i, "");
}

function titleCase(type: string): string | null {
	if (!type) return null;
	const words = type.replace(/[-_]+/g, " ").trim();
	return words ? words.charAt(0).toUpperCase() + words.slice(1) : null;
}

/**
 * Render a summary as switcher subtext, for example
 * "5 tabs, 2 splits · Chapter 1, Outline, +3".
 */
export function formatSummary(summary: LayoutSummary, maxNames = 3): string {
	if (summary.tabs === 0 && summary.names.length === 0) return "Empty workspace";

	const counts = [plural(summary.tabs, "tab")];
	if (summary.splits > 0) counts.push(plural(summary.splits, "split"));
	if (summary.windows > 0) counts.push(plural(summary.windows, "window"));

	const shown = summary.names.slice(0, Math.max(0, maxNames));
	const hidden = summary.names.length - shown.length;
	if (hidden > 0) shown.push(`+${hidden}`);

	const head = counts.join(", ");
	return shown.length > 0 ? `${head} · ${shown.join(", ")}` : head;
}

function plural(count: number, noun: string): string {
	return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
