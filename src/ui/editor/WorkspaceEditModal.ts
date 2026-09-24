import { App, Modal, Setting } from "obsidian";
import { formatSummary, summarizeLayout } from "../../core/layout";
import { parseTags, type EditableMeta, type WorkspaceMeta } from "../../core/organize";

export interface EditOptions {
	readonly name: string;
	readonly meta: WorkspaceMeta;
	readonly layout: unknown;
	readonly previewNameCount: number;
	readonly onSave: (patch: EditableMeta) => void;
}

export class WorkspaceEditModal extends Modal {
	private tags: readonly string[];
	private description: string;

	constructor(
		app: App,
		private readonly opts: EditOptions,
	) {
		super(app);
		this.tags = [...opts.meta.tags];
		this.description = opts.meta.description;
	}

	override onOpen(): void {
		this.titleEl.setText(this.opts.name);

		// Shows what a description replaces, before the user saves one.
		const preview = formatSummary(
			summarizeLayout(this.opts.layout),
			this.opts.previewNameCount,
		);
		this.contentEl.createEl("p", { cls: "ew-preview", text: preview });

		new Setting(this.contentEl)
			.setName("Tags")
			.setDesc("Separate with commas or spaces. The # is optional.")
			.addText((text) =>
				text
					.setPlaceholder("writing, deep-work")
					.setValue(this.tags.join(", "))
					.onChange((value) => (this.tags = parseTags(value))),
			);

		new Setting(this.contentEl)
			.setName("Description")
			.setDesc("Replaces the generated preview above. Leave empty to keep the preview.")
			.addTextArea((area) =>
				area
					.setPlaceholder("What this workspace is for")
					.setValue(this.description)
					.onChange((value) => (this.description = value.trim())),
			);

		new Setting(this.contentEl)
			.addButton((button) =>
				button
					.setButtonText("Save")
					.setCta()
					.onClick(() => {
						this.close();
						this.opts.onSave({ tags: this.tags, description: this.description });
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
