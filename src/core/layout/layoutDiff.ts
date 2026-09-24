import { isRecord, stableText, withoutKeys } from "../shared";

/** Recent files belong to the vault, not to one workspace. */
export const LIVE_ONLY_KEY = "lastOpenFiles";
const STORED_ONLY_KEY = "mtime";

/**
 * The layout shape is private and core can change it without notice, so every
 * doubt answers "changed". A needless prompt costs one click. A missed change
 * loses the panes the user arranged.
 */
export function layoutsDiffer(live: unknown, stored: unknown): boolean {
	if (!isRecord(live) || !isRecord(stored)) return true;

	const ignored = [LIVE_ONLY_KEY, STORED_ONLY_KEY];
	try {
		return (
			stableText(withoutKeys(live, ignored)) !==
			stableText(withoutKeys(stored, ignored))
		);
	} catch {
		return true;
	}
}
