import { normalizePath, type App } from "obsidian";
import { WorkspaceError, clone, isRecord } from "../../core/shared";
import {
	emptyWorkspacesFile,
	entryFromLayout,
	parseWorkspacesFile,
	serializeWorkspacesFile,
	type EmbeddedMetaPort,
	type WorkspacesPort,
	type WorkspacesFile,
} from "../../core/workspaces";
import { isCoreWorkspacesEnabled } from "../plugins";

/**
 * The embedded metadata key keeps the name from before the plugin was renamed.
 * A new name would orphan the metadata in every vault that uses embedded storage.
 */
const META_KEY = "extendedWorkspaces";

/**
 * The only writer of `.obsidian/workspaces.json`. It uses documented API only.
 *
 * It refuses to write while the core Workspaces plugin is on. Core writes the
 * same file and caches it in memory, so one of the two loses a workspace with
 * no message.
 */
export class DirectWorkspacesAdapter implements WorkspacesPort, EmbeddedMetaPort {
	private file: WorkspacesFile = emptyWorkspacesFile();
	private coreEnabled = false;

	constructor(private readonly app: App) {}

	private get path(): string {
		return normalizePath(`${this.app.vault.configDir}/workspaces.json`);
	}

	async reload(): Promise<void> {
		const { adapter, configDir } = this.app.vault;
		this.coreEnabled = await isCoreWorkspacesEnabled(adapter, configDir);

		try {
			this.file = (await adapter.exists(this.path))
				? parseWorkspacesFile(await adapter.read(this.path))
				: emptyWorkspacesFile();
		} catch (err) {
			console.error("[workspace-organizer] could not read workspaces.json", err);
			this.file = emptyWorkspacesFile();
		}
	}

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

	/** Only a user action calls this, and that is always after `onLayoutReady`. */
	liveLayout(): unknown {
		return this.app.workspace.getLayout();
	}

	/**
	 * `getLayout` knows nothing of embedded metadata. If the key is dropped,
	 * `reconcile` sees a new workspace and resets its tags and order.
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

	/** The clone stops a later edit to one name from changing the other. */
	async saveLayout(name: string, layout: unknown): Promise<void> {
		this.file.workspaces[name] = clone(layout);
		await this.flush();
	}

	async load(name: string): Promise<void> {
		const entry = this.file.workspaces[name];
		if (entry === undefined) throw new WorkspaceError("not-found", name);

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

	readMeta(): Record<string, unknown> {
		const out: Record<string, unknown> = {};
		for (const [name, entry] of Object.entries(this.file.workspaces)) {
			const meta = isRecord(entry) ? entry[META_KEY] : undefined;
			if (meta !== undefined) out[name] = meta;
		}
		return out;
	}

	/** An entry with no metadata loses the key, so turning this mode off leaves the file clean. */
	async writeMeta(raw: Record<string, unknown>): Promise<void> {
		for (const [name, entry] of Object.entries(this.file.workspaces)) {
			if (!isRecord(entry)) continue;
			const meta = raw[name];
			if (meta === undefined) delete entry[META_KEY];
			else entry[META_KEY] = meta;
		}
		await this.flush();
	}

	/** Every caller has a guard already. The check here is the last defense. */
	private async flush(): Promise<void> {
		if (this.coreEnabled) throw new WorkspaceError("core-conflict");
		await this.app.vault.adapter.write(this.path, serializeWorkspacesFile(this.file));
	}
}
