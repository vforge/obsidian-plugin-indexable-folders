import { App, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder } from 'obsidian';

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
        if (activeFile && activeFile.parent) {
            const folderName = activeFile.parent.name;
            const prefixRegex = this.getPrefixRegex();
            const match = folderName.match(prefixRegex);

            if (match) {
                const prefix = match[1];
                const nameWithoutPrefix = folderName.substring(match[0].length);

                const label = this.statusBarItemEl.createEl('span');
                label.setText(prefix);
                label.addClass('indexable-folder-prefix');

                this.statusBarItemEl.appendText(` ${nameWithoutPrefix}`);
            }
        }
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
