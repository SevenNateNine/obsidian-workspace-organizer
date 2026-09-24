import {
	SUBTITLES,
	dedupe,
	defaultMeta,
	storedTag,
	type WorkspaceMeta,
} from "../organize";
import {
	DEFAULT_SETTINGS,
	PREVIEW_NAME_COUNT,
	STATUS_BAR_ACTIONS,
	STORAGE_MODES,
	SWITCH_PROMPTS,
	type PluginSettings,
	type StatusBarAction,
	type SwitchPrompt,
} from "../settings";
import { isRecord } from "../shared";
import { CURRENT_SCHEMA_VERSION, type PersistedData } from "./PersistedData";

/**
 * `data.json` can come from an older build or from a hand edit. Treat it as
 * untrusted and merge it onto known-good defaults.
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
	const defaults = DEFAULT_SETTINGS;

	return {
		...defaults,
		// Also keeps `graphSettings` and `saveGraphSettings` of the removed graph feature, for a possible return.
		...stored,
		storage: oneOf(stored.storage, STORAGE_MODES, defaults.storage),
		promptOnSwitch: switchPrompt(stored.promptOnSwitch, defaults.promptOnSwitch),
		showArchived: bool(stored.showArchived, defaults.showArchived),
		// Zero or less would render a preview with no names.
		previewNameCount: clamp(
			stored.previewNameCount,
			PREVIEW_NAME_COUNT.min,
			PREVIEW_NAME_COUNT.max,
			defaults.previewNameCount,
		),
		statusBar: migrateStatusBar(stored.statusBar),
	};
}

function migrateStatusBar(raw: unknown): PluginSettings["statusBar"] {
	const stored = isRecord(raw) ? raw : {};
	const defaults = DEFAULT_SETTINGS.statusBar;
	return {
		enabled: bool(stored.enabled, defaults.enabled),
		click: action(stored.click, defaults.click),
		middleClick: action(stored.middleClick, defaults.middleClick),
		rightClick: action(stored.rightClick, defaults.rightClick),
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

/** Also reads embedded metadata, which another plugin version can have written. */
export function normalizeMeta(raw: unknown): WorkspaceMeta {
	const stored = isRecord(raw) ? raw : {};
	const fallback = defaultMeta();

	const meta: WorkspaceMeta = {
		tags: normalizeTags(stored.tags),
		archived: bool(stored.archived, fallback.archived),
		description: typeof stored.description === "string" ? stored.description : "",
		// Only `reconcile` makes the order authoritative.
		order: clamp(stored.order, 0, Number.MAX_SAFE_INTEGER, fallback.order),
		// Omitted rather than undefined, for `exactOptionalPropertyTypes`.
		...(isOneOf(stored.subtitle, SUBTITLES) ? { subtitle: stored.subtitle } : {}),
	};

	// The graph feature is removed. Keep its snapshot opaque, so a return finds it.
	return isRecord(stored.graph) ? { ...meta, graph: stored.graph } : meta;
}

function normalizeTags(raw: unknown): string[] {
	if (!Array.isArray(raw)) return [];
	return dedupe(
		raw
			.filter((tag): tag is string => typeof tag === "string")
			.map(storedTag)
			.filter(Boolean),
	);
}

/** An older build wrote a boolean here. */
function switchPrompt(value: unknown, fallback: SwitchPrompt): SwitchPrompt {
	if (value === true) return "always";
	if (value === false) return "never";
	return oneOf(value, SWITCH_PROMPTS, fallback);
}

function action(value: unknown, fallback: StatusBarAction): StatusBarAction {
	return oneOf(value, STATUS_BAR_ACTIONS, fallback);
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
	return allowed.includes(value as T);
}

function oneOf<T extends string>(
	value: unknown,
	allowed: readonly T[],
	fallback: T,
): T {
	return isOneOf(value, allowed) ? value : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
	if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
	return Math.min(max, Math.max(min, Math.round(value)));
}
