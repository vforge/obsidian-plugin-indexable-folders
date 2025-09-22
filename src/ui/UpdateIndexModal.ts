import { App, Modal, Notice, Setting, TFolder } from 'obsidian';

export class UpdateIndexModal extends Modal {
    folder: TFolder;
    onSubmit: (newIndex: number) => Promise<void>;
    conflictEl: HTMLElement;

    constructor(
        app: App,
        folder: TFolder,
        onSubmit: (newIndex: number) => Promise<void>
    ) {
        super(app);
        this.folder = folder;
        this.onSubmit = onSubmit;
    }

    private checkForConflicts(
        newIndex: string,
        prefixLength: number
    ): string[] {
        if (!this.folder.parent) return [];

        const paddedIndex = newIndex.padStart(prefixLength, '0');
        const conflicts: string[] = [];

        for (const child of this.folder.parent.children) {
            if (child === this.folder) continue;

            const numericPrefixRegex = new RegExp(`^${paddedIndex}_`);
            if (numericPrefixRegex.test(child.name)) {
                conflicts.push(child.name);
            }
        }

        return conflicts;
    }

    private updateConflictDisplay(conflicts: string[]) {
        this.conflictEl.empty();

        if (conflicts.length === 0) {
            this.conflictEl.style.display = 'none';
            return;
        }

        this.conflictEl.style.display = 'block';
        this.conflictEl.createEl('div', {
            text: 'Files with this index:',
            cls: 'indexable-folder-conflict-header',
        });

        const list = this.conflictEl.createEl('ul', {
            cls: 'indexable-folder-conflict-list',
        });

        conflicts.forEach((fileName) => {
            list.createEl('li', {
                text: fileName,
                cls: 'indexable-folder-conflict-item',
            });
        });
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
                text.setPlaceholder(
                    `Enter a value from 0 to ${maxNumber}`
                ).setValue(prefix);
                text.inputEl.maxLength = prefixLength;

                text.inputEl.addEventListener('input', () => {
                    if (text.inputEl.value.length > prefixLength) {
                        text.inputEl.value = text.inputEl.value.slice(
                            0,
                            prefixLength
                        );
                    }

                    // Check for conflicts when user types
                    const currentValue = text.inputEl.value;
                    if (currentValue) {
                        const conflicts = this.checkForConflicts(
                            currentValue,
                            prefixLength
                        );
                        this.updateConflictDisplay(conflicts);
                    } else {
                        this.updateConflictDisplay([]);
                    }
                });

                // Initial conflict check
                const initialConflicts = this.checkForConflicts(
                    prefix,
                    prefixLength
                );
                setTimeout(
                    () => this.updateConflictDisplay(initialConflicts),
                    0
                );
            });

        // Create conflict display element
        this.conflictEl = contentEl.createEl('div', {
            cls: 'indexable-folder-conflicts',
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
