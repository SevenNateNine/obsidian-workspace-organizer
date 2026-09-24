/**
 * A slot is a gap between rows: 0 is above the first row, `midpoints.length` is
 * below the last. The pointer is in the slot above each row whose midpoint it has not passed.
 */
export function dropSlot(midpoints: readonly number[], pointerY: number): number {
	return midpoints.filter((midpoint) => midpoint < pointerY).length;
}

/** The row leaves its own position first, so a slot below it is one index lower. */
export function slotToDelta(from: number, slot: number): number {
	const to = slot > from ? slot - 1 : slot;
	return to - from;
}
