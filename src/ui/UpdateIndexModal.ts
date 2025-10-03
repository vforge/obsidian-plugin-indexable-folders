import { App, Modal, Notice, Setting, TFolder } from 'obsidian';
import IndexableFoldersPlugin from '../main';

export class UpdateIndexModal extends Modal {
    folder: TFolder;
    plugin: IndexableFoldersPlugin;
    onSubmit: (newIndex: number) => Promise<void>;
    conflictEl: HTMLElement;
    errorEl: HTMLElement;
    successEl: HTMLElement;

    constructor(
        app: App,
        plugin: IndexableFoldersPlugin,
        folder: TFolder,
        onSubmit: (newIndex: number) => Promise<void>
    ) {
        super(app);
        this.plugin = plugin;
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
        const escapedSeparator = this.plugin.settings.separator.replace(
            /[-\\^$*+?.()|[\]{}]/g,
            '\\$&'
        );

        for (const child of this.folder.parent.children) {
            if (child === this.folder) continue;

            const numericPrefixRegex = new RegExp(
                `^${paddedIndex}${escapedSeparator}`
            );
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

    private updateSuccessDisplay(
        isValid: boolean,
        hasConflicts: boolean,
        newIndexValue: string
    ) {
        this.successEl.empty();

        if (!isValid || hasConflicts) {
            this.successEl.style.display = 'none';
            return;
        }

        this.successEl.style.display = 'block';
        this.successEl.createEl('div', {
            text: 'Ready to update:',
            cls: 'indexable-folder-success-header',
        });

        const currentName = this.folder.name;
        const numericPrefixRegex = this.plugin.getNumericPrefixRegex();
        const newName = currentName.replace(
            numericPrefixRegex,
            `${newIndexValue}${this.plugin.settings.separator}`
        );

        this.successEl.createEl('div', {
            text: `${currentName} → ${newName}`,
            cls: 'indexable-folder-success-message',
        });
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('indexable-folder-modal');

        const numericPrefixRegex = this.plugin.getNumericPrefixRegex();
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
        let inputElement: HTMLInputElement;

        new Setting(form)
            .setName(`New index (must be ${prefixLength} digits)`)
            .setDesc(`Enter exactly ${prefixLength} digits (e.g., ${prefix})`)
            .addText((text) => {
                inputElement = text.inputEl;
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

                    // Check for conflicts
                    const conflicts = this.checkForConflicts(
                        currentValue,
                        prefixLength
                    );

                    if (
                        !validationError &&
                        currentValue.length === prefixLength
                    ) {
                        this.updateConflictDisplay(conflicts);
                    } else {
                        this.updateConflictDisplay([]);
                    }

                    // Show success feedback when everything is valid
                    const isValid =
                        !validationError &&
                        currentValue.length === prefixLength;
                    const hasConflicts = conflicts.length > 0;

                    this.updateSuccessDisplay(
                        isValid,
                        hasConflicts,
                        currentValue
                    );
                });

                // Prevent non-digit characters on keypress
                text.inputEl.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        // Trigger the same logic as the button click
                        const inputValue = inputElement.value;
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
                        void this.onSubmit(newIndex);
                        return;
                    }

                    if (
                        !/\d/.test(e.key) &&
                        ![
                            'Backspace',
                            'Delete',
                            'Tab',
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
                const isInitiallyValid =
                    !initialError && prefix.length === prefixLength;
                const hasInitialConflicts = initialConflicts.length > 0;

                setTimeout(() => {
                    this.updateErrorDisplay(initialError);
                    this.updateConflictDisplay(initialConflicts);
                    this.updateSuccessDisplay(
                        isInitiallyValid,
                        hasInitialConflicts,
                        prefix
                    );
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

        // Create success display element
        this.successEl = contentEl.createEl('div', {
            cls: 'indexable-folder-success',
        });

        new Setting(form).addButton((button) =>
            button
                .setButtonText('Update')
                .setCta()
                .onClick(async () => {
                    const inputValue = inputElement.value;

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
                })
        );
    }

    onClose() {
        this.contentEl.empty();
    }
}
