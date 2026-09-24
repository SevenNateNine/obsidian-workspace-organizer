import { App, Modal, Setting } from "obsidian";

export interface ConfirmOptions {
	readonly title: string;
	readonly message: string;
	readonly cta: string;
	readonly onConfirm: () => void;
}

export class ConfirmModal extends Modal {
	constructor(
		app: App,
		private readonly opts: ConfirmOptions,
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
