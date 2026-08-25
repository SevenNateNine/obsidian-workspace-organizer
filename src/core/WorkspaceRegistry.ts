import { WorkspaceError } from "./errors";
import type { MetaStore, WorkspacesPort } from "./ports";
import { layoutsDiffer } from "./domain/layoutDiff";
import { move, reconcile, renameKey, sortedNames } from "./domain/reconcile";
import { hasAllTags } from "./domain/tags";
import { defaultMeta, type WorkspaceMeta } from "./domain/types";

export interface WorkspaceEntry {
	name: string;
	meta: WorkspaceMeta;
	isActive: boolean;
}

export interface Filter {
	/** A workspace must carry all of these. Empty matches everything. */
	tags: string[];
	includeArchived: boolean;
}

/**
 * The plugin's view of the workspace list: core's names joined to our metadata.
 *
 * Policy only. It talks to core and to storage through ports, so the whole of
 * it is exercised in tests with fakes, and none of the Obsidian API reaches it.
 *
 * Every mutation goes through core, which stays the only writer of
 * `workspaces.json`.
 */
export class WorkspaceRegistry {
	private metas: Record<string, WorkspaceMeta> = {};

	constructor(
		private readonly core: WorkspacesPort,
		private readonly store: MetaStore,
	) {}

	/**
	 * Re-derive metadata from core's current list.
	 *
	 * Call before any read. Core fires no change events, so this is the only
	 * thing keeping us honest when a workspace is created or deleted elsewhere.
	 */
	async refresh(): Promise<void> {
		if (!this.core.isAvailable()) {
			this.metas = {};
			return;
		}

		const { workspaces, changed } = reconcile(
			this.core.list(),
			await this.store.read(),
		);
		this.metas = workspaces;
		if (changed) await this.store.write(workspaces);
	}

	/** Every workspace in manager order, archived ones included. */
	entries(): WorkspaceEntry[] {
		const active = this.core.isAvailable() ? this.core.activeName() : null;

		return sortedNames(this.metas).map((name) => ({
			name,
			meta: this.metas[name] ?? defaultMeta(),
			isActive: name === active,
		}));
	}

	/** What the switcher shows. */
	filtered(filter: Filter): WorkspaceEntry[] {
		return this.entries().filter(
			(entry) =>
				(filter.includeArchived || !entry.meta.archived) &&
				hasAllTags(entry.meta.tags, filter.tags),
		);
	}

	metaOf(name: string): WorkspaceMeta | null {
		return this.metas[name] ?? null;
	}

	layoutOf(name: string): unknown {
		return this.core.isAvailable() ? this.core.layoutOf(name) : null;
	}

	/** True when the layout on screen differs from what `name` holds. */
	hasUnsavedChanges(name: string): boolean {
		if (!this.core.isAvailable()) return true;
		return layoutsDiffer(this.core.liveLayout(), this.core.layoutOf(name));
	}

	activeName(): string | null {
		return this.core.isAvailable() ? this.core.activeName() : null;
	}

	isAvailable(): boolean {
		return this.core.isAvailable();
	}

	/**
	 * False when the list is readable but must not be changed, which is what
	 * happens while the core Workspaces plugin is also running.
	 */
	canMutate(): boolean {
		return this.core.canMutate();
	}

	/** Save the live layout under `name`, creating it or overwriting it. */
	async save(name: string): Promise<void> {
		this.requireWritable();
		const clean = this.requireName(name);
		await this.core.save(clean);
		await this.refresh();
	}

	async switchTo(name: string): Promise<void> {
		this.requireWritable();
		if (!this.core.list().includes(name)) throw new WorkspaceError("not-found", name);
		await this.core.load(name);
	}

	/**
	 * Rename by copying the stored layout to the new name and dropping the old.
	 *
	 * The layout is moved as-is rather than re-captured from the screen, so
	 * renaming a workspace you are not currently in does not quietly replace its
	 * panes with the ones in front of you.
	 */
	async rename(from: string, to: string): Promise<void> {
		this.requireWritable();
		const clean = this.requireName(to);
		if (clean === from) return;
		this.requireFree(clean);

		const layout = this.core.layoutOf(from);
		if (layout == null) throw new WorkspaceError("not-found", from);

		// Deleting the old name clears the active marker when it pointed there,
		// so carry it over rather than leaving nothing active.
		const wasActive = this.core.activeName() === from;

		await this.core.saveLayout(clean, layout);
		await this.core.delete(from);
		if (wasActive) await this.core.setActive(clean);

		this.metas = renameKey(this.metas, from, clean);
		await this.persist();
	}

	/** Copy a workspace, tags and description included. */
	async duplicate(from: string, to: string): Promise<void> {
		this.requireWritable();
		const clean = this.requireName(to);
		this.requireFree(clean);

		const layout = this.core.layoutOf(from);
		if (layout == null) throw new WorkspaceError("not-found", from);

		await this.core.saveLayout(clean, layout);

		const source = this.metas[from];
		await this.refresh();
		if (source)
			await this.setMeta(clean, { ...source, order: this.metas[clean]?.order ?? 0 });
	}

	async remove(name: string): Promise<void> {
		this.requireWritable();
		if (!this.core.list().includes(name)) throw new WorkspaceError("not-found", name);

		await this.core.delete(name);
		await this.refresh();
	}

	async setMeta(name: string, patch: Partial<WorkspaceMeta>): Promise<void> {
		const current = this.metas[name];
		if (!current) throw new WorkspaceError("not-found", name);

		this.metas = { ...this.metas, [name]: { ...current, ...patch } };
		await this.persist();
	}

	/** Move a workspace up or down the manager list. */
	async moveBy(name: string, delta: number): Promise<void> {
		this.metas = move(this.metas, name, delta);
		await this.persist();
	}

	/**
	 * The next or previous workspace, wrapping around.
	 *
	 * Steps through what the switcher would show, so a tag filter narrows the
	 * hotkeys too. Null when there is nowhere to go.
	 */
	step(delta: number, filter: Filter): string | null {
		const names = this.filtered(filter).map((entry) => entry.name);
		if (names.length === 0) return null;

		const active = this.activeName();
		const at = active ? names.indexOf(active) : -1;
		const next = (((at + delta) % names.length) + names.length) % names.length;
		return names[next] ?? null;
	}

	private async persist(): Promise<void> {
		await this.store.write(this.metas);
	}

	private requireWritable(): void {
		if (!this.core.canMutate()) throw new WorkspaceError("core-conflict");
	}

	private requireName(name: string): string {
		const clean = name.trim();
		if (!clean) throw new WorkspaceError("empty-name");
		return clean;
	}

	private requireFree(name: string): void {
		if (this.core.list().includes(name)) throw new WorkspaceError("name-taken", name);
	}
}
