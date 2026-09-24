import builtins from "builtin-modules";
import tseslint from "typescript-eslint";

const SIZE_LIMITS = {
	"max-lines-per-function": [
		"error",
		{ max: 80, skipBlankLines: true, skipComments: true },
	],
	"max-params": ["error", 5],
	"max-depth": ["error", 3],
	complexity: ["error", 15],
};

// Patterns match import paths from a file in src/<layer>/<feature>/. The
// typescript-eslint rule also catches a type-only import, which is still a leak.

const BARREL_ONLY = [
	{
		regex: "^\\.\\./[^./][^/]*/.",
		message: "Import a sibling feature through its index.ts.",
	},
	{
		regex: "^\\.\\./\\.\\./(core|obsidian|ui)/[^/]+/.",
		message: "Import a feature of another layer through its index.ts.",
	},
];

const NODE_MESSAGE = "Obsidian mobile has no Node, and isDesktopOnly is false.";
const NO_NODE = [
	{ regex: "^node:", message: NODE_MESSAGE },
	{ regex: `^(${builtins.join("|")})(/.*)?$`, message: NODE_MESSAGE },
];

const layer = (dir, message) => ({ regex: `^\\.\\./\\.\\./${dir}(/|$)`, message });

const LAYERS = {
	core: [
		...BARREL_ONLY,
		{
			regex: "^obsidian(-typings)?$",
			message:
				"core is policy. Declare a port in core and implement it in src/obsidian.",
		},
		layer("obsidian", "core must not import a detail. Invert the dependency."),
		layer("ui", "core must not import the UI."),
	],
	obsidian: [...BARREL_ONLY, layer("ui", "An adapter must not import the UI.")],
	ui: [
		...BARREL_ONLY,
		layer("obsidian", "The UI gets adapters from main.ts, not by import."),
	],
};

const restrict = (patterns) => ({
	"@typescript-eslint/no-restricted-imports": ["error", { patterns }],
});

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
		files: ["src/main.ts"],
		rules: restrict([
			...NO_NODE,
			{
				regex: "^\\./(core|obsidian|ui)/[^/]+/.",
				message: "Import a feature through its index.ts.",
			},
		]),
	},
	...Object.entries(LAYERS).flatMap(([dir, patterns]) => [
		{
			files: [`src/${dir}/**/*.ts`],
			ignores: ["src/**/*.test.ts"],
			rules: restrict([...patterns, ...NO_NODE]),
		},
		{
			// A test reads the round-trip fixture from disk, so Node is allowed here.
			files: [`src/${dir}/**/*.test.ts`],
			rules: restrict(patterns),
		},
	]),
);
