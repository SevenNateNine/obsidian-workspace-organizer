import type { Plugin } from "obsidian";
import { migrateData, type DataOwner } from "../../core/storage";

export async function loadPluginData(plugin: Plugin): Promise<DataOwner> {
	let data = migrateData(await plugin.loadData());
	return {
		current: () => data,
		replace: async (next) => {
			data = next;
			await plugin.saveData(next);
		},
	};
}
