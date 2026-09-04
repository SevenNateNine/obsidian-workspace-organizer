import { Modal, Setting } from "obsidian";
import type { SliceContext } from "../../../shared/context";
import {
	formatSummary,
	summarizeLayout,
} from "../../../shared/domain/workspace/layoutSummary";
import { parseTags } from "../../../shared/domain/workspace/tags";
import type { WorkspaceMeta } from "../../../shared/domain/workspace/meta";

export class WorkspaceEditModal extends Modal {
	private tags: string[];
	private description: string;

	constructor(
		private readonly ctx: SliceContext,
		private readonly name: string,
		meta: WorkspaceMeta,
		private readonly after?: () => void,
	) {
		super(ctx.app);
		this.tags = [...meta.tags];
		this.description = meta.description;
	}

	override onOpen(): void {
		this.titleEl.setText(this.name);

		// Shown so the user can see what a description would replace, rather than
		// discovering the trade after saving.
		const preview = formatSummary(
			summarizeLayout(this.ctx.registry().layoutOf(this.name)),
			this.ctx.settings().previewNameCount,
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
						this.save();
					}),
			)
			.addButton((button) =>
				button.setButtonText("Cancel").onClick(() => this.close()),
			);
	}

	private save(): void {
		void this.ctx.attempt(async () => {
			await this.ctx.registry().setMeta(this.name, {
				tags: this.tags,
				description: this.description,
			});
			this.after?.();
		});
	}

	override onClose(): void {
		this.contentEl.empty();
	}
}
