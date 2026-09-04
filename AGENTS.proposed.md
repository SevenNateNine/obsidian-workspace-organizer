# Proposed AGENTS.md changes

AGENTS.md says: "Never edit this file in silence. Propose a diff, give the reason, and wait for
approval." This file is that proposal. Delete it once the edits are approved and applied.

Reason for all of it: the layout changed from layers to vertical slices, and the tests moved out of
`src/`. Every path below is now wrong, and three rules describe a structure that no longer exists.

---

## 1. Never section, two path corrections

Line 15: `adapters/obsidian/pluginState.ts` becomes `shared/obsidian/pluginState.ts`.

Line 16: `core/domain/workspaceFile.ts` becomes `shared/domain/workspace/workspaceFile.ts`.

## 2. Stack section

Line 41: `src/core/domain/migrations.ts` becomes `src/shared/domain/settings/migrations.ts`.

## 3. Conventions table

**File and folder layout** — replace the Decision cell with:

> `src/features/<slice>/` holds one feature. `src/shared/` holds what two or more slices need. Each
> slice keeps pure rules in `domain/`, screens in `ui/`, and registration in `index.ts`.
> `src/main.ts` is the composition root. It registers slices and decides nothing.

**Test layout** — replace the Decision cell with:

> `test/` mirrors `src/`. A test for `src/features/switcher/domain/query.ts` lives at
> `test/features/switcher/domain/query.test.ts`. Tests import through the `@/` alias. Vitest aliases
> `obsidian` to `test/obsidian-stub.ts`, so only Obsidian-free logic is testable. Test what fails
> quietly: reconciliation, tag parsing, layout summaries, renames.

Snippet cell: `test/shared/domain/workspace/WorkspaceRegistry.test.ts`.

**Commit format** — delete the sentence "Version control is not initialized here, so no history
confirms this." Git is initialized and this work adds eleven conforming commits. Snippet cell
becomes `git log`.

**Snippet cell corrections only:**

| Row             | Old                                | New                                                |
| --------------- | ---------------------------------- | -------------------------------------------------- |
| Naming          | `src/core/WorkspaceRegistry.ts`    | `src/shared/domain/workspace/WorkspaceRegistry.ts` |
| Error handling  | `src/core/errors.ts:10`            | `src/shared/domain/errors.ts:10`                   |
| Logging         | `src/main.ts` `attempt`            | `src/shared/runtime.ts` `attempt`                  |
| Untrusted input | `src/core/domain/layoutSummary.ts` | `src/shared/domain/workspace/layoutSummary.ts`     |

**New row, Slice boundaries:**

> A slice imports another slice only through its `index.ts`. The allowed edges are save to graph,
> switch to save, and switch to graph. Each carries an ordering rule. Every other cross-slice call
> goes through `WorkspaceActions`. A slice never imports `src/main.ts`.

Snippet cell: `src/shared/actions.ts`.

## 4. Design section

Replace the first three bullets with:

> - Policy must not import a detail. The detail layer imports the policy layer.
> - Declare each interface next to the policy that needs it. Implement it outside the domain folder.
> - Any `domain/` folder must not import `obsidian`. `eslint.config.js` enforces this with one glob,
>   `src/**/domain/**`, and a type-only import is still a leak.

Fourth bullet: `core/domain/workspaceFile.ts` becomes `shared/domain/workspace/workspaceFile.ts`.

Note on the word "domain": it means policy with no framework import. `WorkspaceRegistry` is an
application service rather than a domain entity, and it sits there because it imports no Obsidian
API. Say so, so nobody later argues it is misplaced.

## 5. Graph ownership section

Line 136: `core/domain/graphOwners.ts` becomes `src/features/graph/domain/graphOwners.ts`.

The sentence about reading the enabled list becomes: the graph slice reads it again on every reload
and before every action, through `SliceContext.onBeforeAction`.

## 6. Commands table

Add a row: `| Type check | npm run typecheck |`.

Change "npm run build type checks first" to: `npm run build` type checks `src` and `test`, then
writes a minified `main.js`.

## 7. Deviations table

**Narrow row 1** (Strictest compiler mode). The test files are now covered by `tsconfig.test.json`.
New Location: `eslint.config.js` and `esbuild.config.mjs`. New Reason: both are JavaScript, and type
checking them needs `allowJs` and `checkJs`, which changes what the compiler enforces everywhere.
New Removal plan: convert both to TypeScript, or turn on `checkJs` in a third `tsconfig`.

**Delete row 2** (Linter size limits, `SettingsTab.ts`). The tab is split into six section files
owned by their slices, and the override is gone. This is the removal plan the row itself named.

**Update row 3** (`app.internalPlugins`). Location becomes
`src/features/graph/GraphOptionsAdapter.ts`. Nothing else changes.
