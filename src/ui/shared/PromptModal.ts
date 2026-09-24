import { App, Modal, Setting } from "obsidian";

export interface PromptOptions {
	readonly title: string;
	readonly placeholder?: string;
	readonly initial?: string;
	readonly cta: string;
	readonly onSubmit: (value: string) => void;
}

export class PromptModal extends Modal {
	private value: string;

	constructor(
		app: App,
		private readonly opts: PromptOptions,
	) {
		super(app);
		this.value = opts.initial ?? "";
	}

	override onOpen(): void {
		this.titleEl.setText(this.opts.title);

		const input = this.contentEl.createEl("input", {
			type: "text",
			cls: "ew-prompt-input",
			value: this.value,
		});
		if (this.opts.placeholder) input.placeholder = this.opts.placeholder;

		input.addEventListener("input", () => (this.value = input.value));
		input.addEventListener("keydown", (event) => {
			if (event.key !== "Enter") return;
			event.preventDefault();
			this.submit();
		});

		new Setting(this.contentEl)
			.addButton((button) =>
				button
					.setButtonText(this.opts.cta)
					.setCta()
					.onClick(() => this.submit()),
			)
			.addButton((button) =>
				button.setButtonText("Cancel").onClick(() => this.close()),
			);

		// Rename and duplicate start from a name that the user usually replaces.
		input.focus();
		input.select();
	}

	private submit(): void {
		const value = this.value.trim();
		if (!value) return;
		this.close();
		this.opts.onSubmit(value);
	}

	override onClose(): void {
		this.contentEl.empty();
	}
}
