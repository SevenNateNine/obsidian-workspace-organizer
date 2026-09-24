import { dropSlot, slotToDelta } from "../../core/organize";

export interface ReorderRow {
	readonly row: HTMLElement;
	readonly handle: HTMLElement;
}

const DRAGGING = "is-dragging";
const DROP_BEFORE = "ew-drop-before";
const DROP_AFTER = "ew-drop-after";

/**
 * Pointer events, not HTML drag and drop, because Obsidian mobile gets no drag
 * events from touch.
 */
export function enableDragReorder(
	rows: readonly ReorderRow[],
	onMove: (from: number, delta: number) => void,
): void {
	rows.forEach(({ handle }, from) => {
		handle.addEventListener("pointerdown", (event) => {
			if (event.button !== 0) return;
			event.preventDefault();
			handle.setPointerCapture(event.pointerId);
			beginDrag(rows, from, onMove);
		});
	});
}

function beginDrag(
	rows: readonly ReorderRow[],
	from: number,
	onMove: (from: number, delta: number) => void,
): void {
	const dragged = rows[from];
	if (!dragged) return;

	const listeners = new AbortController();
	const options = { signal: listeners.signal };
	let slot = from;

	const finish = (commit: boolean): void => {
		listeners.abort();
		clearMarks(rows);
		const delta = slotToDelta(from, slot);
		if (commit && delta !== 0) onMove(from, delta);
	};

	dragged.row.addClass(DRAGGING);
	dragged.handle.addEventListener(
		"pointermove",
		(event) => {
			slot = dropSlot(midpoints(rows), event.clientY);
			markSlot(rows, slot);
		},
		options,
	);
	dragged.handle.addEventListener("pointerup", () => finish(true), options);
	dragged.handle.addEventListener("pointercancel", () => finish(false), options);
}

function midpoints(rows: readonly ReorderRow[]): number[] {
	return rows.map(({ row }) => {
		const rect = row.getBoundingClientRect();
		return rect.top + rect.height / 2;
	});
}

function markSlot(rows: readonly ReorderRow[], slot: number): void {
	clearDropMarks(rows);
	const below = rows[slot];
	if (below) below.row.addClass(DROP_BEFORE);
	else rows[rows.length - 1]?.row.addClass(DROP_AFTER);
}

function clearDropMarks(rows: readonly ReorderRow[]): void {
	for (const { row } of rows) row.removeClass(DROP_BEFORE, DROP_AFTER);
}

function clearMarks(rows: readonly ReorderRow[]): void {
	clearDropMarks(rows);
	for (const { row } of rows) row.removeClass(DRAGGING);
}
