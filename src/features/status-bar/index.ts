/**
 * The active workspace in the status bar, and the menu behind it.
 *
 * This slice starts work in five others and owns none of it. Every branch goes
 * through `ctx.actions`, which is the whole reason that hub exists. It
 * registers last, so every action it dispatches is already filled in.
 */

import type { SliceContext } from "../../shared/context";
import { StatusBar } from "./ui/StatusBar";
import { statusBarSection } from "./ui/statusBarSection";
import { buildMenu, run } from "./run";

export function registerStatusBar(ctx: SliceContext): void {
	const statusBar = new StatusBar(ctx.plugin.addStatusBarItem(), {
		settings: () => ctx.settings().statusBar,
		activeName: () => ctx.registry().activeName(),
		run: (action) => run(ctx, action),
		buildMenu: (menu) => buildMenu(ctx, menu),
	});

	ctx.onRepaint(() => statusBar.render());
	statusBar.render();

	ctx.addSection({
		order: 40,
		render: (container, redraw) => statusBarSection(ctx, container, redraw),
	});
}
