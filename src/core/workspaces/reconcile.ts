import { defaultMeta, type MetaByName, type WorkspaceMeta } from "../organize";

export interface Reconciled {
	readonly workspaces: Record<string, WorkspaceMeta>;
	/** False means the caller can skip the write. */
	readonly changed: boolean;
}

/**
 * Makes our metadata agree with core's list.
 *
 * Core fires no create, rename, or delete event, and the list can change through
 * a hand edit or a sync. So we derive again from the live names before each read.
 * A gone name loses its metadata. A new name gets defaults after the known ones.
 * `order` is renumbered from 0.
 */
export function reconcile(
	coreNames: readonly string[],
	stored: MetaByName,
): Reconciled {
	const live = new Set(coreNames);
	const known = sortedEntries(stored).filter(([name]) => live.has(name));
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

export function renameKey(
	stored: MetaByName,
	from: string,
	to: string,
): Record<string, WorkspaceMeta> {
	const meta = stored[from];
	if (!meta || from === to) return { ...stored };

	const { [from]: _dropped, ...rest } = stored;
	return { ...rest, [to]: meta };
}

/** Returns the map unchanged when the move falls off either end. */
export function move(
	stored: MetaByName,
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

/** By `order`, then by name, so the result is never arbitrary. */
export function sortedNames(stored: MetaByName): string[] {
	return sortedEntries(stored).map(([name]) => name);
}

function sortedEntries(stored: MetaByName): [string, WorkspaceMeta][] {
	return Object.entries(stored).sort(
		([nameA, a], [nameB, b]) => a.order - b.order || nameA.localeCompare(nameB),
	);
}

function sameMap(a: MetaByName, b: MetaByName): boolean {
	const keysA = Object.keys(a);
	if (keysA.length !== Object.keys(b).length) return false;

	return keysA.every((key) => {
		const left = a[key];
		const right = b[key];
		return left !== undefined && right !== undefined && sameMeta(left, right);
	});
}

function sameMeta(left: WorkspaceMeta, right: WorkspaceMeta): boolean {
	return (
		left.archived === right.archived &&
		left.description === right.description &&
		left.order === right.order &&
		left.tags.length === right.tags.length &&
		left.tags.every((tag, i) => tag === right.tags[i])
	);
}
