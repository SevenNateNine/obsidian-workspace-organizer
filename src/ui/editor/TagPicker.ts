import { AbstractInputSuggest, setIcon, type App } from "obsidian";
import {
	dedupe,
	normalizeTag,
	sameTag,
	suggestTags,
	type TagCount,
} from "../../core/organize";

/** Nothing until the user types, so Enter in an empty field does not add a tag. */
function matchingTags(
	query: string,
	known: readonly TagCount[],
	chosen: readonly string[],
): TagCount[] {
	if (!query.trim()) return [];
	const byTag = new Map(known.map((entry) => [entry.tag, entry]));
	return suggestTags(query, known, chosen)
		.map((tag) => byTag.get(tag))
		.filter((entry): entry is TagCount => entry !== undefined);
}

class TagSuggest extends AbstractInputSuggest<TagCount> {
	constructor(
		app: App,
		input: HTMLDivElement,
		private readonly known: readonly TagCount[],
		private readonly chosen: () => readonly string[],
	) {
		super(app, input);
	}

	protected getSuggestions(query: string): TagCount[] {
		return matchingTags(query, this.known, this.chosen());
	}

	/** The name, with the count at the right, like the tags property. */
	renderSuggestion({ tag, count }: TagCount, el: HTMLElement): void {
		el.addClass("mod-complex");
		el.createDiv({ cls: "suggestion-content" }).createDiv({
			cls: "suggestion-title",
			text: tag,
		});
		el.createDiv({ cls: "suggestion-aux" }).createSpan({
			cls: "suggestion-flair",
			text: String(count),
		});
	}
}

/**
 * A copy of the tags property in Obsidian. It uses the app's own `multi-select-*`
 * classes, so each theme styles it like the native field. Those classes are not
 * public API. If Obsidian renames them, only the look breaks.
 */
export class TagPicker {
	private tags: readonly string[];
	private readonly containerEl: HTMLElement;
	private readonly input: HTMLDivElement;
	private readonly suggest: TagSuggest;

	constructor(
		app: App,
		parent: HTMLElement,
		initial: readonly string[],
		private readonly known: readonly TagCount[],
	) {
		this.tags = dedupe(initial);
		this.containerEl = parent.createDiv({
			cls: "multi-select-container ew-tag-picker",
		});
		this.input = createDiv({
			cls: "multi-select-input",
			attr: {
				contenteditable: "plaintext-only",
				placeholder: "Add a tag",
				"aria-label": "Add a tag",
			},
		});

		this.suggest = new TagSuggest(app, this.input, known, () => this.tags);
		this.suggest.onSelect(({ tag }) => this.add(tag));

		this.containerEl.addEventListener("click", (event) => {
			if (event.target === this.containerEl) this.focusInput();
		});
		this.input.addEventListener("keydown", (event) => this.onInputKey(event));
		this.input.addEventListener("input", () => this.markInvalid(false));
		this.render();
	}

	/** Includes valid text that was typed but not yet added, so Save does not lose it. */
	value(): readonly string[] {
		const pending = normalizeTag(this.typed());
		return pending ? dedupe([...this.tags, pending]) : this.tags;
	}

	private typed(): string {
		return this.input.textContent ?? "";
	}

	/**
	 * When suggestions show, Enter belongs to `TagSuggest`. A tag cannot hold a
	 * space, so Space adds the tag, as a comma does.
	 */
	private onInputKey(event: KeyboardEvent): void {
		const typed = this.typed();
		if (event.key === "Enter") {
			if (matchingTags(typed, this.known, this.tags).length > 0) return;
			event.preventDefault();
			this.commit(typed);
		} else if (event.key === "," || event.key === " ") {
			event.preventDefault();
			this.commit(typed);
		} else if ((event.key === "Backspace" || event.key === "ArrowLeft") && !typed) {
			// The first Backspace selects the last pill. The second removes it.
			event.preventDefault();
			this.focusPill(this.tags.length - 1);
		}
	}

	private onPillKey(event: KeyboardEvent, index: number): void {
		switch (event.key) {
			case "Backspace":
			case "Delete":
				event.preventDefault();
				this.removeAt(index);
				break;
			case "ArrowLeft":
				event.preventDefault();
				this.focusPill(Math.max(index - 1, 0));
				break;
			case "ArrowRight":
				event.preventDefault();
				this.focusPill(index + 1);
				break;
			case "Enter":
				event.preventDefault();
				this.edit(index);
				break;
		}
	}

	/** Invalid text stays in the field, marked, so the user can correct it. */
	private commit(raw: string): void {
		if (!raw.trim()) return;
		const tag = normalizeTag(raw);
		if (tag) this.add(tag);
		else this.markInvalid(true);
	}

	/** A duplicate is not added. The existing pill flashes, as in Obsidian. */
	private add(tag: string): void {
		this.suggest.setValue("");
		this.suggest.close();
		const existing = this.tags.findIndex((kept) => sameTag(kept, tag));
		if (existing < 0) this.update([...this.tags, tag]);
		else this.pillAt(existing)?.addClass("multi-select-duplicate");
		this.focusInput();
	}

	private removeAt(index: number): void {
		this.update(this.tags.filter((_, at) => at !== index));
		this.focusInput();
	}

	/** As in the tags property: the text of the pill goes back into the field. */
	private edit(index: number): void {
		const tag = this.tags[index];
		if (tag === undefined) return;
		const rest = this.tags.filter((_, at) => at !== index);
		const pending = normalizeTag(this.typed());
		this.update(pending ? dedupe([...rest, pending]) : rest);
		this.suggest.setValue(tag);
		this.focusInput();
	}

	private update(tags: readonly string[]): void {
		this.tags = tags;
		this.render();
	}

	private pillAt(index: number): HTMLElement | undefined {
		return this.containerEl.querySelectorAll<HTMLElement>(".multi-select-pill")[index];
	}

	/** An index past the last pill focuses the field. */
	private focusPill(index: number): void {
		const pill = this.pillAt(index);
		if (pill) pill.focus();
		else this.focusInput();
	}

	/** The caret goes after the text, not before it. */
	private focusInput(): void {
		this.input.focus();
		const selection = this.input.win.getSelection();
		if (!selection) return;
		selection.selectAllChildren(this.input);
		selection.collapseToEnd();
	}

	private markInvalid(invalid: boolean): void {
		this.input.toggleClass("is-invalid", invalid);
		this.input.setAttr("aria-invalid", invalid ? "true" : null);
	}

	private render(): void {
		this.containerEl.empty();
		this.tags.forEach((tag, index) => this.renderPill(tag, index));
		this.containerEl.appendChild(this.input);
	}

	private renderPill(tag: string, index: number): void {
		const pill = this.containerEl.createDiv({
			cls: "multi-select-pill",
			attr: { tabindex: "0" },
		});
		const content = pill.createDiv({ cls: "multi-select-pill-content" });
		content.createSpan({ text: tag });
		content.addEventListener("click", () => this.edit(index));

		const remove = pill.createDiv({
			cls: "multi-select-pill-remove-button",
			attr: { "aria-label": `Remove ${tag}` },
		});
		setIcon(remove, "x");
		remove.addEventListener("click", (event) => {
			event.stopPropagation();
			this.removeAt(index);
		});
		pill.addEventListener("keydown", (event) => this.onPillKey(event, index));
		// So that the next duplicate flashes again.
		pill.addEventListener("animationend", () =>
			pill.removeClass("multi-select-duplicate"),
		);
	}
}
