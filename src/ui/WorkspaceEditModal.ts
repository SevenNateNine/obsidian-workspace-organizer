import { App, Modal, Setting } from "obsidian";
import {
	formatSummary,
	summarizeLayout,
} from "../shared/domain/workspace/layoutSummary";
import { parseTags } from "../shared/domain/workspace/tags";
import type { WorkspaceMeta } from "../shared/domain/workspace/meta";

/** Edit the tags and description of one workspace. */
export class WorkspaceEditModal extends Modal {
	private tags: string[];
	private description: string;

	constructor(
		app: App,
		private readonly opts: {
			name: string;
			meta: WorkspaceMeta;
			layout: unknown;
			previewNameCount: number;
			onSave: (patch: Pick<WorkspaceMeta, "tags" | "description">) => void;
		},
	) {
		super(app);
		this.tags = [...opts.meta.tags];
		this.description = opts.meta.description;
	}

	override onOpen(): void {
		this.titleEl.setText(this.opts.name);

		// Shown so the user can see what a description would replace, rather than
		// discovering the trade after saving.
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
