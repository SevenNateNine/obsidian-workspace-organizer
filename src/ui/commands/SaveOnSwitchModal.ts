import { App, Modal, Setting } from "obsidian";

export type SwitchChoice = "save" | "save-as" | "discard";

export interface SaveOnSwitchOptions {
	readonly current: string;
	readonly target: string;
	readonly onChoose: (choice: SwitchChoice) => void;
}

/** Core overwrites a workspace only when told to, so a switch drops unsaved changes. */
export class SaveOnSwitchModal extends Modal {
	constructor(
		app: App,
		private readonly opts: SaveOnSwitchOptions,
	) {
		super(app);
	}

	override onOpen(): void {
		this.titleEl.setText(`Switch to ${this.opts.target}`);
		this.contentEl.createEl("p", {
			text: `Save the current layout to "${this.opts.current}" first?`,
		});

		new Setting(this.contentEl)
			.addButton((button) =>
				button
					.setButtonText("Save and switch")
					.setCta()
					.onClick(() => this.choose("save")),
			)
			.addButton((button) =>
				button.setButtonText("Save as new…").onClick(() => this.choose("save-as")),
			)
			.addButton((button) =>
				button
					.setButtonText("Switch without saving")
					.onClick(() => this.choose("discard")),
			);
	}

	private choose(choice: SwitchChoice): void {
		this.close();
		this.opts.onChoose(choice);
	}

	override onClose(): void {
		this.contentEl.empty();
	}
}
