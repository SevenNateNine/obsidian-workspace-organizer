import { setIcon } from "obsidian";
import { dedupe, normalizeTag, suggestTags, type TagCount } from "../../core/organize";

/**
 * Chips and a text box, like the tags property in Obsidian. Obsidian offers
 * `AbstractInputSuggest` only from 1.4.10, and this plugin supports 1.4.0.
 *
 * Enter picks the highlighted suggestion. A comma adds the typed text as it is,
 * so a new tag that looks like a known one can still be created.
 */
export class TagPicker {
	private tags: readonly string[];
	/** -1 is none. With an empty box, Enter adds nothing until the arrow keys choose a tag. */
	private highlighted = -1;
	private readonly fieldEl: HTMLElement;
	private readonly input: HTMLInputElement;
	private readonly suggestionsEl: HTMLElement;

	constructor(
		parent: HTMLElement,
		initial: readonly string[],
		private readonly known: readonly TagCount[],
	) {
		this.tags = [...initial];
		const root = parent.createDiv({ cls: "ew-tag-picker" });
		this.fieldEl = root.createDiv({ cls: "ew-tag-picker-field" });
		this.input = createEl("input", {
			type: "text",
			cls: "ew-tag-picker-input",
			attr: { placeholder: "Add a tag", "aria-label": "Add a tag" },
		});
		this.suggestionsEl = root.createDiv({ cls: "ew-tag-suggestions" });

		this.fieldEl.addEventListener("click", () => this.input.focus());
		this.input.addEventListener("input", () => this.showSuggestions());
		this.input.addEventListener("focus", () => this.showSuggestions());
		this.input.addEventListener("blur", () => this.suggestionsEl.empty());
		this.input.addEventListener("keydown", (event) => this.onKey(event));
		this.renderChips();
	}

	/** Includes text that was typed but not yet added, so Save does not lose it. */
	value(): readonly string[] {
		const pending = normalizeTag(this.input.value);
		return pending ? dedupe([...this.tags, pending]) : this.tags;
	}

	private onKey(event: KeyboardEvent): void {
		const suggestions = this.currentSuggestions();

		switch (event.key) {
			case "ArrowDown":
			case "ArrowUp":
				event.preventDefault();
				this.moveHighlight(event.key === "ArrowDown" ? 1 : -1, suggestions);
				return;
			case "Enter":
				event.preventDefault();
				this.add(suggestions[this.highlighted] ?? this.input.value);
				return;
			case ",":
				event.preventDefault();
				this.add(this.input.value);
				return;
			case "Backspace":
				if (!this.input.value) this.remove(this.tags[this.tags.length - 1]);
				return;
		}
	}

	private moveHighlight(step: number, suggestions: readonly string[]): void {
		const count = Math.max(suggestions.length, 1);
		this.highlighted =
			this.highlighted < 0
				? step > 0
					? 0
					: count - 1
				: (this.highlighted + step + count) % count;
		this.renderSuggestions(suggestions);
	}

	private add(raw: string): void {
		const tag = normalizeTag(raw);
		this.input.value = "";
		if (tag) this.update(dedupe([...this.tags, tag]));
		this.showSuggestions();
	}

	private remove(tag: string | undefined): void {
		if (tag === undefined) return;
		this.update(this.tags.filter((kept) => kept !== tag));
		this.showSuggestions();
	}

	private update(tags: readonly string[]): void {
		this.tags = tags;
		this.renderChips();
		this.input.focus();
	}

	private currentSuggestions(): string[] {
		return suggestTags(this.input.value, this.known, this.tags);
	}

	private showSuggestions(): void {
		this.highlighted = this.input.value ? 0 : -1;
		this.renderSuggestions(this.currentSuggestions());
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

	private renderSuggestions(suggestions: readonly string[]): void {
		this.suggestionsEl.empty();
		if (this.input.ownerDocument.activeElement !== this.input) return;

		suggestions.forEach((tag, index) => {
			const item = this.suggestionsEl.createDiv({
				cls: "ew-tag-suggestion",
				text: `#${tag}`,
			});
			item.toggleClass("is-selected", index === this.highlighted);
			// Mousedown, not click: a click would blur the input and close the list first.
			item.addEventListener("mousedown", (event) => {
				event.preventDefault();
				this.add(tag);
			});
		});
	}
}
