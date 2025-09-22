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

    // Expose methods for modules
    public prefixNumericFolders: () => void = () => prefixNumericFolders(this);
    public revertFolderName: (file: TFolder) => void = (file) =>
        revertFolderName(this, file);
    public updateStatusBar: () => void = () => updateStatusBar(this);

    async onload() {
        console.debug('Indexable Folders Plugin: loading plugin');
        await this.loadSettings();

        this.statusBarItemEl = this.addStatusBarItem();
        this.addSettingTab(new IndexableFoldersSettingTab(this.app, this));

        registerEvents(this);
        console.log('IndexableFoldersPlugin loaded');
    }

    onunload() {
        console.debug('Indexable Folders Plugin: unloading plugin');
        if (this.folderObserver) {
            this.folderObserver.disconnect();
        }
        console.log('IndexableFoldersPlugin unloaded');
    }

    async loadSettings() {
        console.debug('Indexable Folders Plugin: loading settings');
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        );
    }

    async saveSettings() {
        console.debug('Indexable Folders Plugin: saving settings');
        await this.saveData(this.settings);
    }

    getPrefixRegex(): RegExp {
        const blacklisted = this.settings.blacklistedPrefixes
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p) => p.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&'));

        const pattern = `^((?:\\d+)|(?:${blacklisted.join('|')}))_`;
        console.debug(
            'Indexable Folders Plugin: generated prefix regex pattern:',
            pattern
        );
        return new RegExp(pattern, 'i');
    }
}
