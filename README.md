# Workspace Organizer

The core Workspaces plugin in Obsidian saves layouts. It does not help you organize them. It has no
tags, no archive, and no custom order, and its picker matches only the name. With many workspaces,
this is slow.

This plugin adds the organization layer. You can tag workspaces, archive the workspaces that you do
not use, put them in your own order, and find a workspace by name, tag, or description.

This plugin **replaces** the core Workspaces plugin, but it keeps the same file. Your workspaces stay
in `.obsidian/workspaces.json`, in the same format, byte for byte. If you turn off this plugin and turn
on the core plugin again, your workspaces are all there.

## Requirements

1. Turn off the core Workspaces plugin: Settings, Core plugins, Workspaces.
2. Reload Obsidian. The core plugin reads the file only when it starts.

Both plugins write `workspaces.json`. If both are on, one of them can overwrite the other, and a
workspace can disappear with no message. For this reason, this plugin is read-only while the core
plugin is on, and it shows a notice.

## Organize

| Feature        | What it does                                                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tags           | Group your workspaces. Filter the switcher by tag.                                                                                                   |
| Archive        | Hide a workspace from the switcher, but keep it. An archived workspace stays in the manager.                                                         |
| Order          | Put the list in your own order. Next and previous use this order and skip archived workspaces.                                                       |
| Descriptions   | Write a note about the purpose of a workspace. The switcher shows it.                                                                                |
| Switcher       | Fuzzy search on names, tags, and descriptions. Type `#tag` to filter by a tag.                                                                       |
| Layout preview | A workspace with no description shows a generated summary: `5 tabs, 2 splits · Chapter 1, Outline, +3`.                                              |
| Manager        | In the plugin settings. Drag the handle to reorder. The pencil edits the name, tags, and description. The ⋮ menu has duplicate, archive, and delete. |

## Other features

| Feature         | What it does                                                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Non-destructive | Install and uninstall do not change your workspaces, because the plugin uses `.obsidian/workspaces.json`.                    |
| Status bar      | Shows the active workspace. You can set the action for left, middle, and right click.                                        |
| Switch prompt   | Before a switch, the plugin can ask to save the current layout: always, only when the layout changed, or never.              |
| Graph settings  | Saves the global graph search, filters, color groups, and forces with each workspace. See [Graph settings](#graph-settings). |

## Commands

| Command                                     | Default hotkey |
| ------------------------------------------- | -------------- |
| Open workspace switcher                     | none           |
| Save current layout to the active workspace | none           |
| Save current layout as a new workspace…     | none           |
| Switch to next workspace                    | none           |
| Switch to previous workspace                | none           |

To set a hotkey, go to Settings, Hotkeys. Next and previous use the switcher order and skip archived
workspaces.

## Graph settings

Obsidian has two types of graph view, and they keep their settings in different places.

**Local graph.** Each local graph pane keeps its own settings in the layout. When you save a
workspace, the layout includes each local graph pane and its settings. The graph setting below does
not change this.

**Global graph.** Obsidian keeps one set of global graph settings outside the layout, so a saved
layout cannot hold them. This plugin can save them with each workspace and apply them when you
switch. It applies them globally, so all global graph panes get the same settings.

Some graph plugins do this better, per pane. For this reason, the setting has three modes:

- **Automatic** (default): save the global graph settings with each workspace. If a plugin that
  owns the graph is on, do not save them. At this time, these plugins are
  [Graph Profiles](https://github.com/SevenNateNine/obsidian-graph-profiles), Graph Presets, and
  Extended Graph. The settings screen shows the plugin that caused this.
- **Always**: save them in all conditions. If another graph plugin is also on, both plugins write
  the graph during a switch, and the last one wins.
- **Never**: do not touch the global graph.

The list of graph plugins cannot be complete. If you use a graph plugin that is not in the list,
set the mode to Never.

The global graph settings are the one place where this plugin uses an API that Obsidian does not
document. If a future Obsidian release changes it, only the global graph feature stops. The other
features continue to work.

## Where your data is

Your workspaces are in `.obsidian/workspaces.json`, as with the core plugin. The format is always
the same as the format that the core plugin writes.

Tags, archive flags, order, descriptions, and graph settings are in the `data.json` file of this
plugin. This is the default, called sidecar storage.

You can also select embedded storage. This puts the same data inside `workspaces.json`, under an
`extendedWorkspaces` key in each workspace. When you change this setting, the plugin moves your
existing data to the new location.

> The embedded key keeps the name `extendedWorkspaces` from before this plugin had its current
> name. A new name would disconnect the data in vaults that use embedded storage now.

With embedded storage, be careful if you turn the core plugin on again. The core plugin possibly
does not keep a key that it does not know.

## Development

```bash
npm install
npm run dev     # esbuild watch, rebuilds main.js in place
npm test        # unit tests for the pure logic
npm run build   # type check, then a minified main.js
```

The plugin is inside the vault at `.obsidian/plugins/obsidian-workspace-organizer`. Run
`npm run dev`, then reload Obsidian to load each build.

The source has three layers. Each layer has one folder for each feature, and each feature folder
has an `index.ts` for its public API.

| Folder          | Contents                                                                                |
| --------------- | --------------------------------------------------------------------------------------- |
| `src/core/`     | The rules. No Obsidian import, so all of it is unit tested.                             |
| `src/obsidian/` | The Obsidian details: the `workspaces.json` file, the two storage modes, and the graph. |
| `src/ui/`       | The switcher, the modals, the status bar, the commands, and the settings tab.           |
| `src/main.ts`   | Builds the parts and connects them.                                                     |

`eslint.config.js` enforces the layer rules. See `AGENTS.md` for all conventions.

## Credit

The feature set is inspired by
[obsidian-workspace-plus](https://github.com/s1m4ne/obsidian-workspace-plus) by s1m4ne (MIT). That
plugin also replaces the core plugin, but it keeps its own `sessions.json`. This plugin keeps the
`workspaces.json` of the core plugin, so your data stays portable. The two plugins share no code.

## License

MIT
