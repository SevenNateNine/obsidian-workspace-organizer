import tseslint from "typescript-eslint";

/**
 * Size limits are enforced here rather than by prose in AGENTS.md, so a
 * function that outgrows its budget fails the lint step instead of relying on
 * a reviewer to notice.
 */
const SIZE_LIMITS = {
	"max-lines-per-function": [
		"error",
		{ max: 80, skipBlankLines: true, skipComments: true },
	],
	"max-params": ["error", 5],
	"max-depth": ["error", 3],
	complexity: ["error", 15],
};

/**
 * The dependency rule, enforced rather than described.
 *
 * `src/core/` is policy and must not name a framework or a concrete adapter.
 * Use the typescript-eslint rule, not the base one, because a type-only import
 * of an Obsidian type is still a leak.
 *
 * `obsidian-typings` matters most here: it describes undocumented internals
 * that can change between Obsidian releases. Keeping it out of core means a
 * broken internal API breaks one adapter, not the whole plugin.
 */
const CORE_IMPORT_BOUNDARY = {
	"@typescript-eslint/no-restricted-imports": [
		"error",
		{
			patterns: [
				{
					group: ["obsidian", "obsidian-typings"],
					message:
						"core is policy. Declare a port in core/ports.ts and implement it under adapters/.",
				},
				{
					group: ["**/adapters/**", "**/ui/**"],
					message: "core must not import a detail. Invert the dependency.",
				},
			],
		},
	],
};

export default tseslint.config(
	{ ignores: ["main.js", "node_modules/**"] },
	...tseslint.configs.recommended,
	{
		rules: {
			...SIZE_LIMITS,
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					args: "none",
					// Allows `const { id, ...rest } = obj` to drop a field.
					ignoreRestSiblings: true,
					varsIgnorePattern: "^_",
				},
			],
		},
	},
	{
		files: ["src/core/**/*.ts"],
		ignores: ["src/core/**/*.test.ts"],
		rules: CORE_IMPORT_BOUNDARY,
	},
	{
		// Obsidian settings screens are one long declarative builder chain per
		// tab. Splitting them to satisfy a line budget hurts more than it helps.
		files: ["src/ui/SettingsTab.ts"],
		rules: { "max-lines-per-function": "off" },
	},
	{
		// A table-driven test case is one `it()` per behaviour; the budget is
		// about production control flow, not assertion count.
		files: ["src/**/*.test.ts"],
		rules: { "max-lines-per-function": "off" },
	},
);
