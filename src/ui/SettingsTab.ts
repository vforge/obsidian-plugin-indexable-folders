import { App, PluginSettingTab, Setting } from 'obsidian';
import IndexableFoldersPlugin from '../main';
import { log } from '../utils/logger';

export class IndexableFoldersSettingTab extends PluginSettingTab {
    plugin: IndexableFoldersPlugin;

    constructor(app: App, plugin: IndexableFoldersPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('Special prefixes')
            .setDesc(
                'A comma-separated list of case-insensitive prefixes that will be styled but not changeable (e.g., for archive folders).'
            )
            .addText((text) =>
                text
                    .setPlaceholder('e.g., zz, xx, archive')
                    .setValue(this.plugin.settings.specialPrefixes)
                    .onChange(async (value) => {
                        log('special prefixes setting changed to:', value);
                        this.plugin.settings.specialPrefixes = value;
                        await this.plugin.saveSettings();
                        // Re-render folders to apply new settings
                        this.plugin.prefixNumericFolders();
                        // Update status bar in case the current folder is affected
                        this.plugin.updateStatusBar();
                    })
            );

        new Setting(containerEl)
            .setName('Status bar separator')
            .setDesc(
                'The character(s) used to separate folder paths in the status bar.'
            )
            .addText((text) =>
                text
                    .setPlaceholder('e.g., → or /')
                    .setValue(this.plugin.settings.statusBarSeparator)
                    .onChange(async (value) => {
                        log('status bar separator setting changed to:', value);
                        this.plugin.settings.statusBarSeparator = value;
                        await this.plugin.saveSettings();
                        this.plugin.updateStatusBar();
                    })
            );

        new Setting(containerEl)
            .setName('Prefix separator')
            .setDesc(
                'The character used to separate numeric prefixes from folder names (e.g., "01_Folder Name").'
            )
            .addText((text) =>
                text
                    .setPlaceholder('e.g., _ or -')
                    .setValue(this.plugin.settings.separator)
                    .onChange(async (value) => {
                        log('separator setting changed to:', value);
                        this.plugin.settings.separator = value;
                        await this.plugin.saveSettings();
                        // Re-render folders to apply new settings (force refresh to update separator)
                        this.plugin.prefixNumericFolders(true);
                        // Update status bar in case the current folder is affected
                        this.plugin.updateStatusBar();
                    })
            );
    }
}
