import { App, Modal, Setting } from "obsidian";
import { formatSummary, summarizeLayout } from "../../core/layout";
import { parseTags, type WorkspaceMeta } from "../../core/organize";
import type { WorkspaceEdit } from "../../core/switching";

export interface EditOptions {
	readonly name: string;
	readonly meta: WorkspaceMeta;
	readonly layout: unknown;
	readonly previewNameCount: number;
	readonly onSave: (edit: WorkspaceEdit) => void;
}

export class WorkspaceEditModal extends Modal {
	private name: string;
	private tags: readonly string[];
	private description: string;

	constructor(
		app: App,
		private readonly opts: EditOptions,
	) {
		super(app);
		this.name = opts.name;
		this.tags = [...opts.meta.tags];
		this.description = opts.meta.description;
	}

	override onOpen(): void {
		this.titleEl.setText(`Edit "${this.opts.name}"`);

		// Shows what a description replaces, before the user saves one.
		const preview = formatSummary(
			summarizeLayout(this.opts.layout),
			this.opts.previewNameCount,
		);
		this.contentEl.createEl("p", { cls: "ew-preview", text: preview });

		new Setting(this.contentEl).setName("Name").addText((text) =>
			text
				.setPlaceholder("Workspace name")
				.setValue(this.name)
				.onChange((value) => (this.name = value)),
		);

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
					.onClick(() => this.save()),
			)
			.addButton((button) =>
				button.setButtonText("Cancel").onClick(() => this.close()),
			);
	}

	private save(): void {
		if (!this.name.trim()) return;
		this.close();
		this.opts.onSave({
			name: this.name,
			tags: this.tags,
			description: this.description,
		});
	}

	override onClose(): void {
		this.contentEl.empty();
	}
}
