import { App, Modal, Notice, Setting, TFolder } from 'obsidian';

export class UpdateIndexModal extends Modal {
	folder: TFolder;
	onSubmit: (newIndex: number) => Promise<void>;

	constructor(
		app: App,
		folder: TFolder,
		onSubmit: (newIndex: number) => Promise<void>
	) {
		super(app);
		this.folder = folder;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('indexable-folder-modal');

		const numericPrefixRegex = /^(\d+)_/;
		const match = this.folder.name.match(numericPrefixRegex);
		if (!match) {
			this.close();
			return;
		}

		const prefix = match[1];
		const prefixLength = prefix.length;
		const maxNumber = Math.pow(10, prefixLength) - 1;

		contentEl.createEl('h2', {
			text: `Update index for "${this.folder.name}"`,
		});

		const form = contentEl.createEl('form');
		form.onsubmit = async (e) => {
			e.preventDefault();
			const input = form.querySelector('input')!;
			const newIndex = parseInt(input.value, 10);

			if (isNaN(newIndex) || newIndex < 0 || newIndex > maxNumber) {
				new Notice(`Please enter a number between 0 and ${maxNumber}.`);
				return;
			}

			this.close();
			await this.onSubmit(newIndex);
		};

		new Setting(form)
			.setName(`New index (0 - ${maxNumber})`)
			.addText((text) => {
				text.inputEl.type = 'number';
				text
					.setPlaceholder(`Enter a value from 0 to ${maxNumber}`)
					.setValue(prefix);
				text.inputEl.maxLength = prefixLength;
				text.inputEl.addEventListener('input', () => {
					if (text.inputEl.value.length > prefixLength) {
						text.inputEl.value = text.inputEl.value.slice(0, prefixLength);
					}
				});
			});

		new Setting(form).addButton((button) =>
			button
				.setButtonText('Update')
				.setCta()
				.onClick(() => {
					form.requestSubmit();
				})
		);
	}

	onClose() {
		this.contentEl.empty();
	}
}
