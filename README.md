# Workspace Organizer

Obsidian's core Workspaces plugin saves layouts but gives you nothing to organize them with: no
tags, no archive, no ordering, and a picker that only matches on name. Past a handful of
workspaces that stops scaling.

This plugin adds the organizing layer. Tag workspaces, archive the ones you are not using, put
them in the order you want, and find any of them by name, tag, or description.

It **replaces** the core Workspaces plugin, but keeps its file. Your workspaces stay in the same
`.obsidian/workspaces.json`, in the same format, byte for byte — so nothing is trapped here. Turn this
plugin off and turn core back on, and your workspaces are exactly where they were.

It uses documented Obsidian API everywhere except the graph settings snapshot. Obsidian keeps those
settings outside the layout, so that one file reaches the core graph plugin. A future Obsidian release
can only turn the graph feature off, not break the rest.

## Organizing

| Feature        | What it does                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| Tags           | Group workspaces however you think about them, then filter the switcher by tag.                         |
| Archive        | A reserved tag that keeps a workspace out of sight without deleting it. It stays in the manager.        |
| Order          | Arrange the list yourself. Next and previous step through it and skip archived workspaces.              |
| Descriptions   | Your own note on what a workspace is for, shown in the switcher.                                        |
| Switcher       | Fuzzy search over names, tags, and descriptions.                                                        |
| Layout preview | A generated descriptor for workspaces you never described: `5 tabs, 2 splits · Chapter 1, Outline, +3`. |
| Manager        | Reorder, rename, duplicate, archive, delete, and edit tags, all in settings.                            |

## Everything else

| Feature         | What it does                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Non-destructive | Builds on `.obsidian/workspaces.json`, so installing and uninstalling leaves your workspaces untouched.                          |
| Status bar      | Shows the active workspace, with configurable left, middle, and right click actions.                                             |
| Switch prompt   | Offer to save the layout before switching away: always, only when the layout changed, or never.                                  |
| Graph settings  | Carries the graph search, filters, colour groups, and forces with each workspace, which Obsidian itself keeps global. See below. |

## Commands

| Command                                     | Default hotkey |
| ------------------------------------------- | -------------- |
| Open workspace switcher                     | none           |
| Save current layout to the active workspace | none           |
| Save current layout as a new workspace…     | none           |
| Switch to next workspace                    | none           |
| Switch to previous workspace                | none           |

Assign hotkeys under Settings, Hotkeys. Next and previous step through the switcher's order and skip archived workspaces.

## Graph settings

Obsidian holds one global set of graph settings, so a saved layout cannot carry them. This plugin
can store them per workspace and apply them on a switch — but it applies them globally, which means
one set of settings for every graph pane in the workspace.

Plugins that own the graph directly do this better, per pane. So the setting has three modes:

- **Automatic** (default) — save graph settings with workspaces, unless a plugin that owns the graph
  is enabled. Right now that means [Graph Profiles](https://github.com/SevenNateNine/obsidian-graph-profiles),
  Graph Presets, or Extended Graph. Settings tells you which one it stood aside for.
- **Always** — save them regardless. With another graph plugin also enabled, both write the graph on
  a switch and whichever runs last wins.
- **Never** — leave the graph alone entirely.

Automatic exists because the list above can never be complete. If you use a graph plugin it does not
know about, set the mode to Never yourself.

## Requirements

1. **Core workspaces must be off**. Both plugins write over `workspaces.json` so I decided to turn one off to avoid overwriting. If the core workspace plugin is on, this plugin will remain read only.
   - Steps: `Settings → Core plugins → Workspaces`, then reload Obsidian after turning it off.

## Where your data lives

As mentioned before, the actual workspaces live in `.obsidian/workspaces.json` as it usually would and the format will never be different than the core plugin.

Additional features introduced by this plugin will live in the plugin's `data.json` file. There is an option to store new properties within `workspaces.json` under an `extendedWorkspaces` key. Changing the setting will move existing data.

> The embedded key is still named `extendedWorkspaces`, from before this plugin was renamed.
> Renaming it would orphan the metadata in vaults that already use embedded storage.

## Development

```bash
npm install
npm run dev     # esbuild watch, rebuilds main.js in place
npm test        # unit tests for the pure logic
npm run build   # type check, then a minified main.js
```

The plugin lives inside the vault at `.obsidian/plugins/obsidian-workspace-organizer`, so `npm run dev` plus an Obsidian reload is the whole loop.

`src/core/` holds the logic and imports no Obsidian API, which is what makes it testable. `src/obsidian/` holds the Obsidian details. `src/ui/` holds the modals and the settings tab. See `AGENTS.md` for the full conventions.

## Credit

The quality-of-life feature set is inspired by [obsidian-workspace-plus](https://github.com/s1m4ne/obsidian-workspace-plus) by s1m4ne (MIT). That
plugin also replaces core, but keeps its own `sessions.json`; this one keeps core's `workspaces.json` so your data stays portable. No code is shared.

## License

MIT
