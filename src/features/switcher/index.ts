/**
 * Finding a workspace by name or by tag.
 *
 * Chooses a workspace and then hands the name to the switch slice through
 * `ctx.actions`, so it never needs to know how switching works.
 */

import type { SliceContext } from "../../shared/context";
import { SwitcherModal } from "./ui/SwitcherModal";
import { switcherSection } from "./ui/switcherSection";

export function registerSwitcher(ctx: SliceContext): void {
	const openSwitcher = (): void => {
		void ctx.attempt(async () => {
			// Reload first: the vault can be synced from another device or edited
			// by hand while the plugin is running.
			await ctx.reload();
			new SwitcherModal(ctx).open();
		});
	};

	ctx.actions.openSwitcher = openSwitcher;

	ctx.plugin.addCommand({
		id: "open-switcher",
		name: "Open workspace switcher",
		callback: openSwitcher,
	});

	ctx.addSection({
		order: 30,
		render: (container) => switcherSection(ctx, container),
	});
}
