import { App, FuzzySuggestModal, type FuzzyMatch } from "obsidian";
import { countTags, parseQuery, sameTag } from "../../core/organize";
import type { WorkspaceEntry, WorkspaceRegistry } from "../../core/workspaces";
import { describe } from "./describe";

export interface SwitcherOptions {
	readonly registry: WorkspaceRegistry;
	readonly showArchived: boolean;
	readonly previewNameCount: number;
	readonly onChoose: (name: string) => void;
}

export class SwitcherModal extends FuzzySuggestModal<WorkspaceEntry> {
	private chosenTags: readonly string[] = [];
	private queryTags: readonly string[] = [];
	private showArchived: boolean;
	private chipBar: HTMLElement | null = null;

	constructor(
		app: App,
		private readonly opts: SwitcherOptions,
	) {
		super(app);
		this.showArchived = opts.showArchived;

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
		this.chipBar = createDiv({ cls: "ew-tagbar" });
		this.resultContainerEl.before(this.chipBar);
		this.renderChips();
	}

	getItems(): WorkspaceEntry[] {
		return this.opts.registry.filtered({
			tags: [...this.chosenTags, ...this.queryTags],
			includeArchived: this.showArchived,
		});
	}

	getItemText(entry: WorkspaceEntry): string {
		return [entry.name, ...entry.meta.tags, entry.meta.description].join(" ");
	}

	/** Tags are stored without "#", so a raw "#dev" would fuzzy-match nothing. */
	override getSuggestions(query: string): FuzzyMatch<WorkspaceEntry>[] {
		const parsed = parseQuery(query);
		this.queryTags = parsed.tags;
		return super.getSuggestions(parsed.text);
	}

	override renderSuggestion(match: FuzzyMatch<WorkspaceEntry>, el: HTMLElement): void {
		const { name, meta, isActive } = match.item;
		const { primary, tooltip } = describe(
			this.opts.registry.layoutOf(name),
			meta,
			this.opts.previewNameCount,
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
		this.opts.onChoose(entry.name);
	}

	/** Built from every workspace, so the chips do not vanish as the filter narrows. */
	private renderChips(): void {
		const bar = this.chipBar;
		if (!bar) return;
		bar.empty();

		const all = this.opts.registry.entries();
		for (const { tag, count } of countTags(all.map((entry) => entry.meta))) {
			const chip = bar.createSpan({ cls: "ew-chip", text: `#${tag}` });
			chip.createSpan({ cls: "ew-chip-count", text: String(count) });
			if (this.isChosen(tag)) chip.addClass("is-active");
			chip.addEventListener("click", () => this.toggleTag(tag));
		}

		if (all.some((entry) => entry.meta.archived)) {
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

	private isChosen(tag: string): boolean {
		return this.chosenTags.some((chosen) => sameTag(chosen, tag));
	}

	private toggleTag(tag: string): void {
		this.chosenTags = this.isChosen(tag)
			? this.chosenTags.filter((chosen) => !sameTag(chosen, tag))
			: [...this.chosenTags, tag];
		this.refresh();
	}

	private refresh(): void {
		this.renderChips();
		this.inputEl.dispatchEvent(new Event("input"));
		this.inputEl.focus();
	}
}
