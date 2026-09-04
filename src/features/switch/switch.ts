import { Notice } from "obsidian";
import type { SliceContext } from "../../shared/context";
import type { GraphService } from "../graph";
import type { SaveService } from "../save";
import { SaveOnSwitchModal } from "./ui/SaveOnSwitchModal";

export interface SwitchService {
	switchTo(name: string): void;
	stepBy(delta: number): void;
}

export function createSwitchService(
	ctx: SliceContext,
	graph: GraphService,
	save: SaveService,
): SwitchService {
	/**
	 * Restore the graph before the layout, not after.
	 *
	 * `changeLayout` rebuilds every view, and a new graph view reads the graph
	 * plugin's settings as it loads. Applying them first means the layout
	 * arrives with the right graph and never shows the previous one.
	 */
	const loadWorkspace = async (name: string): Promise<void> => {
		// `canMutate` because the switch below refuses while the core Workspaces
		// plugin is on. Without the check, a refused switch would still leave the
		// graph changed.
		if (graph.isActive() && ctx.registry().canMutate()) {
			const saved = ctx.registry().metaOf(name)?.graph;
			if (saved) await graph.apply(saved);
		}
		await ctx.registry().switchTo(name);
	};

	/** In `changed` mode an unreadable layout counts as changed. See `layoutsDiffer`. */
	const needsPrompt = (current: string): boolean => {
		const mode = ctx.settings().promptOnSwitch;
		if (mode === "never") return false;
		if (mode === "always") return true;
		if (ctx.registry().hasUnsavedChanges(current)) return true;
		return graph.isActive() && graph.hasChanged(ctx.registry().metaOf(current)?.graph);
	};

	const switchNow = (name: string): void => {
		void ctx.attempt(() => loadWorkspace(name));
	};

	/**
	 * Switch, asking first what to do with the layout on screen.
	 *
	 * The prompt exists because core overwrites a workspace only when told to,
	 * so any rearranging done since the last save is otherwise dropped in
	 * silence.
	 */
	const switchTo = (name: string): void => {
		const current = ctx.registry().activeName();
		if (!current || current === name || !needsPrompt(current)) {
			return switchNow(name);
		}

		new SaveOnSwitchModal(ctx.app, {
			current,
			target: name,
			onChoose: (choice) => {
				if (choice === "save-as") return save.promptSaveAs(() => switchNow(name));

				void ctx.attempt(async () => {
					if (choice === "save") await save.saveWorkspace(current);
					await loadWorkspace(name);
				});
			},
		}).open();
	};

	const stepBy = (delta: number): void => {
		const next = ctx.registry().step(delta, {
			tags: [],
			includeArchived: ctx.settings().showArchived,
		});
		if (!next) {
			new Notice("No other workspace to switch to.");
			return;
		}
		switchTo(next);
	};

	return { switchTo, stepBy };
}
