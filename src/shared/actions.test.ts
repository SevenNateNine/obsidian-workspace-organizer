import { describe, expect, it } from "vitest";
import { assertActionsComplete, createActions } from "./actions";

describe("createActions", () => {
	it("throws when an unregistered action is called", () => {
		const actions = createActions();
		expect(() => actions.openSwitcher()).toThrow(/openSwitcher/);
	});

	it("names the action that was never registered", () => {
		const actions = createActions();
		expect(() => actions.promptDelete("Writing")).toThrow(/promptDelete/);
	});
});

describe("assertActionsComplete", () => {
	it("reports every action no slice filled in", () => {
		expect(() => assertActionsComplete(createActions())).toThrow(
			/openSwitcher.*saveActive.*openEditor/,
		);
	});

	it("names only the ones still missing", () => {
		const actions = createActions();
		for (const name of Object.keys(actions) as (keyof typeof actions)[]) {
			if (name !== "stepBy") Object.assign(actions, { [name]: () => undefined });
		}

		expect(() => assertActionsComplete(actions)).toThrow(
			/unregistered actions: stepBy$/,
		);
	});

	it("passes once every action is filled in", () => {
		const actions = createActions();
		for (const name of Object.keys(actions) as (keyof typeof actions)[]) {
			Object.assign(actions, { [name]: () => undefined });
		}

		expect(() => assertActionsComplete(actions)).not.toThrow();
	});
});
