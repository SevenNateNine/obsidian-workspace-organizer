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
 * A `domain/` folder is policy and must not name a framework or a concrete
 * adapter. The rule reads the same in `shared/` and in every slice, so one
 * glob covers the whole tree and a new folder cannot drift outside it.
 *
 * Use the typescript-eslint rule, not the base one, because a type-only import
 * of an Obsidian type is still a leak.
 *
 * `obsidian-typings` matters most here: it describes undocumented internals
 * that can change between Obsidian releases. Keeping it out of a domain folder
 * means a broken internal API breaks one adapter, not the whole plugin.
 */
const DOMAIN_IMPORT_BOUNDARY = {
	"@typescript-eslint/no-restricted-imports": [
		"error",
		{
			patterns: [
				{
					group: ["obsidian", "obsidian-typings"],
					message:
						"This is policy. Declare a port in the nearest ports.ts and implement it outside the domain folder.",
				},
				{
					group: ["**/adapters/**", "**/ui/**", "**/obsidian/**"],
					message: "Policy must not import a detail. Invert the dependency.",
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
		files: ["src/**/domain/**/*.ts"],
		rules: DOMAIN_IMPORT_BOUNDARY,
	},
	{
		// A table-driven test case is one `it()` per behaviour; the budget is
		// about production control flow, not assertion count.
		files: ["test/**/*.ts"],
		rules: { "max-lines-per-function": "off" },
	},
);
