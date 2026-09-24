import { App, Modal, Setting } from "obsidian";
import { formatSummary, summarizeLayout } from "../../core/layout";
import {
	subtitleOf,
	type Subtitle,
	type TagCount,
	type WorkspaceMeta,
} from "../../core/organize";
import type { WorkspaceEdit } from "../../core/switching";
import { TagPicker } from "./TagPicker";

export interface EditOptions {
	readonly name: string;
	readonly meta: WorkspaceMeta;
	readonly layout: unknown;
	readonly previewNameCount: number;
	/** Every tag in use, for suggestions. */
	readonly knownTags: readonly TagCount[];
	readonly onSave: (edit: WorkspaceEdit) => void;
}

const SUBTITLE_LABELS: Readonly<Record<Subtitle, string>> = {
	description: "Description",
	preview: "Generated preview",
};

export class WorkspaceEditModal extends Modal {
	private name: string;
	private subtitle: Subtitle;
	private description: string;
	private tagPicker: TagPicker | null = null;

	constructor(
		app: App,
		private readonly opts: EditOptions,
	) {
		super(app);
		this.name = opts.name;
		this.subtitle = subtitleOf(opts.meta);
		this.description = opts.meta.description;
	}

	override onOpen(): void {
		this.titleEl.setText(`Edit "${this.opts.name}"`);
		this.contentEl.addClass("ew-edit-modal");

		new Setting(this.contentEl).setName("Name").addText((text) =>
			text
				.setPlaceholder("Workspace name")
				.setValue(this.name)
				.onChange((value) => (this.name = value)),
		);

		this.stackedHeading(
			"Tags",
			"Type to see tags you already use. Press Enter to pick one.",
		);
		this.tagPicker = new TagPicker(
			this.app,
			this.contentEl,
			this.opts.meta.tags,
			this.opts.knownTags,
		);

		this.renderSubtitle();
		this.renderDescription();

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

	private renderSubtitle(): void {
		const preview = formatSummary(
			summarizeLayout(this.opts.layout),
			this.opts.previewNameCount,
		);
		new Setting(this.contentEl)
			.setName("Show under the name")
			.setDesc(`Generated preview: ${preview}`)
			.addDropdown((dropdown) => {
				for (const [value, label] of Object.entries(SUBTITLE_LABELS)) {
					dropdown.addOption(value, label);
				}
				dropdown
					.setValue(this.subtitle)
					.onChange((value) => (this.subtitle = value as Subtitle));
			});
	}

	private renderDescription(): void {
		this.stackedHeading(
			"Description",
			"What this workspace is for. With no description, the preview shows instead.",
		);
		const area = this.contentEl.createEl("textarea", {
			cls: "ew-description-input",
			attr: { rows: "4", placeholder: "What this workspace is for" },
		});
		area.value = this.description;
		area.addEventListener("input", () => (this.description = area.value.trim()));
	}

	/** A heading with no control, so the field below it can use the full width. */
	private stackedHeading(name: string, desc: string): void {
		new Setting(this.contentEl)
			.setName(name)
			.setDesc(desc)
			.setClass("ew-stacked-heading");
	}

	private save(): void {
		if (!this.name.trim()) return;
		this.close();
		this.opts.onSave({
			name: this.name,
			tags: this.tagPicker?.value() ?? this.opts.meta.tags,
			description: this.description,
			subtitle: this.subtitle,
		});
	}

	override onClose(): void {
		this.contentEl.empty();
	}
}
