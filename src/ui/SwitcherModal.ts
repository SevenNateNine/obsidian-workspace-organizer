import { App, FuzzySuggestModal, type FuzzyMatch } from "obsidian";
import type {
	WorkspaceEntry,
	WorkspaceRegistry,
} from "../shared/domain/workspace/WorkspaceRegistry";
import type { PluginSettings } from "../shared/domain/settings/PluginSettings";
import { countTags, parseQuery } from "../shared/domain/workspace/tags";
import { describeWorkspace } from "../shared/ui/describe";

export interface SwitcherDeps {
	registry: WorkspaceRegistry;
	settings: PluginSettings;
	onChoose: (name: string) => void;
}

export class SwitcherModal extends FuzzySuggestModal<WorkspaceEntry> {
	/** Tags picked from the chip bar. */
	private chosenTags: string[] = [];
	/** Tags typed as "#tag" in the query. Refreshed on every keystroke. */
	private queryTags: string[] = [];
	private showArchived: boolean;
	private chipBar: HTMLElement | null = null;

	constructor(
		app: App,
		private readonly deps: SwitcherDeps,
	) {
		super(app);
		this.showArchived = deps.settings.showArchived;

		this.setPlaceholder("Switch workspace…");
		this.setInstructions([
			{ command: "↑↓", purpose: "navigate" },
			{ command: "↵", purpose: "switch" },
			{ command: "#tag", purpose: "filter by tag" },
			{ command: "esc", purpose: "dismiss" },
		]);
	}

	override onOpen(): void {
		super.onOpen();

		// Above the results and below the search box, where a filter bar sits in
		// the rest of the app.
		this.chipBar = createDiv({ cls: "ew-tagbar" });
		this.resultContainerEl.before(this.chipBar);
		this.renderChips();
	}

	getItems(): WorkspaceEntry[] {
		return this.deps.registry.filtered({
			tags: [...this.chosenTags, ...this.queryTags],
			includeArchived: this.showArchived,
		});
	}

	/** Tags and description join the haystack so a plain search finds them. */
	getItemText(entry: WorkspaceEntry): string {
		return [entry.name, ...entry.meta.tags, entry.meta.description].join(" ");
	}

	/**
	 * Pull "#tag" out of the query before fuzzy matching.
	 *
	 * Without this the raw "#dev" would be matched character by character against
	 * the item text and find nothing, because tags are stored without the hash.
	 */
	override getSuggestions(query: string): FuzzyMatch<WorkspaceEntry>[] {
		const parsed = parseQuery(query);
		this.queryTags = parsed.tags;
		return super.getSuggestions(parsed.text);
	}

	override renderSuggestion(match: FuzzyMatch<WorkspaceEntry>, el: HTMLElement): void {
		const { name, meta, isActive } = match.item;
		const { primary, tooltip } = describeWorkspace(
			this.deps.registry.layoutOf(name),
			meta,
			this.deps.settings.previewNameCount,
		);

		el.addClass("ew-item");
		el.setAttr("title", tooltip);
		if (isActive) el.addClass("is-active");

		const title = el.createDiv({ cls: "ew-title" });
		title.createSpan({ cls: "ew-name", text: name });
		if (isActive) title.createSpan({ cls: "ew-badge", text: "active" });
		if (meta.archived)
			title.createSpan({ cls: "ew-badge ew-badge-muted", text: "archived" });

		const tags = title.createDiv({ cls: "ew-tags" });
		for (const tag of meta.tags) tags.createSpan({ cls: "ew-tag", text: `#${tag}` });

		el.createDiv({ cls: "ew-sub", text: primary });
	}

	onChooseItem(entry: WorkspaceEntry): void {
		this.deps.onChoose(entry.name);
	}

	/**
	 * Chips are built from every workspace, not from the filtered list, so the
	 * vocabulary does not shrink as you narrow and strand you with no way back.
	 */
	private renderChips(): void {
		const bar = this.chipBar;
		if (!bar) return;
		bar.empty();

		const all = this.deps.registry.entries();
		const anyArchived = all.some((entry) => entry.meta.archived);

		for (const { tag, count } of countTags(all.map((entry) => entry.meta))) {
			const chip = bar.createSpan({ cls: "ew-chip", text: `#${tag}` });
			chip.createSpan({ cls: "ew-chip-count", text: String(count) });
			if (this.chosenTags.includes(tag)) chip.addClass("is-active");
			chip.addEventListener("click", () => this.toggleTag(tag));
		}

		if (anyArchived) {
			const chip = bar.createSpan({
				cls: "ew-chip ew-chip-archived",
				text: "archived",
			});
			if (this.showArchived) chip.addClass("is-active");
			chip.addEventListener("click", () => {
				this.showArchived = !this.showArchived;
				this.refresh();
			});
		}

		bar.toggleClass("is-empty", bar.childElementCount === 0);
	}

	private toggleTag(tag: string): void {
		this.chosenTags = this.chosenTags.includes(tag)
			? this.chosenTags.filter((chosen) => chosen !== tag)
			: [...this.chosenTags, tag];
		this.refresh();
	}

	/** Re-run the search so the list reflects the new filter. */
	private refresh(): void {
		this.renderChips();
		this.inputEl.dispatchEvent(new Event("input"));
		this.inputEl.focus();
	}
}
