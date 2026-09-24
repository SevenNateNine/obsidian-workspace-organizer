import { layoutsDiffer } from "../layout";
import { defaultMeta, hasAllTags, type WorkspaceMeta } from "../organize";
import { WorkspaceError } from "../shared";
import type { MetaStore } from "../storage";
import type { WorkspacesPort } from "./ports";
import { move, reconcile, renameKey, sortedNames } from "./reconcile";

export interface WorkspaceEntry {
	readonly name: string;
	readonly meta: WorkspaceMeta;
	readonly isActive: boolean;
}

export interface Filter {
	/** A workspace must carry all of these. Empty matches everything. */
	readonly tags: readonly string[];
	readonly includeArchived: boolean;
}

/** Core's workspace names joined to our metadata. Core stays the only writer of the file. */
export class WorkspaceRegistry {
	private metas: Record<string, WorkspaceMeta> = {};

	constructor(
		private readonly core: WorkspacesPort,
		private readonly store: MetaStore,
	) {}

	/** Call before a read. Core fires no change event. */
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

	/** Manager order, archived included. */
	entries(): WorkspaceEntry[] {
		const active = this.activeName();
		return sortedNames(this.metas).map((name) => ({
			name,
			meta: this.metas[name] ?? defaultMeta(),
			isActive: name === active,
		}));
	}

	filtered(filter: Filter): WorkspaceEntry[] {
		return this.entries().filter(
			({ meta }) =>
				(filter.includeArchived || !meta.archived) &&
				hasAllTags(meta.tags, filter.tags),
		);
	}

	metaOf(name: string): WorkspaceMeta | null {
		return this.metas[name] ?? null;
	}

	layoutOf(name: string): unknown {
		return this.core.isAvailable() ? this.core.layoutOf(name) : null;
	}

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

	canMutate(): boolean {
		return this.core.canMutate();
	}

	async save(name: string): Promise<void> {
		this.requireWritable();
		await this.core.save(this.requireName(name));
		await this.refresh();
	}

	async switchTo(name: string): Promise<void> {
		this.requireWritable();
		this.requireExisting(name);
		await this.core.load(name);
	}

	/**
	 * Moves the stored layout as it is. Capturing the screen instead would replace
	 * the panes of a workspace that is not open with the ones on screen.
	 */
	async rename(from: string, to: string): Promise<void> {
		this.requireWritable();
		const clean = this.requireName(to);
		if (clean === from) return;
		this.requireFree(clean);
		const layout = this.requireLayout(from);

		// Deleting the old name clears the active marker, so carry it over.
		const wasActive = this.core.activeName() === from;
		await this.core.saveLayout(clean, layout);
		await this.core.delete(from);
		if (wasActive) await this.core.setActive(clean);

		this.metas = renameKey(this.metas, from, clean);
		await this.persist();
	}

	async duplicate(from: string, to: string): Promise<void> {
		this.requireWritable();
		const clean = this.requireName(to);
		this.requireFree(clean);
		await this.core.saveLayout(clean, this.requireLayout(from));

		const source = this.metas[from];
		await this.refresh();
		if (source) {
			await this.setMeta(clean, { ...source, order: this.metas[clean]?.order ?? 0 });
		}
	}

	async remove(name: string): Promise<void> {
		this.requireWritable();
		this.requireExisting(name);
		await this.core.delete(name);
		await this.refresh();
	}

	async setMeta(name: string, patch: Partial<WorkspaceMeta>): Promise<void> {
		const current = this.metas[name];
		if (!current) throw new WorkspaceError("not-found", name);

		this.metas = { ...this.metas, [name]: { ...current, ...patch } };
		await this.persist();
	}

	async moveBy(name: string, delta: number): Promise<void> {
		this.metas = move(this.metas, name, delta);
		await this.persist();
	}

	/** Wraps around. Steps through what the switcher shows. Null when there is nowhere to go. */
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

	private requireExisting(name: string): void {
		if (!this.core.list().includes(name)) throw new WorkspaceError("not-found", name);
	}

	private requireLayout(name: string): unknown {
		const layout = this.core.layoutOf(name);
		if (layout == null) throw new WorkspaceError("not-found", name);
		return layout;
	}
}
