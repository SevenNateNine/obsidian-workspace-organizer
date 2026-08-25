import { describe, expect, it } from "vitest";
import type { App } from "obsidian";
import { GraphOptionsAdapter } from "./GraphOptionsAdapter";

interface FakeInstance {
	options?: unknown;
	saveOptions?: () => void;
}

/** Stands in for the host, which is `app` plus the undocumented hook. */
function hostWith(instance: FakeInstance | null): App {
	return {
		internalPlugins: { getEnabledPluginById: () => instance },
	} as unknown as App;
}

const OPTIONS = { search: "shark", showTags: false, scale: 1.1 };

describe("current", () => {
	it("reads the graph plugin's settings", () => {
		const adapter = new GraphOptionsAdapter(hostWith({ options: { ...OPTIONS } }));
		expect(adapter.current()).toEqual(OPTIONS);
	});

	// Core mutates this object as the user drags a slider.
	it("copies, so a later change to the instance leaves the result alone", () => {
		const instance: FakeInstance = { options: { ...OPTIONS } };
		const taken = new GraphOptionsAdapter(hostWith(instance)).current();

		(instance.options as Record<string, unknown>).search = "whale";
		expect(taken?.search).toBe("shark");
	});

	it("reports nothing when the core graph plugin is off", () => {
		expect(new GraphOptionsAdapter(hostWith(null)).current()).toBeNull();
	});

	it("reports nothing when the settings are not a record", () => {
		for (const bad of [undefined, null, 42, "text", []]) {
			expect(new GraphOptionsAdapter(hostWith({ options: bad })).current()).toBeNull();
		}
	});

	// A future Obsidian release can drop the hook. That must lose the graph
	// feature and nothing else.
	it("reports nothing when the hook is missing or throws", () => {
		const missing = {} as unknown as App;
		const partial = { internalPlugins: {} } as unknown as App;
		const throwing = {
			internalPlugins: {
				getEnabledPluginById: () => {
					throw new Error("gone");
				},
			},
		} as unknown as App;

		for (const app of [missing, partial, throwing]) {
			expect(new GraphOptionsAdapter(app).current()).toBeNull();
		}
	});
});

describe("apply", () => {
	it("writes the settings and asks core to persist them", async () => {
		let saved = 0;
		const instance: FakeInstance = { options: {}, saveOptions: () => (saved += 1) };

		await new GraphOptionsAdapter(hostWith(instance)).apply(OPTIONS);

		expect(instance.options).toEqual(OPTIONS);
		expect(saved).toBe(1);
	});

	it("copies, so core cannot edit the stored snapshot", async () => {
		const instance: FakeInstance = { options: {} };
		const snapshot = { ...OPTIONS };

		await new GraphOptionsAdapter(hostWith(instance)).apply(snapshot);
		(instance.options as Record<string, unknown>).search = "whale";

		expect(snapshot.search).toBe("shark");
	});

	it("does nothing when the core graph plugin is off", async () => {
		await expect(
			new GraphOptionsAdapter(hostWith(null)).apply(OPTIONS),
		).resolves.toBeUndefined();
	});

	it("survives an instance with no saveOptions", async () => {
		const instance: FakeInstance = { options: {} };
		await new GraphOptionsAdapter(hostWith(instance)).apply(OPTIONS);
		expect(instance.options).toEqual(OPTIONS);
	});
});
