import { normalizePath, type App } from "obsidian";
import type { WorkspacesPort, EmbeddedMetaPort } from "../domain/workspace/ports";
import { WorkspaceError } from "../domain/errors";
import { clone, isRecord } from "../domain/util";
import {
	EMPTY_FILE,
	entryFromLayout,
	parseWorkspacesFile,
	serializeWorkspacesFile,
	type WorkspacesFile,
} from "../domain/workspace/workspaceFile";
import { isCoreWorkspacesEnabled } from "./pluginState";

/** The key this plugin adds to an entry in embedded storage mode. */
const META_KEY = "extendedWorkspaces";

/**
 * Reads and writes `.obsidian/workspaces.json` directly.
 *
 * This replaces the core Workspaces plugin rather than wrapping it, and uses
 * only documented API: `getLayout` and `changeLayout` for the live layout, and
 * the vault adapter for the file. Nothing here depends on `internalPlugins`,
 * so no undocumented shape can break it.
 *
 * The file format lives in `core/domain/workspaceFile.ts` and is tested against
 * a real core-written file.
 *
 * Core must be turned off. Both plugins writing the same file, which core also
 * caches in memory, loses a workspace with no message. `canMutate` reports
 * whether that is the case, and `flush` refuses as a last line of defence.
 */
export class DirectWorkspacesAdapter implements WorkspacesPort, EmbeddedMetaPort {
	private file: WorkspacesFile = { ...EMPTY_FILE };
	private coreEnabled = false;

	constructor(private readonly app: App) {}

	private get path(): string {
		return normalizePath(`${this.app.vault.configDir}/workspaces.json`);
	}

	/**
	 * Re-read the file and the core plugin state.
	 *
	 * Called before a read, because the vault can be synced from another device
	 * or edited by hand while the plugin is running.
	 */
	async reload(): Promise<void> {
		this.coreEnabled = await isCoreWorkspacesEnabled(
			this.app.vault.adapter,
			this.app.vault.configDir,
		);

		try {
			const adapter = this.app.vault.adapter;
			this.file = (await adapter.exists(this.path))
				? parseWorkspacesFile(await adapter.read(this.path))
				: { ...EMPTY_FILE };
		} catch (err) {
			console.error("[workspace-organizer] could not read workspaces.json", err);
			this.file = { ...EMPTY_FILE };
		}
	}

	/** True when core is on, which means this plugin must not write. */
	isBlockedByCore(): boolean {
		return this.coreEnabled;
	}

	isAvailable(): boolean {
		return true;
	}

	canMutate(): boolean {
		return !this.coreEnabled;
	}

	list(): string[] {
		return Object.keys(this.file.workspaces);
	}

	activeName(): string | null {
		return this.file.active;
	}

	layoutOf(name: string): unknown {
		return this.file.workspaces[name] ?? null;
	}

	/** Only called from a user action, which is always after `onLayoutReady`. */
	liveLayout(): unknown {
		return this.app.workspace.getLayout();
	}

	/**
	 * Capture what is on screen now and store it under `name`.
	 *
	 * Embedded metadata lives on the entry, and `getLayout` cannot know about it.
	 * Dropping the key here makes `reconcile` treat the workspace as newly seen,
	 * which resets its tags, description, archived flag, and order. Carry it over.
	 */
	async save(name: string): Promise<void> {
		const previous = this.file.workspaces[name];
		const carried = isRecord(previous) ? previous[META_KEY] : undefined;

		const entry = entryFromLayout(this.app.workspace.getLayout(), new Date());
		if (carried !== undefined) entry[META_KEY] = carried;

		this.file.workspaces[name] = entry;
		this.file.active = name;
		await this.flush();
	}

	/**
	 * Store a layout we already hold, for rename and duplicate.
	 *
	 * The clone matters: sharing one object between two names would make a later
	 * edit to either silently change both.
	 */
	async saveLayout(name: string, layout: unknown): Promise<void> {
		this.file.workspaces[name] = clone(layout);
		await this.flush();
	}

	async load(name: string): Promise<void> {
		const entry = this.file.workspaces[name];
		if (entry === undefined) throw new WorkspaceError("not-found", name);

		// Cloned so that applying the layout cannot mutate what we hold.
		await this.app.workspace.changeLayout(clone(entry));
		this.file.active = name;
		await this.flush();
	}

	async delete(name: string): Promise<void> {
		delete this.file.workspaces[name];
		if (this.file.active === name) this.file.active = null;
		await this.flush();
	}

	async setActive(name: string | null): Promise<void> {
		this.file.active = name && name in this.file.workspaces ? name : null;
		await this.flush();
	}

	// --- embedded storage mode -------------------------------------------

	readMeta(): Record<string, unknown> {
		const out: Record<string, unknown> = {};

		for (const [name, entry] of Object.entries(this.file.workspaces)) {
			const meta = isRecord(entry) ? entry[META_KEY] : undefined;
			if (meta !== undefined) out[name] = meta;
		}
		return out;
	}

	/**
	 * An entry with no metadata has the key removed rather than set to an empty
	 * object, so turning this mode off leaves the file clean.
	 */
	async writeMeta(raw: Record<string, unknown>): Promise<void> {
		for (const [name, entry] of Object.entries(this.file.workspaces)) {
			if (!isRecord(entry)) continue;
			const meta = raw[name];
			if (meta === undefined) delete entry[META_KEY];
			else entry[META_KEY] = meta;
		}
		await this.flush();
	}

	/**
	 * Write the file.
	 *
	 * Refuses while core is on. Every caller is guarded already, so reaching
	 * here means a guard was missed, and the cost of that is a lost workspace.
	 */
	private async flush(): Promise<void> {
		if (this.coreEnabled) throw new WorkspaceError("core-conflict");
		await this.app.vault.adapter.write(this.path, serializeWorkspacesFile(this.file));
	}
}
