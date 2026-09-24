import { isRecord, type JsonObject } from "../shared";

// The layout tree is undocumented and can change in any release. An unknown node
// recurses into its children, and a malformed tree summarizes as empty.

export interface LayoutSummary {
	/** Editor tabs. Sidebar panels do not count. */
	readonly tabs: number;
	/** Splits with more than one child. */
	readonly splits: number;
	readonly windows: number;
	/** De-duplicated, in layout order, not truncated. */
	readonly names: readonly string[];
}

interface Tally {
	tabs: number;
	splits: number;
	windows: number;
	names: string[];
}

const EMPTY: LayoutSummary = { tabs: 0, splits: 0, windows: 0, names: [] };

/** Sidebar contents are panels. Counting them makes every workspace look the same. */
const SIDEBAR_KEYS: readonly string[] = ["left", "right", "leftRibbon", "rightRibbon"];

const VIEW_LABELS: Readonly<Record<string, string>> = {
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

	const tally: Tally = { tabs: 0, splits: 0, windows: 0, names: [] };
	for (const [key, value] of Object.entries(layout)) {
		if (!SIDEBAR_KEYS.includes(key)) walk(value, tally);
	}
	return { ...tally, names: [...new Set(tally.names)] };
}

function walk(node: unknown, tally: Tally): void {
	if (!isRecord(node)) return;

	switch (node.type) {
		case "leaf":
			tally.tabs += 1;
			tally.names.push(leafName(node));
			return;
		case "split":
			// Core wraps a single pane in a split of one. That is not a division.
			if (childrenOf(node).length > 1) tally.splits += 1;
			break;
		case "window":
			tally.windows += 1;
			break;
		default:
			break;
	}

	for (const child of childrenOf(node)) walk(child, tally);
}

function childrenOf(node: JsonObject): readonly unknown[] {
	return Array.isArray(node.children) ? node.children : [];
}

function leafName(leaf: JsonObject): string {
	const state = isRecord(leaf.state) ? leaf.state : {};
	const inner = isRecord(state.state) ? state.state : {};
	const file = typeof inner.file === "string" ? inner.file : "";
	if (file) return basename(file);

	const type = typeof state.type === "string" ? state.type : "";
	return VIEW_LABELS[type] ?? titleCase(type) ?? "Pane";
}

/** Only the markdown extension is dropped. Other kinds keep theirs. */
function basename(path: string): string {
	const last = path.split("/").pop() ?? path;
	return last.replace(/\.md$/i, "");
}

function titleCase(type: string): string | null {
	const words = type.replace(/[-_]+/g, " ").trim();
	return words ? words.charAt(0).toUpperCase() + words.slice(1) : null;
}

/** For example "5 tabs, 2 splits · Chapter 1, Outline, +3". */
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
