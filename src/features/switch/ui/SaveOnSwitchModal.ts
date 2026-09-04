import { App, Modal, Setting } from "obsidian";

export type SwitchChoice = "save" | "save-as" | "discard";

/**
 * Ask what to do with the current layout before switching away.
 *
 * Shown on every switch, or only after `layoutsDiffer` reports a change, as the
 * `promptOnSwitch` setting says. The comparison walks an undocumented tree that
 * core can reshape in any release, so it fails toward showing this modal.
 */
export class SaveOnSwitchModal extends Modal {
	constructor(
		app: App,
		private readonly opts: {
			current: string;
			target: string;
			onChoose: (choice: SwitchChoice) => void;
		},
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
