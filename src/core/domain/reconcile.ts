import { defaultMeta, type WorkspaceMeta } from "./types";

export interface Reconciled {
	workspaces: Record<string, WorkspaceMeta>;
	/** False means the caller can skip the write. */
	changed: boolean;
}

/**
 * Make our metadata agree with core's workspace list.
 *
 * Core fires no create, rename, or delete event, and the user can change the
 * list without us: through core's own switcher, by hand-editing
 * `workspaces.json`, or by syncing the vault from another device. So rather
 * than watch for changes, we re-derive from the live names whenever we are
 * about to read.
 *
 * - A name core no longer has loses its metadata.
 * - A name we have never seen gets defaults, appended after the known ones.
 * - `order` is renumbered contiguously from 0, preserving relative order.
 */
export function reconcile(
	coreNames: readonly string[],
	stored: Readonly<Record<string, WorkspaceMeta>>,
): Reconciled {
	const live = new Set(coreNames);

	const known = Object.entries(stored)
		.filter(([name]) => live.has(name))
		.sort(([nameA, a], [nameB, b]) => a.order - b.order || nameA.localeCompare(nameB));

	const seen = new Set(known.map(([name]) => name));
	const added = coreNames
		.filter((name) => !seen.has(name))
		.sort((a, b) => a.localeCompare(b));

	const workspaces: Record<string, WorkspaceMeta> = {};
	let order = 0;
	for (const [name, meta] of known) workspaces[name] = { ...meta, order: order++ };
	for (const name of added) workspaces[name] = defaultMeta(order++);

	return { workspaces, changed: !sameMap(stored, workspaces) };
}

/** Move one workspace's metadata to a new name, for rename. */
export function renameKey(
	stored: Readonly<Record<string, WorkspaceMeta>>,
	from: string,
	to: string,
): Record<string, WorkspaceMeta> {
	const meta = stored[from];
	if (!meta || from === to) return { ...stored };

	const { [from]: _dropped, ...rest } = stored;
	return { ...rest, [to]: meta };
}

/**
 * Move a workspace up or down in the manager.
 *
 * Returns the map unchanged when the move would fall off either end, so the
 * caller can skip a pointless write.
 */
export function move(
	stored: Readonly<Record<string, WorkspaceMeta>>,
	name: string,
	delta: number,
): Record<string, WorkspaceMeta> {
	const names = sortedNames(stored);
	const from = names.indexOf(name);
	const to = from + delta;
	if (from < 0 || to < 0 || to >= names.length) return { ...stored };

	names.splice(to, 0, ...names.splice(from, 1));

	const out: Record<string, WorkspaceMeta> = {};
	for (const [order, moved] of names.entries()) {
		const meta = stored[moved];
		if (meta) out[moved] = { ...meta, order };
	}
	return out;
}

/** Manager order: by `order`, then by name so the result is never arbitrary. */
export function sortedNames(stored: Readonly<Record<string, WorkspaceMeta>>): string[] {
	return Object.entries(stored)
		.sort(([nameA, a], [nameB, b]) => a.order - b.order || nameA.localeCompare(nameB))
		.map(([name]) => name);
}

function sameMap(
	a: Readonly<Record<string, WorkspaceMeta>>,
	b: Readonly<Record<string, WorkspaceMeta>>,
): boolean {
	const keysA = Object.keys(a);
	if (keysA.length !== Object.keys(b).length) return false;

	return keysA.every((key) => {
		const left = a[key];
		const right = b[key];
		return (
			left !== undefined &&
			right !== undefined &&
			left.archived === right.archived &&
			left.description === right.description &&
			left.order === right.order &&
			left.tags.length === right.tags.length &&
			left.tags.every((tag, i) => tag === right.tags[i])
		);
	});
}
