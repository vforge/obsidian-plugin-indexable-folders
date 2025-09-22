import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder } from 'obsidian';

// Remember to rename these classes and interfaces!

interface IndexableFoldersSettings {
    blacklistedPrefixes: string;
}

const DEFAULT_SETTINGS: IndexableFoldersSettings = {
    blacklistedPrefixes: 'zz, xx'
}

export default class IndexableFoldersPlugin extends Plugin {
    settings: IndexableFoldersSettings;
    private folderObserver: MutationObserver;
    private statusBarItemEl: HTMLElement;

    async onload() {
        console.log('Indexable Folders Plugin: loading plugin');
        await this.loadSettings();

        // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
        this.statusBarItemEl = this.addStatusBarItem();

        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new IndexableFoldersSettingTab(this.app, this));

        // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
        this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

        this.app.workspace.onLayoutReady(() => {
            console.log('Indexable Folders Plugin: layout ready');
            this.startFolderObserver();
            this.updateStatusBar();
        });

        this.registerEvent(
            this.app.workspace.on('file-open', () => {
                this.updateStatusBar();
            })
        );

        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                if (!(file instanceof TFolder)) {
                    return;
                }

                this.revertFolderName(file);

                const numericPrefixRegex = /^(\d+)_/;
                const match = file.name.match(numericPrefixRegex);

                if (!match) {
                    return;
                }

                const prefix = match[1];
                const restOfName = file.name.substring(match[0].length);
                const currentNumber = parseInt(prefix, 10);
                const prefixLength = prefix.length;

                // Add "Update index" option
                menu.addItem((item) => {
                    item
                        .setTitle('Update index...')
                        .setIcon('edit')
                        .onClick(() => {
                            new UpdateIndexModal(this.app, file, async (newIndex) => {
                                await this.updateFolderIndex(file, newIndex);
                            }).open();
                        });
                });

                // Add "Move up" option
                menu.addItem((item) => {
                    item
                        .setTitle('Move up')
                        .setIcon('arrow-up')
                        .setDisabled(currentNumber <= 0)
                        .onClick(async () => {
                            if (currentNumber <= 0) return;
                            if (!file.parent) return;

                            const siblings = file.parent.children
                                .filter((f): f is TFolder => f instanceof TFolder && f !== file)
                                .filter(f => numericPrefixRegex.test(f.name));

                            const siblingMap = new Map<number, TFolder>();
                            siblings.forEach(sibling => {
                                const m = sibling.name.match(numericPrefixRegex);
                                if (m) {
                                    siblingMap.set(parseInt(m[1], 10), sibling);
                                }
                            });

                            const foldersToRename: { from: TFolder, to: string }[] = [];
                            let currentNumToShift = currentNumber - 1;

                            while (siblingMap.has(currentNumToShift) && currentNumToShift >= 0) {
                                const folderToShift = siblingMap.get(currentNumToShift)!;
                                const newNum = currentNumToShift - 1;
                                if (newNum < 0) break; // Boundary hit

                                const rest = folderToShift.name.substring(folderToShift.name.indexOf('_') + 1);
                                const newPrefix = String(newNum).padStart(prefixLength, '0');
                                foldersToRename.push({ from: folderToShift, to: `${newPrefix}_${rest}` });
                                currentNumToShift--;
                            }

                            // Add the original folder to be renamed
                            const newPrefix = String(currentNumber - 1).padStart(prefixLength, '0');
                            foldersToRename.push({ from: file, to: `${newPrefix}_${restOfName}` });

                            // Rename from lowest index to highest to avoid conflicts
                            for (const rename of foldersToRename.sort((a, b) => parseInt(a.to) - parseInt(b.to))) {
                                await this.app.fileManager.renameFile(rename.from, `${rename.from.parent.path}/${rename.to}`);
                            }
                        });
                });

                // Add "Move down" option
                menu.addItem((item) => {
                    const maxNumber = Math.pow(10, prefixLength) - 1;
                    item
                        .setTitle('Move down')
                        .setIcon('arrow-down')
                        .setDisabled(currentNumber >= maxNumber)
                        .onClick(async () => {
                            if (currentNumber >= maxNumber) return;
                            if (!file.parent) return;

                            const siblings = file.parent.children
                                .filter((f): f is TFolder => f instanceof TFolder && f !== file)
                                .filter(f => numericPrefixRegex.test(f.name));

                            const siblingMap = new Map<number, TFolder>();
                            siblings.forEach(sibling => {
                                const m = sibling.name.match(numericPrefixRegex);
                                if (m) {
                                    siblingMap.set(parseInt(m[1], 10), sibling);
                                }
                            });

                            const foldersToRename: { from: TFolder, to: string }[] = [];
                            let currentNumToShift = currentNumber + 1;

                            while (siblingMap.has(currentNumToShift) && currentNumToShift <= maxNumber) {
                                const folderToShift = siblingMap.get(currentNumToShift)!;
                                const newNum = currentNumToShift + 1;
                                if (newNum > maxNumber) break; // Boundary hit

                                const rest = folderToShift.name.substring(folderToShift.name.indexOf('_') + 1);
                                const newPrefix = String(newNum).padStart(prefixLength, '0');
                                foldersToRename.push({ from: folderToShift, to: `${newPrefix}_${rest}` });
                                currentNumToShift++;
                            }

                            // Add the original folder to be renamed
                            const newPrefix = String(currentNumber + 1).padStart(prefixLength, '0');
                            foldersToRename.push({ from: file, to: `${newPrefix}_${restOfName}` });

                            // Rename from highest index to lowest to avoid conflicts
                            for (const rename of foldersToRename.sort((a, b) => parseInt(b.to) - parseInt(a.to))) {
                                await this.app.fileManager.renameFile(rename.from, `${rename.from.parent.path}/${rename.to}`);
                            }
                        });
                });
            })
        );
    }

    async updateFolderIndex(folder: TFolder, newIndex: number) {
        if (!folder.parent) return;

        const numericPrefixRegex = /^(\d+)_/;
        const match = folder.name.match(numericPrefixRegex);
        if (!match) return;

        const oldIndex = parseInt(match[1], 10);
        const prefixLength = match[1].length;
        const restOfName = folder.name.substring(match[0].length);

        if (newIndex === oldIndex) return;

        const siblings = folder.parent.children
            .filter((f): f is TFolder => f instanceof TFolder && f !== folder)
            .filter(f => numericPrefixRegex.test(f.name));

        const foldersToRename: { from: TFolder, to: string }[] = [];

        if (newIndex > oldIndex) { // Moving down
            const affectedSiblings = siblings.filter(f => {
                const idx = parseInt(f.name.match(numericPrefixRegex)![1], 10);
                return idx > oldIndex && idx <= newIndex;
            });

            for (const sibling of affectedSiblings) {
                const siblingMatch = sibling.name.match(numericPrefixRegex)!;
                const siblingIndex = parseInt(siblingMatch[1], 10);
                const siblingRest = sibling.name.substring(siblingMatch[0].length);
                const newSiblingPrefix = String(siblingIndex - 1).padStart(prefixLength, '0');
                foldersToRename.push({ from: sibling, to: `${newSiblingPrefix}_${siblingRest}` });
            }
        } else { // Moving up
            const affectedSiblings = siblings.filter(f => {
                const idx = parseInt(f.name.match(numericPrefixRegex)![1], 10);
                return idx >= newIndex && idx < oldIndex;
            });

            for (const sibling of affectedSiblings) {
                const siblingMatch = sibling.name.match(numericPrefixRegex)!;
                const siblingIndex = parseInt(siblingMatch[1], 10);
                const siblingRest = sibling.name.substring(siblingMatch[0].length);
                const newSiblingPrefix = String(siblingIndex + 1).padStart(prefixLength, '0');
                foldersToRename.push({ from: sibling, to: `${newSiblingPrefix}_${siblingRest}` });
            }
        }

        // Add the original folder to the list
        const newPrefix = String(newIndex).padStart(prefixLength, '0');
        foldersToRename.push({ from: folder, to: `${newPrefix}_${restOfName}` });

        // Perform renames
        for (const rename of foldersToRename) {
            await this.app.fileManager.renameFile(rename.from, `${rename.from.parent.path}/${rename.to}`);
        }
    }

    onunload() {
        console.log('Indexable Folders Plugin: unloading plugin');
        if (this.folderObserver) {
            this.folderObserver.disconnect();
        }
    }

    startFolderObserver() {
        console.log('Indexable Folders Plugin: starting folder observer');
        const fileExplorer = this.app.workspace.containerEl.querySelector('.nav-files-container');

        if (!fileExplorer) {
            console.log('Indexable Folders Plugin: file explorer not found, retrying...');
            setTimeout(() => this.startFolderObserver(), 500);
            return;
        }
        console.log('Indexable Folders Plugin: file explorer found');

        this.folderObserver = new MutationObserver(() => {
            console.log('Indexable Folders Plugin: mutation observed');
            // If a rename is in progress, do nothing.
            if (this.app.workspace.containerEl.querySelector('input.nav-rename-input')) {
                console.log('Indexable Folders Plugin: rename in progress, skipping prefixing');
                return;
            }
            this.prefixNumericFolders();
        });

        this.folderObserver.observe(fileExplorer, {
            childList: true,
            subtree: true
        });

        // Initial run
        console.log('Indexable Folders Plugin: initial run of prefixNumericFolders');
        this.prefixNumericFolders();
    }

    revertFolderName(file: TFolder) {
        console.log(`Indexable Folders Plugin: reverting folder name for ${file.path}`);
        const fileExplorer = this.app.workspace.containerEl.querySelector('.nav-files-container');
        if (!fileExplorer) return;

        const folderEl = fileExplorer.querySelector(`[data-path="${file.path}"]`);
        const folderTitleEl = folderEl?.querySelector('.nav-folder-title-content');

        if (folderTitleEl) {
            const prefixSpan = folderTitleEl.querySelector('span.indexable-folder-prefix');
            if (prefixSpan) {
                const originalName = prefixSpan.getAttribute('data-original-name');
                if (originalName) {
                    console.log(`Indexable Folders Plugin: reverting to ${originalName}`);
                    // Simply revert the name. The observer will handle the rest.
                    folderTitleEl.textContent = originalName;
                }
            }
        }
    }

    private getPrefixRegex(): RegExp {
        const blacklisted = this.settings.blacklistedPrefixes
            .split(',')
            .map(p => p.trim())
            .filter(Boolean)
            // Escape special regex characters
            .map(p => p.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));

        const pattern = `^((?:\\d+)|(?:${blacklisted.join('|')}))_`;
        return new RegExp(pattern, 'i');
    }

    private updateStatusBar(): void {
        this.statusBarItemEl.empty();
        const activeFile = this.app.workspace.getActiveFile();

        if (!activeFile || !activeFile.parent) {
            return;
        }

        const prefixRegex = this.getPrefixRegex();
        const pathParts: DocumentFragment[] = [];

        let currentFolder: TFolder | null = activeFile.parent;
        while (currentFolder && !currentFolder.isRoot()) {
            const folderName = currentFolder.name;
            const match = folderName.match(prefixRegex);

            const fragment = document.createDocumentFragment();

            if (match) {
                const prefix = match[1];
                const nameWithoutPrefix = folderName.substring(match[0].length);

                const label = fragment.createEl('span');
                label.setText(prefix);
                label.addClass('indexable-folder-prefix');
                fragment.append(label);
                fragment.append(document.createTextNode(` ${nameWithoutPrefix}`));
            } else {
                fragment.append(document.createTextNode(folderName));
            }

            pathParts.unshift(fragment);
            currentFolder = currentFolder.parent;
        }

        pathParts.forEach((part, index) => {
            this.statusBarItemEl.appendChild(part);
            if (index < pathParts.length - 1) {
                this.statusBarItemEl.createEl('span', {
                    text: '→',
                    cls: 'indexable-folder-path-separator'
                });
            }
        });
    }

    prefixNumericFolders() {
        console.log('Indexable Folders Plugin: running prefixNumericFolders');
        const fileExplorer = this.app.workspace.containerEl.querySelector('.nav-files-container');
        if (!fileExplorer) return;

        const prefixRegex = this.getPrefixRegex();

        const folderTitleElements = fileExplorer.querySelectorAll('.nav-folder-title-content');
        folderTitleElements.forEach((el: HTMLElement) => {
            const folderItem = el.closest('.nav-folder');

            // NEW GUARD: If the parent folder item has the 'is-being-renamed' class,
            // do not apply any styling to it.
            if (folderItem && folderItem.classList.contains('is-being-renamed')) {
                return;
            }

            // If our prefix span already exists, skip this element.
            if (el.querySelector('span.indexable-folder-prefix')) {
                return;
            }

            const folderName = el.textContent;
            const match = folderName?.match(prefixRegex);

            if (match) {
                console.log(`Indexable Folders Plugin: found matching folder: ${folderName}`);
                const numericPrefix = match[1];
                const newFolderName = folderName.substring(match[0].length);

                // Clear the original text content before adding new elements.
                el.textContent = '';

                const label = el.createEl('span');
                label.setText(numericPrefix);
                label.addClass('indexable-folder-prefix');
                // Store original name to revert for rename
                label.setAttribute('data-original-name', folderName);

                el.appendChild(label);
                el.appendChild(document.createTextNode(newFolderName));
            }
        });
    }

    async loadSettings() {
        console.log('Indexable Folders Plugin: loading settings');
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        console.log('Indexable Folders Plugin: saving settings');
        await this.saveData(this.settings);
    }
}

class IndexableFoldersSettingTab extends PluginSettingTab {
    plugin: IndexableFoldersPlugin;

    constructor(app: App, plugin: IndexableFoldersPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('Blacklisted prefixes')
            .setDesc('A comma-separated list of case-insensitive prefixes that will be styled but not changeable (e.g., for archive folders).')
            .addText(text => text
                .setPlaceholder('e.g., zz, xx, archive')
                .setValue(this.plugin.settings.blacklistedPrefixes)
                .onChange(async (value) => {
                    this.plugin.settings.blacklistedPrefixes = value;
                    await this.plugin.saveSettings();
                    // Re-render folders to apply new settings
                    this.plugin.prefixNumericFolders();
                    // Update status bar in case the current folder is affected
                    this.plugin.updateStatusBar();
                }));
    }
}

class UpdateIndexModal extends Modal {
    folder: TFolder;
    onSubmit: (newIndex: number) => Promise<void>;

    constructor(app: App, folder: TFolder, onSubmit: (newIndex: number) => Promise<void>) {
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

        contentEl.createEl('h2', { text: `Update index for "${this.folder.name}"` });

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
            .addText(text => {
                text.inputEl.type = 'number';
                text.setPlaceholder(`Enter a value from 0 to ${maxNumber}`)
                    .setValue(prefix);
                text.inputEl.maxLength = prefixLength;
                text.inputEl.addEventListener('input', () => {
                    if (text.inputEl.value.length > prefixLength) {
                        text.inputEl.value = text.inputEl.value.slice(0, prefixLength);
                    }
                });
            });

        new Setting(form)
            .addButton(button => button
                .setButtonText('Update')
                .setCta()
                .onClick(() => {
                    form.requestSubmit();
                }));
    }

    onClose() {
        this.contentEl.empty();
    }
}
