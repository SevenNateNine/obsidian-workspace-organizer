# Architecture

The code is cut into vertical slices. A slice is one user-facing feature, kept in one folder with
its rules, its screens, and its registration. `src/shared/` holds only what two or more slices need.
`src/main.ts` builds the runtime, registers each slice in order, and decides nothing itself.

## Layout

```
src/
  main.ts                composition root
  shared/
    context.ts           SliceContext, everything a slice can reach
    runtime.ts           builds the context: data.json, reload, attempt, repaint
    actions.ts           WorkspaceActions, late-bound calls between slices
    domain/              policy with no Obsidian import
      settings/          PluginSettings, vocabulary, migrations
      workspace/         WorkspaceRegistry, ports, workspaceFile, reconcile, tags
    obsidian/            DirectWorkspacesAdapter, pluginState, coreConflict
    ui/                  SettingsTab shell, PromptModal, ConfirmModal, describe
  features/<slice>/
    index.ts             register(ctx): commands, actions, settings section
    domain/              pure rules of this slice, when it has any
    ui/                  modals and the settings section
    *.ts                 services and adapters, at the slice root
test/                    mirrors src/, imports through the @/ alias
```

## Slices

| Slice        | Owns                                                           | Imports directly      |
| ------------ | -------------------------------------------------------------- | --------------------- |
| `storage`    | which `MetaStore` is installed, moving metadata between them   | none, registers first |
| `graph`      | graph settings per workspace, standing aside for graph plugins | none                  |
| `save`       | writing the layout on screen                                   | `graph`               |
| `switch`     | loading a workspace, the save prompt, next and previous        | `graph`, `save`       |
| `switcher`   | finding a workspace by name or tag                             | none                  |
| `metadata`   | editing tags and description                                   | none                  |
| `manager`    | the workspace list in settings                                 | none                  |
| `status-bar` | the active name and its menu                                   | none, registers last  |

Registration order matters at two points. Storage installs the metadata store, which builds the
registry every other slice reads. The status bar dispatches into five slices, so their actions must
be filled before it registers.

## Rules

- **A slice imports another slice only through its `index.ts`.** Three edges exist: save to graph,
  switch to save, switch to graph. Each carries an ordering rule the caller must honour. A fourth
  edge needs a reason of the same kind.
- **Every other call between slices goes through `WorkspaceActions`** on the context. Each entry
  starts as a stub that throws. `assertActionsComplete` runs at load, so a missed registration fails
  while Obsidian starts, not under the user's cursor.
- **A `domain/` folder imports no Obsidian API**, in `shared/` and in every slice alike.
  `eslint.config.js` enforces this with one glob, and a type-only import is still a leak.
- **The context is the only door.** A slice reads `SliceContext` and nothing else about the plugin.
  Its workspace accessors are functions, because changing the storage mode replaces the registry.
  Four members serve the storage slice alone and say so. They are a deliberate exception, not a
  general door.
- **A screen inside a slice takes the context.** It reads what it shows at the moment it paints.
  A screen in `shared/ui/` takes plain data instead, so any slice can open it.
- **An interface exists at a policy boundary or where a second implementation exists.**
  `MetaStore` has two. `WorkspacesPort` separates the registry from the file adapter, so the registry
  is tested with a fake. A class with one implementation and no policy consumer gets no interface.
- **Settings sections** are contributed through `ctx.addSection` with an `order`. Leave gaps of ten.

## Adding a slice

1. Create `src/features/<name>/index.ts` with a `register(ctx)` function.
2. Call it from `src/main.ts`, after storage and before the status bar.
3. Put pure rules in `domain/`, screens in `ui/`, and tests under `test/features/<name>/`.
4. When another slice must start your work, add an entry to `WorkspaceActions` and fill it in
   `register`.
