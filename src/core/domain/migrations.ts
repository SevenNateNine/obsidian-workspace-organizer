import {
	CURRENT_SCHEMA_VERSION,
	DEFAULT_SETTINGS,
	type PersistedData,
	type PluginSettings,
} from "./PluginSettings";
import { defaultMeta, type WorkspaceMeta } from "./meta";
import {
	GRAPH_MODES,
	STATUS_BAR_ACTIONS,
	STORAGE_MODES,
	SWITCH_PROMPTS,
	type GraphMode,
	type StatusBarAction,
	type StorageMode,
	type SwitchPrompt,
} from "./vocabulary";
import { dedupe, normalizeTag } from "./tags";
import { isRecord } from "../../shared/domain/util";

/**
 * Bring persisted data up to the current schema.
 *
 * Obsidian returns whatever the last version of this plugin wrote, which can be
 * older than this build, and a user can edit the file by hand. Everything here
 * treats the input as untrusted and merges onto known-good defaults.
 */
export function migrateData(raw: unknown): PersistedData {
	const data = isRecord(raw) ? raw : {};

	return {
		schemaVersion: CURRENT_SCHEMA_VERSION,
		settings: migrateSettings(data.settings),
		workspaces: normalizeMetaMap(data.workspaces),
	};
}

function migrateSettings(raw: unknown): PluginSettings {
	const stored = isRecord(raw) ? raw : {};
	const statusBar = isRecord(stored.statusBar) ? stored.statusBar : {};

	// Pulled out of the spread so the renamed key does not linger in `data.json`
	// beside the one that replaced it.
	const { saveGraphSettings: legacyGraph, ...rest } = stored;

	return {
		...DEFAULT_SETTINGS,
		...rest,
		storage: oneOf<StorageMode>(
			stored.storage,
			STORAGE_MODES,
			DEFAULT_SETTINGS.storage,
		),
		promptOnSwitch: switchPrompt(
			stored.promptOnSwitch,
			DEFAULT_SETTINGS.promptOnSwitch,
		),
		graphSettings: graphMode(
			stored.graphSettings,
			legacyGraph,
			DEFAULT_SETTINGS.graphSettings,
		),
		showArchived: bool(stored.showArchived, DEFAULT_SETTINGS.showArchived),
		// A zero or negative count would render a preview with no names at all.
		previewNameCount: clamp(
			stored.previewNameCount,
			1,
			8,
			DEFAULT_SETTINGS.previewNameCount,
		),
		statusBar: {
			enabled: bool(statusBar.enabled, DEFAULT_SETTINGS.statusBar.enabled),
			click: action(statusBar.click, DEFAULT_SETTINGS.statusBar.click),
			middleClick: action(
				statusBar.middleClick,
				DEFAULT_SETTINGS.statusBar.middleClick,
			),
			rightClick: action(statusBar.rightClick, DEFAULT_SETTINGS.statusBar.rightClick),
		},
	};
}

export function normalizeMetaMap(raw: unknown): Record<string, WorkspaceMeta> {
	if (!isRecord(raw)) return {};

	const out: Record<string, WorkspaceMeta> = {};
	for (const [name, meta] of Object.entries(raw)) {
		if (name) out[name] = normalizeMeta(meta);
	}
	return out;
}

/**
 * Coerce one stored entry into a usable `WorkspaceMeta`.
 *
 * Also used by the embedded store, where the value comes out of
 * `workspaces.json` and may have been written by a different plugin version.
 */
export function normalizeMeta(raw: unknown): WorkspaceMeta {
	const stored = isRecord(raw) ? raw : {};
	const fallback = defaultMeta();

	const meta: WorkspaceMeta = {
		tags: normalizeTags(stored.tags),
		archived: bool(stored.archived, fallback.archived),
		description: typeof stored.description === "string" ? stored.description : "",
		// Order is authoritative only after `reconcile` renumbers it.
		order: clamp(stored.order, 0, Number.MAX_SAFE_INTEGER, fallback.order),
	};

	// The key is omitted rather than set to undefined, for
	// `exactOptionalPropertyTypes`. The contents stay opaque, because the shape
	// belongs to core.
	if (isRecord(stored.graph)) meta.graph = stored.graph;

	return meta;
}

function normalizeTags(raw: unknown): string[] {
	if (!Array.isArray(raw)) return [];
	return dedupe(
		raw
			.filter((tag): tag is string => typeof tag === "string")
			.map(normalizeTag)
			.filter(Boolean),
	);
}

/** A build before the three modes wrote a boolean here. */
function switchPrompt(value: unknown, fallback: SwitchPrompt): SwitchPrompt {
	if (value === true) return "always";
	if (value === false) return "never";
	return oneOf<SwitchPrompt>(value, SWITCH_PROMPTS, fallback);
}

/**
 * A build before the three modes wrote a boolean under `saveGraphSettings`.
 *
 * On becomes `auto` rather than `always`, so an upgrade picks up the standing
 * aside behaviour instead of keeping the double write it was written before.
 */
function graphMode(value: unknown, legacy: unknown, fallback: GraphMode): GraphMode {
	if (GRAPH_MODES.includes(value as GraphMode)) return value as GraphMode;
	if (typeof legacy === "boolean") return legacy ? "auto" : "never";
	return fallback;
}

function action(value: unknown, fallback: StatusBarAction): StatusBarAction {
	return oneOf<StatusBarAction>(value, STATUS_BAR_ACTIONS, fallback);
}

function oneOf<T extends string>(value: unknown, allowed: T[], fallback: T): T {
	return allowed.includes(value as T) ? (value as T) : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
	if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
	return Math.min(max, Math.max(min, Math.round(value)));
}
