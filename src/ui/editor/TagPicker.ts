import { AbstractInputSuggest, setIcon, type App } from "obsidian";
import { dedupe, normalizeTag, suggestTags, type TagCount } from "../../core/organize";

class TagSuggest extends AbstractInputSuggest<string> {
	constructor(
		app: App,
		input: HTMLInputElement,
		private readonly known: readonly TagCount[],
		private readonly chosen: () => readonly string[],
	) {
		super(app, input);
	}

	/** Nothing until the user types, so Enter in an empty box does not add a tag. */
	protected getSuggestions(query: string): string[] {
		if (!normalizeTag(query)) return [];
		return suggestTags(query, this.known, this.chosen());
	}

	renderSuggestion(tag: string, el: HTMLElement): void {
		el.setText(`#${tag}`);
	}
}

/**
 * Chips and a text box, like the tags property in Obsidian. Enter picks the
 * highlighted suggestion. A comma adds the typed text as it is, so a new tag that
 * looks like a known one can still be created.
 */
export class TagPicker {
	private tags: readonly string[];
	private readonly fieldEl: HTMLElement;
	private readonly input: HTMLInputElement;
	private readonly suggest: TagSuggest;

	constructor(
		app: App,
		parent: HTMLElement,
		initial: readonly string[],
		private readonly known: readonly TagCount[],
	) {
		this.tags = [...initial];
		this.fieldEl = parent.createDiv({ cls: "ew-tag-picker-field" });
		this.input = createEl("input", {
			type: "text",
			cls: "ew-tag-picker-input",
			attr: { placeholder: "Add a tag", "aria-label": "Add a tag" },
		});

		this.suggest = new TagSuggest(app, this.input, known, () => this.tags);
		this.suggest.onSelect((tag) => this.add(tag));

		this.fieldEl.addEventListener("click", () => this.input.focus());
		this.input.addEventListener("keydown", (event) => this.onKey(event));
		this.renderChips();
	}

	/** Includes text that was typed but not yet added, so Save does not lose it. */
	value(): readonly string[] {
		const pending = normalizeTag(this.input.value);
		return pending ? dedupe([...this.tags, pending]) : this.tags;
	}

	/** When suggestions show, Enter belongs to `TagSuggest`. */
	private onKey(event: KeyboardEvent): void {
		const typed = this.input.value;
		const hasSuggestions =
			normalizeTag(typed) !== "" &&
			suggestTags(typed, this.known, this.tags).length > 0;

		if (event.key === ",") {
			event.preventDefault();
			this.add(typed);
		} else if (event.key === "Enter" && !hasSuggestions) {
			event.preventDefault();
			this.add(typed);
		} else if (event.key === "Backspace" && !typed) {
			this.remove(this.tags[this.tags.length - 1]);
		}
	}

	private add(raw: string): void {
		const tag = normalizeTag(raw);
		this.suggest.setValue("");
		this.suggest.close();
		if (tag) this.update(dedupe([...this.tags, tag]));
	}

	private remove(tag: string | undefined): void {
		if (tag !== undefined) this.update(this.tags.filter((kept) => kept !== tag));
	}

	private update(tags: readonly string[]): void {
		this.tags = tags;
		this.renderChips();
		this.input.focus();
	}

	private renderChips(): void {
		this.fieldEl.empty();
		for (const tag of this.tags) {
			const chip = this.fieldEl.createSpan({ cls: "ew-tag-chip", text: `#${tag}` });
			const remove = chip.createSpan({
				cls: "ew-tag-chip-remove",
				attr: { "aria-label": `Remove #${tag}` },
			});
			setIcon(remove, "x");
			remove.addEventListener("click", (event) => {
				event.stopPropagation();
				this.remove(tag);
			});
		}
		this.fieldEl.appendChild(this.input);
	}
}
