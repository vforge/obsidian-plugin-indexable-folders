import { Plugin, TFolder } from 'obsidian';
import { IndexableFoldersSettings, DEFAULT_SETTINGS } from './settings';
import { IndexableFoldersSettingTab } from './ui/SettingsTab';
import { registerEvents } from './events';
import { prefixNumericFolders, revertFolderName } from './logic/fileExplorer';
import { updateStatusBar } from './logic/statusBar';
import { sanitizeCSSColor } from './utils/cssValidation';

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

        // Sanitize color values on load to prevent any stored malicious values
        const sanitizedBgColor = sanitizeCSSColor(
            this.settings.labelBackgroundColor
        );
        const sanitizedTextColor = sanitizeCSSColor(
            this.settings.labelTextColor
        );

        // If sanitization changed the values, update and save the settings
        let needsUpdate = false;
        if (sanitizedBgColor !== this.settings.labelBackgroundColor) {
            this.settings.labelBackgroundColor =
                sanitizedBgColor || DEFAULT_SETTINGS.labelBackgroundColor;
            needsUpdate = true;
        }
        if (sanitizedTextColor !== this.settings.labelTextColor) {
            this.settings.labelTextColor =
                sanitizedTextColor || DEFAULT_SETTINGS.labelTextColor;
            needsUpdate = true;
        }

        if (needsUpdate) {
            await this.saveSettings();
        }
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
        // Validate and sanitize color values before applying
        const bgColor = sanitizeCSSColor(this.settings.labelBackgroundColor);
        const textColor = sanitizeCSSColor(this.settings.labelTextColor);

        // Update CSS custom properties for label colors
        document.documentElement.style.setProperty(
            '--indexable-folder-label-bg',
            bgColor || 'var(--interactive-accent)' // fallback to default
        );
        document.documentElement.style.setProperty(
            '--indexable-folder-label-text',
            textColor || 'var(--text-on-accent)' // fallback to default
        );
    }
}
