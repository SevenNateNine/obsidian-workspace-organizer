import type { DataAdapter } from "obsidian";

// Read from the config files, not from `app.internalPlugins` or `app.plugins`,
// which are not public API and can change in any release.

const CORE_WORKSPACES_ID = "workspaces";

export async function isCoreWorkspacesEnabled(
	adapter: DataAdapter,
	configDir: string,
): Promise<boolean> {
	const ids = await enabledIds(adapter, `${configDir}/core-plugins.json`);
	return ids.includes(CORE_WORKSPACES_ID);
}

async function enabledIds(adapter: DataAdapter, path: string): Promise<string[]> {
	try {
		if (!(await adapter.exists(path))) return [];
		return parseEnabledIds(await adapter.read(path));
	} catch {
		// An empty list is the permissive answer: writes stay allowed.
		return [];
	}
}

/** Obsidian has written an array of ids and an object of id to boolean. */
export function parseEnabledIds(raw: string): string[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return [];
	}

	if (Array.isArray(parsed)) {
		return parsed.filter((id): id is string => typeof id === "string");
	}
	if (typeof parsed === "object" && parsed !== null) {
		// Only an explicit true counts, so a truthy string cannot enable a plugin.
		return Object.entries(parsed as Record<string, unknown>)
			.filter(([, on]) => on === true)
			.map(([id]) => id);
	}
	return [];
}
