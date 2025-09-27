import { Plugin, TFolder } from 'obsidian';
import { IndexableFoldersSettings, DEFAULT_SETTINGS } from './settings';
import { IndexableFoldersSettingTab } from './ui/SettingsTab';
import { registerEvents } from './events';
import { prefixNumericFolders, revertFolderName } from './logic/fileExplorer';
import { updateStatusBar } from './logic/statusBar';

export default class IndexableFoldersPlugin extends Plugin {
    settings: IndexableFoldersSettings;
    folderObserver: MutationObserver;
    statusBarItemEl: HTMLElement;
    ignoreMutationsWhileMenuOpen = false;

    // Expose methods for modules
    public prefixNumericFolders: (forceRefresh?: boolean) => void = (
        forceRefresh = false
    ) => prefixNumericFolders(this, forceRefresh);
    public revertFolderName: (file: TFolder) => void = (file) =>
        revertFolderName(this, file);
    public updateStatusBar: () => void = () => updateStatusBar(this);

    async onload() {
        await this.loadSettings();

        // Initialize theme styles
        this.updateLabelStyles();

        this.statusBarItemEl = this.addStatusBarItem();
        this.addSettingTab(new IndexableFoldersSettingTab(this.app, this));

        registerEvents(this);
    }

    onunload() {
        if (this.folderObserver) {
            this.folderObserver.disconnect();
        }

        // Clean up custom CSS properties
        document.documentElement.style.removeProperty(
            '--indexable-folder-label-bg'
        );
        document.documentElement.style.removeProperty(
            '--indexable-folder-label-text'
        );
    }

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        );
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    private getEscapedSeparator(): string {
        return this.settings.separator.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    getPrefixRegex(): RegExp {
        const special = this.settings.specialPrefixes
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p) => p.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&'));

        const escapedSeparator = this.getEscapedSeparator();
        const pattern = `^((?:\\d+)|(?:${special.join('|')}))${escapedSeparator}`;
        return new RegExp(pattern, 'i');
    }

    getNumericPrefixRegex(): RegExp {
        const escapedSeparator = this.getEscapedSeparator();
        const pattern = `^(\\d+)${escapedSeparator}`;
        return new RegExp(pattern);
    }

    updateLabelStyles(): void {
        // Update CSS custom properties for label colors
        document.documentElement.style.setProperty(
            '--indexable-folder-label-bg',
            this.settings.labelBackgroundColor
        );
        document.documentElement.style.setProperty(
            '--indexable-folder-label-text',
            this.settings.labelTextColor
        );
    }
}
