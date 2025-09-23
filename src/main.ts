import { Plugin, TFolder } from 'obsidian';
import { IndexableFoldersSettings, DEFAULT_SETTINGS } from './settings';
import { IndexableFoldersSettingTab } from './ui/SettingsTab';
import { registerEvents } from './events';
import { prefixNumericFolders, revertFolderName } from './logic/fileExplorer';
import { updateStatusBar } from './logic/statusBar';
import { log } from './utils/logger';

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
        log('loading plugin');
        await this.loadSettings();

        this.statusBarItemEl = this.addStatusBarItem();
        this.addSettingTab(new IndexableFoldersSettingTab(this.app, this));

        registerEvents(this);
        log('plugin loaded');
    }

    onunload() {
        log('unloading plugin');
        if (this.folderObserver) {
            this.folderObserver.disconnect();
        }
        log('plugin unloaded');
    }

    async loadSettings() {
        log('loading settings');
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        );
    }

    async saveSettings() {
        log('saving settings');
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
        log('generated prefix regex pattern:', pattern);
        return new RegExp(pattern, 'i');
    }

    getNumericPrefixRegex(): RegExp {
        const escapedSeparator = this.getEscapedSeparator();
        const pattern = `^(\\d+)${escapedSeparator}`;
        return new RegExp(pattern);
    }
}
