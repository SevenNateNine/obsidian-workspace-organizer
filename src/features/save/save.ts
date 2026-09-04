import { Notice } from "obsidian";
import type { SliceContext } from "../../shared/context";
import { PromptModal } from "../../shared/ui/prompts";
import type { GraphService } from "../graph";

/** What the switch slice needs from this one, and nothing more. */
export interface SaveService {
	saveWorkspace(name: string): Promise<void>;
	/** Save over the active workspace, or ask for a name when there is none. */
	saveActive(): Promise<void>;
	promptSaveAs(after?: () => void): void;
}

export function createSaveService(ctx: SliceContext, graph: GraphService): SaveService {
	/**
	 * Save the layout, and the graph settings that the layout cannot hold.
	 *
	 * The graph goes in through `setMeta` after the layout, because a workspace
	 * has to exist before it can carry metadata.
	 */
	const saveWorkspace = async (name: string): Promise<void> => {
		await ctx.registry().save(name);
		if (!graph.isActive()) return;

		const options = graph.current();
		if (options) await ctx.registry().setMeta(name, { graph: options });
	};

	const promptSaveAs = (after?: () => void): void => {
		new PromptModal(ctx.app, {
			title: "Save layout as",
			placeholder: "Workspace name",
			cta: "Save",
			onSubmit: (name) =>
				void ctx.attempt(async () => {
					await saveWorkspace(name);
					new Notice(`Saved "${name}".`);
					after?.();
				}),
		}).open();
	};

	const saveActive = async (): Promise<void> => {
		const active = ctx.registry().activeName();
		if (!active) return promptSaveAs();

		await ctx.attempt(async () => {
			await saveWorkspace(active);
			new Notice(`Saved "${active}".`);
		});
	};

	return { saveWorkspace, saveActive, promptSaveAs };
}
