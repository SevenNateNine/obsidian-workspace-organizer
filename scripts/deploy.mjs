// Copies the build into another vault, so that vault runs this plugin.
// Usage: npm run deploy -- "<vault folder>". Or set OBSIDIAN_VAULT and run npm run deploy.
// `npm run deploy` builds first. Reload Obsidian in the target vault after a deploy.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Only the files that Obsidian loads. Never `data.json`: it holds the settings
 * of the target vault, and a copy would replace them.
 */
const REQUIRED = ["main.js", "manifest.json"];
const OPTIONAL = ["styles.css"];

const vault = process.argv[2] ?? process.env.OBSIDIAN_VAULT;
if (!vault) {
	console.error('Give the vault folder: npm run deploy -- "C:\\path\\to\\vault"');
	process.exit(1);
}

for (const file of REQUIRED) {
	if (!existsSync(file)) {
		console.error(`${file} is missing. Run npm run build first.`);
		process.exit(1);
	}
}

// Obsidian finds a plugin by the id in its manifest, so the folder takes that name.
const { id } = JSON.parse(readFileSync("manifest.json", "utf8"));
// The script does not read the vault. It only writes the plugin folder.
const target = join(resolve(vault), ".obsidian", "plugins", id);
mkdirSync(target, { recursive: true });

for (const file of [...REQUIRED, ...OPTIONAL.filter((file) => existsSync(file))]) {
	copyFileSync(file, join(target, file));
}
console.log(`Deployed ${id} to ${target}. Reload Obsidian in that vault.`);
