import type { SliceContext } from "../../shared/context";
import { ConfirmModal, PromptModal } from "../../shared/ui/prompts";

/** Every action asks first, then reports one failure. */
export function createManageActions(ctx: SliceContext): {
	promptRename(name: string, after?: () => void): void;
	promptDuplicate(name: string, after?: () => void): void;
	promptDelete(name: string, after?: () => void): void;
} {
	return {
		promptRename: (name, after) => {
			new PromptModal(ctx.app, {
				title: `Rename "${name}"`,
				initial: name,
				cta: "Rename",
				onSubmit: (next) =>
					void ctx.attempt(async () => {
						await ctx.registry().rename(name, next);
						after?.();
					}),
			}).open();
		},

		promptDuplicate: (name, after) => {
			new PromptModal(ctx.app, {
				title: `Duplicate "${name}"`,
				initial: `${name} copy`,
				cta: "Duplicate",
				onSubmit: (next) =>
					void ctx.attempt(async () => {
						await ctx.registry().duplicate(name, next);
						after?.();
					}),
			}).open();
		},

		promptDelete: (name, after) => {
			new ConfirmModal(ctx.app, {
				title: `Delete "${name}"`,
				message: "The saved layout is removed. Open notes are not affected.",
				cta: "Delete",
				onConfirm: () =>
					void ctx.attempt(async () => {
						await ctx.registry().remove(name);
						after?.();
					}),
			}).open();
		},
	};
}
