import type { DataAdapter } from "obsidian";

/**
 * Which plugins Obsidian has turned on.
 *
 * Read from `core-plugins.json` and `community-plugins.json` rather than from
 * `app.internalPlugins` or `app.plugins`, so this stays on documented API. Those
 * objects are not part of the public API and can change in any release.
 */

const CORE_WORKSPACES_ID = "workspaces";

/**
 * Report whether the core Workspaces plugin is turned on.
 *
 * This plugin writes `workspaces.json` itself. Core writes the same file and
 * caches it in memory, so with both running the two overwrite each other and a
 * workspace disappears without a message. We refuse to write while core is on,
 * which needs this check.
 */
export async function isCoreWorkspacesEnabled(
	adapter: DataAdapter,
	configDir: string,
): Promise<boolean> {
	const ids = await enabledIds(adapter, `${configDir}/core-plugins.json`);
	return ids.includes(CORE_WORKSPACES_ID);
}

/**
 * The ids of every enabled community plugin.
 *
 * Used to notice another plugin that owns the graph settings, see
 * `core/domain/graphOwners.ts`. Read again at each decision point rather than
 * cached, because Obsidian fires no documented event when a plugin is turned on
 * or off, and the file is tiny.
 */
export async function enabledCommunityPluginIds(
	adapter: DataAdapter,
	configDir: string,
): Promise<string[]> {
	return enabledIds(adapter, `${configDir}/community-plugins.json`);
}

async function enabledIds(adapter: DataAdapter, path: string): Promise<string[]> {
	try {
		if (!(await adapter.exists(path))) return [];
		return parseEnabledIds(await adapter.read(path));
	} catch {
		// An unreadable file must not stop the plugin from working. An empty list
		// means "nothing enabled", which is the permissive answer in both callers:
		// writes stay allowed, and the graph setting stays on.
		return [];
	}
}

/**
 * Obsidian has written two shapes over time: an array of enabled ids, and an
 * object of id to boolean. Accept both.
 */
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
