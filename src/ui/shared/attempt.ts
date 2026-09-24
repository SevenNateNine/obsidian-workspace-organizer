import { Notice } from "obsidian";
import { userMessage } from "../../core/shared";

/** The only error boundary. The user gets a sentence, the developer gets the stack. */
export async function attempt(action: () => Promise<void>): Promise<void> {
	try {
		await action();
	} catch (err) {
		new Notice(userMessage(err));
		console.error("[workspace-organizer] action failed", err);
	}
}
