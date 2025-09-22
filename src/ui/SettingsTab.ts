import { App, PluginSettingTab, Setting } from 'obsidian';
import IndexableFoldersPlugin from '../main';

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
            .setName('Blacklisted prefixes')
            .setDesc(
                'A comma-separated list of case-insensitive prefixes that will be styled but not changeable (e.g., for archive folders).'
            )
            .addText((text) =>
                text
                    .setPlaceholder('e.g., zz, xx, archive')
                    .setValue(this.plugin.settings.blacklistedPrefixes)
                    .onChange(async (value) => {
                        console.debug(
                            'Indexable Folders Plugin: blacklisted prefixes setting changed to:',
                            value
                        );
                        this.plugin.settings.blacklistedPrefixes = value;
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
                        console.debug(
                            'Indexable Folders Plugin: status bar separator setting changed to:',
                            value
                        );
                        this.plugin.settings.statusBarSeparator = value;
                        await this.plugin.saveSettings();
                        this.plugin.updateStatusBar();
                    })
            );
    }
}
