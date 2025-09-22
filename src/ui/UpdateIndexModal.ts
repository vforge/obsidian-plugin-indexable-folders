import { App, Modal, Notice, Setting, TFolder } from 'obsidian';

export class UpdateIndexModal extends Modal {
    folder: TFolder;
    onSubmit: (newIndex: number) => Promise<void>;
    conflictEl: HTMLElement;
    errorEl: HTMLElement;

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

    private validateInput(
        inputValue: string,
        prefixLength: number
    ): string | null {
        if (!inputValue) {
            return 'Index cannot be empty';
        }

        if (!/^\d+$/.test(inputValue)) {
            return 'Index must contain only digits';
        }

        if (inputValue.length !== prefixLength) {
            return `Index must be exactly ${prefixLength} digits long`;
        }

        const numValue = parseInt(inputValue, 10);
        const maxNumber = Math.pow(10, prefixLength) - 1;

        if (isNaN(numValue) || numValue < 0 || numValue > maxNumber) {
            return `Index must be between ${'0'.repeat(prefixLength)} and ${'9'.repeat(prefixLength)}`;
        }

        return null;
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

    private updateErrorDisplay(errorMessage: string | null) {
        this.errorEl.empty();

        if (!errorMessage) {
            this.errorEl.style.display = 'none';
            return;
        }

        this.errorEl.style.display = 'block';
        this.errorEl.createEl('div', {
            text: 'Error:',
            cls: 'indexable-folder-error-header',
        });

        this.errorEl.createEl('div', {
            text: errorMessage,
            cls: 'indexable-folder-error-message',
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

        contentEl.createEl('h2', {
            text: `Update index for "${this.folder.name}"`,
        });

        const form = contentEl.createEl('form');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const input = form.querySelector('input')!;
            const inputValue = input.value;

            const validationError = this.validateInput(
                inputValue,
                prefixLength
            );
            if (validationError) {
                new Notice(validationError);
                return;
            }

            const newIndex = parseInt(inputValue, 10);
            this.close();
            await this.onSubmit(newIndex);
        };

        new Setting(form)
            .setName(`New index (must be ${prefixLength} digits)`)
            .setDesc(`Enter exactly ${prefixLength} digits (e.g., ${prefix})`)
            .addText((text) => {
                text.inputEl.type = 'text';
                text.inputEl.pattern = `\\d{${prefixLength}}`;
                text.setPlaceholder(
                    `${'0'.repeat(prefixLength)} - ${'9'.repeat(prefixLength)}`
                ).setValue(prefix);
                text.inputEl.maxLength = prefixLength;

                text.inputEl.addEventListener('input', (e) => {
                    const target = e.target as HTMLInputElement;

                    // Only allow digits
                    target.value = target.value.replace(/\D/g, '');

                    // Enforce exact length
                    if (target.value.length > prefixLength) {
                        target.value = target.value.slice(0, prefixLength);
                    }

                    const currentValue = target.value;

                    // Validate input and show errors
                    const validationError = this.validateInput(
                        currentValue,
                        prefixLength
                    );
                    this.updateErrorDisplay(validationError);

                    // Check for conflicts only if input is valid
                    if (
                        !validationError &&
                        currentValue.length === prefixLength
                    ) {
                        const conflicts = this.checkForConflicts(
                            currentValue,
                            prefixLength
                        );
                        this.updateConflictDisplay(conflicts);
                    } else {
                        this.updateConflictDisplay([]);
                    }
                });

                // Prevent non-digit characters on keypress
                text.inputEl.addEventListener('keypress', (e) => {
                    if (
                        !/\d/.test(e.key) &&
                        ![
                            'Backspace',
                            'Delete',
                            'Tab',
                            'Enter',
                            'ArrowLeft',
                            'ArrowRight',
                        ].includes(e.key)
                    ) {
                        e.preventDefault();
                    }
                });

                // Initial validation and conflict check
                const initialError = this.validateInput(prefix, prefixLength);
                const initialConflicts = this.checkForConflicts(
                    prefix,
                    prefixLength
                );

                setTimeout(() => {
                    this.updateErrorDisplay(initialError);
                    this.updateConflictDisplay(initialConflicts);
                }, 0);
            });

        // Create error display element
        this.errorEl = contentEl.createEl('div', {
            cls: 'indexable-folder-errors',
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
