import { App, Modal, Setting } from "obsidian";

/** Ask for a single line of text. Used for save-as, rename, and duplicate. */
export class PromptModal extends Modal {
	private value: string;

	constructor(
		app: App,
		private readonly opts: {
			title: string;
			placeholder?: string;
			initial?: string;
			cta: string;
			onSubmit: (value: string) => void;
		},
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
			if (event.key === "Enter") {
				event.preventDefault();
				this.submit();
			}
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

		// Selected rather than merely focused: rename and duplicate both start
		// from an existing name that the user usually replaces wholesale.
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

/** Confirm something destructive. */
export class ConfirmModal extends Modal {
	constructor(
		app: App,
		private readonly opts: {
			title: string;
			message: string;
			cta: string;
			onConfirm: () => void;
		},
	) {
		super(app);
	}

	override onOpen(): void {
		this.titleEl.setText(this.opts.title);
		this.contentEl.createEl("p", { text: this.opts.message });

		new Setting(this.contentEl)
			.addButton((button) =>
				button
					.setButtonText(this.opts.cta)
					.setWarning()
					.onClick(() => {
						this.close();
						this.opts.onConfirm();
					}),
			)
			.addButton((button) =>
				button.setButtonText("Cancel").onClick(() => this.close()),
			);
	}

	override onClose(): void {
		this.contentEl.empty();
	}
}
