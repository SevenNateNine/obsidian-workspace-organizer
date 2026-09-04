import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
	test: {
		include: ["test/**/*.test.ts"],
	},
	resolve: {
		alias: [
			// `obsidian` only exists inside the app at runtime. Point it at a stub
			// so modules that import it can still be unit tested.
			{
				find: /^obsidian$/,
				replacement: fileURLToPath(new URL("./test/obsidian-stub.ts", import.meta.url)),
			},
			// `test/` mirrors `src/`, so a relative import from a test would be four
			// levels of "..". A miscounted one can resolve to a different real file
			// instead of failing, which the alias makes impossible.
			{ find: /^@\//, replacement: `${src}/` },
		],
	},
});
