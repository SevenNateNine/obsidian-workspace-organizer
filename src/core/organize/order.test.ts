import { describe, expect, it } from "vitest";
import { dropSlot, slotToDelta } from "./order";

const MIDPOINTS = [10, 30, 50];

describe("dropSlot", () => {
	it("is 0 above the first midpoint", () => {
		expect(dropSlot(MIDPOINTS, 5)).toBe(0);
	});

	it("counts the midpoints the pointer has passed", () => {
		expect(dropSlot(MIDPOINTS, 11)).toBe(1);
		expect(dropSlot(MIDPOINTS, 49)).toBe(2);
	});

	it("is the row count below the last midpoint", () => {
		expect(dropSlot(MIDPOINTS, 80)).toBe(3);
	});

	it("is 0 with no rows", () => {
		expect(dropSlot([], 80)).toBe(0);
	});
});

describe("slotToDelta", () => {
	it("moves up by the distance to a slot above", () => {
		expect(slotToDelta(2, 0)).toBe(-2);
	});

	it("does not move for the slots on either side of the row", () => {
		expect(slotToDelta(1, 1)).toBe(0);
		expect(slotToDelta(1, 2)).toBe(0);
	});

	it("moves down to the last position from the slot below the last row", () => {
		expect(slotToDelta(0, 3)).toBe(2);
	});
});
