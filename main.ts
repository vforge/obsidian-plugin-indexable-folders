import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TAbstractFile, TFolder } from 'obsidian';

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

    async onload() {
        console.log('Indexable Folders Plugin: loading plugin');
        await this.loadSettings();

        // This creates an icon in the left ribbon.
        const ribbonIconEl = this.addRibbonIcon('folder-search', 'Indexable Folders Plugin', (_evt: MouseEvent) => {
            // Called when the user clicks the icon.
            new Notice('This is a notice!');
        });
        // Perform additional things with the ribbon
        ribbonIconEl.addClass('indexable-folders-plugin-ribbon-class');

        // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
        const statusBarItemEl = this.addStatusBarItem();
        statusBarItemEl.setText('Status Bar Text');

        // This adds a simple command that can be triggered anywhere
        this.addCommand({
            id: 'open-indexable-folders-modal-simple',
            name: 'Open indexable folders modal (simple)',
            callback: () => {
                new IndexableFoldersModal(this.app).open();
            }
        });
        // This adds an editor command that can perform some operation on the current editor instance
        this.addCommand({
            id: 'indexable-folders-editor-command',
            name: 'Indexable Folders editor command',
            editorCallback: (editor: Editor, _view: MarkdownView) => {
                console.log(editor.getSelection());
                editor.replaceSelection('Sample Editor Command');
            }
        });
        // This adds a complex command that can check whether the current state of the app allows execution of the command
        this.addCommand({
            id: 'open-indexable-folders-modal-complex',
            name: 'Open indexable folders modal (complex)',
            checkCallback: (checking: boolean) => {
                // Conditions to check
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (markdownView) {
                    // If checking is true, we're simply "checking" if the command can be run.
                    // If checking is false, then we want to actually perform the operation.
                    if (!checking) {
                        new IndexableFoldersModal(this.app).open();
                    }

                    // This command will only show up in Command Palette when the check function returns true
                    return true;
                }
            }
        });

        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new IndexableFoldersSettingTab(this.app, this));

        // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
        // Using this function will automatically remove the event listener when this plugin is disabled.
        this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
            console.log('click', evt);
        });

        // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
        this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

        this.app.workspace.onLayoutReady(() => {
            console.log('Indexable Folders Plugin: layout ready');
            this.startFolderObserver();
        });

        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                if (file instanceof TFolder) {
                    this.revertFolderName(file);
                }
            })
        );
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

    prefixNumericFolders() {
        console.log('Indexable Folders Plugin: running prefixNumericFolders');
        const fileExplorer = this.app.workspace.containerEl.querySelector('.nav-files-container');
        if (!fileExplorer) return;

        const blacklisted = this.settings.blacklistedPrefixes
            .split(',')
            .map(p => p.trim())
            .filter(Boolean)
            // Escape special regex characters
            .map(p => p.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));

        const pattern = `^((?:\\d+)|(?:${blacklisted.join('|')}))_`;
        const prefixRegex = new RegExp(pattern, 'i');

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

class IndexableFoldersModal extends Modal {
    constructor(app: App) {
        super(app);
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.setText('Woah!');
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
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
                }));
    }
}
