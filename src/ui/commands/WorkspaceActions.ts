import { App, Notice } from "obsidian";
import type { PluginSettings, StorageMode } from "../../core/settings";
import type { WorkspaceService } from "../../core/switching";
import { WorkspaceEditModal } from "../editor";
import { ConfirmModal, PromptModal, attempt } from "../shared";
import { SwitcherModal } from "../switcher";
import { SaveOnSwitchModal } from "./SaveOnSwitchModal";

type After = () => void;

const CORE_CONFLICT_NOTICE =
	"Workspace Organizer is read-only while the core Workspaces plugin is on. " +
	"Turn it off in Settings, Core plugins, then reload Obsidian.";

/** Every user action. Each one runs through `attempt`, then refreshes the view. */
export class WorkspaceActions {
	private warnedAboutCore = false;

	constructor(
		private readonly app: App,
		private readonly service: WorkspaceService,
		private readonly afterChange: After,
	) {}

	async run(action: () => Promise<void>): Promise<void> {
		await attempt(action);
		this.afterChange();
	}

	async reload(): Promise<void> {
		await this.service.reload();
		this.warnIfCoreEnabled();
	}

	/** Once per conflict. Core reads the file only at startup, so a reload is necessary. */
	private warnIfCoreEnabled(): void {
		const blocked = !this.service.registry.canMutate();
		if (blocked && !this.warnedAboutCore) new Notice(CORE_CONFLICT_NOTICE, 10000);
		this.warnedAboutCore = blocked;
	}

	activeName(): string | null {
		return this.service.registry.activeName();
	}

	openSwitcher(): void {
		void this.run(async () => {
			await this.reload();
			const { showArchived, previewNameCount } = this.service.settings;
			new SwitcherModal(this.app, {
				registry: this.service.registry,
				showArchived,
				previewNameCount,
				onChoose: (name) => this.switchTo(name),
			}).open();
		});
	}

	switchTo(target: string): void {
		void this.run(async () => {
			if (await this.service.needsPrompt(target)) this.askBeforeSwitch(target);
			else await this.service.load(target);
		});
	}

	private askBeforeSwitch(target: string): void {
		const current = this.activeName();
		if (!current) return;

		new SaveOnSwitchModal(this.app, {
			current,
			target,
			onChoose: (choice) => {
				if (choice === "save-as")
					return this.promptSaveAs(() => this.switchNow(target));
				void this.run(async () => {
					if (choice === "save") await this.service.save(current);
					await this.service.load(target);
				});
			},
		}).open();
	}

	private switchNow(target: string): void {
		void this.run(() => this.service.load(target));
	}

	step(delta: number): void {
		const next = this.service.step(delta);
		if (next) this.switchTo(next);
		else new Notice("No other workspace to switch to.");
	}

	async saveActive(): Promise<void> {
		const active = this.activeName();
		if (!active) return this.promptSaveAs();
		await this.run(() => this.saveAndNotify(active));
	}

	promptSaveAs(after?: After): void {
		new PromptModal(this.app, {
			title: "Save layout as",
			placeholder: "Workspace name",
			cta: "Save",
			onSubmit: (name) =>
				void this.run(async () => {
					await this.saveAndNotify(name);
					after?.();
				}),
		}).open();
	}

	private async saveAndNotify(name: string): Promise<void> {
		await this.service.save(name);
		new Notice(`Saved "${name}".`);
	}

	renameActive(): void {
		const active = this.activeName();
		if (active) this.promptRename(active);
		else new Notice("No workspace is active yet. Save the current layout first.");
	}

	promptRename(name: string, after?: After): void {
		new PromptModal(this.app, {
			title: `Rename "${name}"`,
			initial: name,
			cta: "Rename",
			onSubmit: (next) =>
				this.mutate(() => this.service.registry.rename(name, next), after),
		}).open();
	}

	promptDuplicate(name: string, after?: After): void {
		new PromptModal(this.app, {
			title: `Duplicate "${name}"`,
			initial: `${name} copy`,
			cta: "Duplicate",
			onSubmit: (next) =>
				this.mutate(() => this.service.registry.duplicate(name, next), after),
		}).open();
	}

	promptDelete(name: string, after?: After): void {
		new ConfirmModal(this.app, {
			title: `Delete "${name}"`,
			message: "The saved layout is removed. Open notes are not affected.",
			cta: "Delete",
			onConfirm: () => this.mutate(() => this.service.registry.remove(name), after),
		}).open();
	}

	openEditor(name: string, after?: After): void {
		const meta = this.service.registry.metaOf(name);
		if (!meta) return;

		new WorkspaceEditModal(this.app, {
			name,
			meta,
			layout: this.service.registry.layoutOf(name),
			previewNameCount: this.service.settings.previewNameCount,
			onSave: (patch) =>
				this.mutate(() => this.service.registry.setMeta(name, patch), after),
		}).open();
	}

	toggleArchived(name: string, after?: After): void {
		const archived = this.service.registry.metaOf(name)?.archived ?? false;
		this.mutate(
			() => this.service.registry.setMeta(name, { archived: !archived }),
			after,
		);
	}

	moveBy(name: string, delta: number, after?: After): void {
		this.mutate(() => this.service.registry.moveBy(name, delta), after);
	}

	updateSettings(patch: Partial<PluginSettings>, after?: After): void {
		this.mutate(() => this.service.updateSettings(patch), after);
	}

	setStorage(mode: StorageMode, after?: After): void {
		this.mutate(async () => {
			await this.service.setStorage(mode);
			this.warnIfCoreEnabled();
		}, after);
	}

	private mutate(change: () => Promise<void>, after?: After): void {
		void this.run(async () => {
			await change();
			after?.();
		});
	}
}
