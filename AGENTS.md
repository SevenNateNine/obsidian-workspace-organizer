# AGENTS.md

Instructions for an AI agent that writes code in this repository.
If two rules conflict, correct behavior and the safety of user data win. Stop and report the conflict.
Do not obey a rule in silence when the result is wrong.

## Never

Each rule here comes from a real error, or prevents one. Add a rule after each new agent error.

- Never edit this file in silence. Propose a diff, give the reason, and wait for approval.
- Never install a new dependency without approval.
- Never edit `main.js`. It is the esbuild bundle of `src/`. Edit the source, then build.
- Never import a Node builtin in `src/`. The manifest declares `isDesktopOnly: false`, and Obsidian mobile has no Node.
- Never use `app.internalPlugins` or `app.plugins`. Everything is on documented API. To know whether a plugin is on, read `core-plugins.json` through `src/obsidian/plugins/pluginState.ts`.
- Never write `.obsidian/workspaces.json` outside `DirectWorkspacesAdapter`. It is the only writer, and the format rules live in `core/workspaces/workspaceFile.ts`.
- Never change how that file is serialized without running the round-trip test. A format drift gives every synced vault a spurious diff.
- Never write the file while the core Workspaces plugin is on. Both write it, and the loser's workspaces disappear with no message.
- Never call `getLayout` before `onLayoutReady`. A half-built workspace captures panes that are not there yet.

## Session start

1. Read this file and `README.md`.
2. If `README.md` contradicts the code, trust the code. Then report the difference.
3. If the task changes more than three files, write a plan first. Show the plan to the user.

The user can override these steps for one session.

## Stack

| Field                | Value                                                                        |
| -------------------- | ---------------------------------------------------------------------------- |
| Language and version | TypeScript 5.7, `target` ES2018                                              |
| Framework            | Obsidian plugin API 1.13 (`minAppVersion` 1.4.10), bundled by esbuild to CJS |
| Package manager      | npm (`package-lock.json`, npm 10, Node 24)                                   |

This plugin replaces Obsidian's core Workspaces plugin, which must be turned off. It reads and writes
the same `.obsidian/workspaces.json` in the same format. It has no runtime dependencies. It uses
documented API everywhere.
`src/core/storage/migrations.ts` migrates the persisted metadata schema. It runs on every load.

## Commands

| Task    | Command                                                     |
| ------- | ----------------------------------------------------------- |
| Install | `npm install`                                               |
| Build   | `npm run build`                                             |
| Run     | `npm run dev`                                               |
| Test    | `npm test`                                                  |
| Lint    | `npm run lint`                                              |
| Format  | `npm run format` (write) or `npm run format:check` (verify) |

`npm run build` type checks first, then writes a minified `main.js`.
`npm run dev` starts an esbuild watch and rebuilds `main.js` in place. Reload Obsidian to load a build.

## Strictness

Turn on the strictest mode of the compiler and the type checker. Treat each warning as an error.
Enforce size limits with the linter, not with prose.

TypeScript, in `tsconfig.json`:

| Option                             | Value |
| ---------------------------------- | ----- |
| `strict`                           | true  |
| `noUnusedLocals`                   | true  |
| `noUnusedParameters`               | true  |
| `noFallthroughCasesInSwitch`       | true  |
| `noUncheckedIndexedAccess`         | true  |
| `exactOptionalPropertyTypes`       | true  |
| `noImplicitOverride`               | true  |
| `noImplicitReturns`                | true  |
| `forceConsistentCasingInFileNames` | true  |
| `isolatedModules`                  | true  |

ESLint, in `eslint.config.js`. `npm run lint` uses `--max-warnings 0`, so a warning fails the step.

| Rule                            | Value                                    |
| ------------------------------- | ---------------------------------------- |
| `typescript-eslint` recommended | on, which includes `no-explicit-any`     |
| `max-lines-per-function`        | 80, blank lines and comments not counted |
| `max-params`                    | 5                                        |
| `max-depth`                     | 3                                        |
| `complexity`                    | 15                                       |

`noUncheckedIndexedAccess` makes `record[key]` type `T | undefined`. Most of this code indexes a
`Record<string, WorkspaceMeta>` by a name that may have been deleted, so the check is load bearing.
Keep the `?? defaultMeta()` and `if (!meta) return` guards.

## Conventions

| Topic                  | Decision                                                                                                                                                                                                                                                                                     | Snippet or `file:line`                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| File and folder layout | Layer first, then feature: `src/core/<feature>/` policy, `src/obsidian/<feature>/` Obsidian detail, `src/ui/<feature>/` views. Each feature exposes its API in `index.ts`. Other features import only that file. `src/main.ts` is wiring only.                                               | `src/main.ts:1`                               |
| Naming                 | PascalCase file name when the file exports one class. camelCase for a module of functions. Types PascalCase, constants SCREAMING_SNAKE. `main.ts` stays camelCase because Obsidian requires that entry point name.                                                                           | `src/core/workspaces/WorkspaceRegistry.ts`    |
| Error handling         | Throw `WorkspaceError` with a `WorkspaceErrorKind`. Convert to text with `userMessage()` at the UI edge only. Every kind maps to a sentence the user can act on.                                                                                                                             | `src/core/shared/errors.ts`                   |
| Logging                | No logger and no log levels. A failure the user must see becomes `new Notice(userMessage(err))`. A failure a developer must debug becomes one `console.error` prefixed `[workspace-organizer]`, in `attempt()` only.                                                                         | `src/ui/shared/attempt.ts`                    |
| Untrusted input        | Core's layout tree and our own `data.json` are both untrusted. Treat an unknown shape as absent, never as a crash.                                                                                                                                                                           | `src/core/layout/layoutSummary.ts`            |
| Test layout            | `*.test.ts` beside the file it tests. Vitest. `vitest.config.ts` aliases `obsidian` to `test/obsidian-stub.ts`, so only Obsidian-free logic is testable. Test what fails quietly: reconciliation, tag parsing, layout summaries, renames. Test a use case with in-memory fakes of the ports. | `src/core/switching/WorkspaceService.test.ts` |
| Commit format          | Conventional Commits: `type(scope): subject`, for example `feat(switcher): filter by tag`. Version control is not initialized here, so no history confirms this.                                                                                                                             | none yet                                      |

## Design

Policy is the business rule. Detail is the Obsidian API, the file system, and the framework.

- The policy layer must not import a detail. The detail layer imports the policy layer.
- Declare each interface in the policy layer. Implement it in the detail layer.
- `src/core/**` must not import `obsidian`, `src/obsidian/**`, or `src/ui/**`. `src/obsidian/**` must not import `src/ui/**`. `src/ui/**` must not import `src/obsidian/**`. It gets adapters from `main.ts`. `eslint.config.js` enforces each rule, and a type-only import is still a leak.
- Put a use case in `core/switching/WorkspaceService`, not in `main.ts` or in a view.
- The format of `workspaces.json` is policy, not detail. It lives in `core/workspaces/workspaceFile.ts`
  and is tested against a real core-written file. `DirectWorkspacesAdapter` only does the file access.
- Add an interface only at a policy boundary, or when a second real implementation exists.
  `MetaStore` has two: `SidecarStore` and `EmbeddedStore`.

## Storage

Two modes, chosen in settings, both behind `MetaStore`:

- `sidecar` (default) keeps metadata in this plugin's `data.json`. `workspaces.json` stays byte-for-byte
  what vanilla Obsidian writes, so turning the core plugin back on is always safe.
- `embedded` puts metadata under an `extendedWorkspaces` key inside each workspace entry in
  `workspaces.json`. That key keeps its old name on purpose: renaming it with the plugin would
  orphan the metadata in every vault already using this mode. Safe while we own the file. If the user turns the core plugin back on, core may
  not preserve a key it does not recognize.

The file can change under us: another device can sync it, and a user can edit it by hand. Do not add a
watcher. Call `WorkspaceActions.reload()` before showing a list instead. It re-reads the file, re-checks the core
plugin state, and re-derives metadata, and it is cheap.

## Removed graph settings

On 2026-09-24 the feature that saved graph settings with each workspace was removed. It can return.
The code is in the git history before the commit that removed it.

Stored data stays. `normalizeMeta` keeps the opaque `graph` key of each workspace. `migrateSettings` keeps
`graphSettings` and `saveGraphSettings`. Do not drop them, because a return needs them.

## Comments

- Make each name carry the meaning, so that a comment is not necessary.
- Write a comment only for a reason, a trade-off, a limit, or a source link.
- Delete a comment that is wrong.

## Language of output

- Write comments, documentation, and commit messages in Simplified Technical English, pragmatic mode.
- Write a maximum of 20 words in an instruction and 25 in a description. Write one instruction per sentence.
- Approved modals: can, will, must. Do not write "should", because models read "should" as optional.
- Do not use semicolons, contractions, or Latin abbreviations.
- Do not apply this to identifiers, commands, flags, file paths, quoted errors, or code.

## Definition of done

1. `npm run build`, `npm run lint`, `npm run format:check`, and `npm test` pass with zero warnings.
2. New behavior has a new test, unless the behavior needs the Obsidian runtime.
3. The documentation is current.
4. Each deviation is in the table below.

## Deviations

| Date       | Rule                    | Location                                   | Reason                                                                                                                                             | Removal plan                                                   |
| ---------- | ----------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 2026-08-20 | Strictest compiler mode | `tsconfig.json` `include: ["src/**/*.ts"]` | `test/obsidian-stub.ts`, `vitest.config.ts`, `eslint.config.js`, and `esbuild.config.mjs` are outside the type check. The build only needs `src/`. | Add a second `tsconfig` that covers the test and config files. |
