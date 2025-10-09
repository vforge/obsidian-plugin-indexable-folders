import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import IndexableFoldersPlugin from 'src/main';
import { log } from 'src/utils/logger';
import {
    isValidCSSColor,
    sanitizeCSSColor,
    getCSSColorErrorMessage,
} from 'src/utils/cssValidation';
import { DEFAULT_SETTINGS } from 'src/settings';

export class IndexableFoldersSettingTab extends PluginSettingTab {
    plugin: IndexableFoldersPlugin;
    private validationTimeouts: Map<string, NodeJS.Timeout> = new Map();

    constructor(app: App, plugin: IndexableFoldersPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    updateLabelStyles(): void {
        // Validate and sanitize color values before applying
        const bgColor = sanitizeCSSColor(
            this.plugin.settings.labelBackgroundColor
        );
        const textColor = sanitizeCSSColor(this.plugin.settings.labelTextColor);

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

    /**
     * Debounced validation to prevent spam notifications while typing
     */
    private debouncedValidation(
        key: string,
        value: string,
        callback: () => Promise<void>,
        errorPrefix: string
    ): void {
        // Clear existing timeout for this key
        const existingTimeout = this.validationTimeouts.get(key);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        // Set new timeout
        const timeout = setTimeout(() => {
            void (async () => {
                // Only show error if the value is not empty and is invalid
                if (value.trim() !== '' && !isValidCSSColor(value)) {
                    const errorMessage = getCSSColorErrorMessage(value);
                    new Notice(`${errorPrefix}: ${errorMessage}`, 4000);
                    return;
                }

                // If validation passes or value is empty, execute callback
                await callback();
            })();
        }, 800); // 800ms delay to allow user to finish typing

        this.validationTimeouts.set(key, timeout);
    }

    /**
     * Clear all validation timeouts to prevent memory leaks
     */
    private clearValidationTimeouts(): void {
        this.validationTimeouts.forEach((timeout) => {
            clearTimeout(timeout);
        });
        this.validationTimeouts.clear();
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        // Clear any existing timeouts when re-displaying settings
        this.clearValidationTimeouts();

        const prefixSeparatorSetting = new Setting(containerEl)
            .setName('Prefix separator')
            .setDesc(
                'The character used to separate numeric prefixes from folder names (e.g., "01_Folder Name").'
            )
            .addText((text) =>
                text
                    .setPlaceholder('e.g., _ or -')
                    .setValue(this.plugin.settings.separator)
                    .onChange(async (value) => {
                        log(
                            this.plugin.settings.debugEnabled,
                            'separator setting changed to:',
                            value
                        );
                        this.plugin.settings.separator = value;
                        await this.plugin.saveSettings();
                        // Re-render folders to apply new settings (force refresh to update separator)
                        this.plugin.prefixNumericFolders(true);
                        // Update status bar in case the current folder is affected
                        this.plugin.updateStatusBar();
                    })
            );

        prefixSeparatorSetting.addExtraButton((button) =>
            button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.separator = DEFAULT_SETTINGS.separator;
                    await this.plugin.saveSettings();
                    this.plugin.prefixNumericFolders(true);
                    this.plugin.updateStatusBar();
                    this.display();
                })
        );

        const specialPrefixesSetting = new Setting(containerEl)
            .setName('Special prefixes')
            .setDesc(
                'A comma-separated list of case-insensitive prefixes that will be styled but not changeable (e.g., for archive folders).'
            )
            .addText((text) =>
                text
                    .setPlaceholder('e.g., zz, xx, archive')
                    .setValue(this.plugin.settings.specialPrefixes)
                    .onChange(async (value) => {
                        log(
                            this.plugin.settings.debugEnabled,
                            'special prefixes setting changed to:',
                            value
                        );
                        this.plugin.settings.specialPrefixes = value;
                        await this.plugin.saveSettings();
                        // Re-render folders to apply new settings
                        this.plugin.prefixNumericFolders();
                        // Update status bar in case the current folder is affected
                        this.plugin.updateStatusBar();
                    })
            );

        specialPrefixesSetting.addExtraButton((button) =>
            button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.specialPrefixes =
                        DEFAULT_SETTINGS.specialPrefixes;
                    await this.plugin.saveSettings();
                    this.plugin.prefixNumericFolders();
                    this.plugin.updateStatusBar();
                    this.display(); // Refresh to show new value
                })
        );

        const statusBarEnabledSetting = new Setting(containerEl)
            .setName('Show status bar path')
            .setDesc(
                'Display the full folder path with styled index labels in the status bar when viewing a file.'
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.statusBarEnabled)
                    .onChange(async (value) => {
                        log(
                            this.plugin.settings.debugEnabled,
                            'status bar enabled setting changed to:',
                            value
                        );
                        this.plugin.settings.statusBarEnabled = value;
                        await this.plugin.saveSettings();
                        this.plugin.updateStatusBar();
                    })
            );

        statusBarEnabledSetting.addExtraButton((button) =>
            button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.statusBarEnabled =
                        DEFAULT_SETTINGS.statusBarEnabled;
                    await this.plugin.saveSettings();
                    this.plugin.updateStatusBar();
                    this.display();
                })
        );

        const statusBarSeparatorSetting = new Setting(containerEl)
            .setName('Status bar separator')
            .setDesc(
                'The character(s) used to separate folder paths in the status bar.'
            )
            .addText((text) =>
                text
                    .setPlaceholder('e.g., → or /')
                    .setValue(this.plugin.settings.statusBarSeparator)
                    .onChange(async (value) => {
                        log(
                            this.plugin.settings.debugEnabled,
                            'status bar separator setting changed to:',
                            value
                        );
                        this.plugin.settings.statusBarSeparator = value;
                        await this.plugin.saveSettings();
                        this.plugin.updateStatusBar();
                    })
            );

        statusBarSeparatorSetting.addExtraButton((button) =>
            button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.statusBarSeparator =
                        DEFAULT_SETTINGS.statusBarSeparator;
                    await this.plugin.saveSettings();
                    this.plugin.updateStatusBar();
                    this.display();
                })
        );

        // Theming section
        new Setting(containerEl).setName('Theming').setHeading();

        const labelBgColorSetting = new Setting(containerEl)
            .setName('Label background color')
            .setDesc(
                'The background color for the index labels (numeric prefixes). Use any valid CSS color value.'
            )
            .addText((text) =>
                text
                    .setPlaceholder(
                        'e.g., #007ACC, rgb(0, 122, 204), var(--interactive-accent)'
                    )
                    .setValue(this.plugin.settings.labelBackgroundColor)
                    .onChange(async (value) => {
                        // Immediately save and apply valid colors (or empty values) for instant feedback
                        if (value.trim() === '' || isValidCSSColor(value)) {
                            this.plugin.settings.labelBackgroundColor = value;
                            await this.plugin.saveSettings();
                            this.updateLabelStyles();

                            // Clear any pending validation timeout since value is valid
                            const existingTimeout =
                                this.validationTimeouts.get('bgColor');
                            if (existingTimeout) {
                                clearTimeout(existingTimeout);
                                this.validationTimeouts.delete('bgColor');
                            }
                        } else {
                            // Use debounced validation only for invalid values to prevent spam
                            this.debouncedValidation(
                                'bgColor',
                                value,
                                async () => {
                                    // This won't be called for invalid values, just satisfies the interface
                                },
                                'Invalid background color'
                            );
                        }
                    })
            );

        labelBgColorSetting.addExtraButton((button) =>
            button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.labelBackgroundColor =
                        DEFAULT_SETTINGS.labelBackgroundColor;
                    await this.plugin.saveSettings();
                    this.updateLabelStyles();
                    this.display();
                })
        );

        const labelTextColorSetting = new Setting(containerEl)
            .setName('Label text color')
            .setDesc(
                'The text color for the index labels (numeric prefixes). Use any valid CSS color value.'
            )
            .addText((text) =>
                text
                    .setPlaceholder(
                        'e.g., #FFFFFF, rgb(255, 255, 255), var(--text-on-accent)'
                    )
                    .setValue(this.plugin.settings.labelTextColor)
                    .onChange(async (value) => {
                        // Immediately save and apply valid colors (or empty values) for instant feedback
                        if (value.trim() === '' || isValidCSSColor(value)) {
                            this.plugin.settings.labelTextColor = value;
                            await this.plugin.saveSettings();
                            this.updateLabelStyles();

                            // Clear any pending validation timeout since value is valid
                            const existingTimeout =
                                this.validationTimeouts.get('textColor');
                            if (existingTimeout) {
                                clearTimeout(existingTimeout);
                                this.validationTimeouts.delete('textColor');
                            }
                        } else {
                            // Use debounced validation only for invalid values to prevent spam
                            this.debouncedValidation(
                                'textColor',
                                value,
                                async () => {
                                    // This won't be called for invalid values, just satisfies the interface
                                },
                                'Invalid text color'
                            );
                        }
                    })
            );

        labelTextColorSetting.addExtraButton((button) =>
            button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.labelTextColor =
                        DEFAULT_SETTINGS.labelTextColor;
                    await this.plugin.saveSettings();
                    this.updateLabelStyles();
                    this.display();
                })
        );

        // Advanced section
        new Setting(containerEl).setName('Advanced').setHeading();

        const debugEnabledSetting = new Setting(containerEl)
            .setName('Enable debug logging')
            .setDesc(
                'Enable debug logging to the browser console. Useful for troubleshooting issues.'
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.debugEnabled)
                    .onChange(async (value) => {
                        this.plugin.settings.debugEnabled = value;
                        await this.plugin.saveSettings();
                    })
            );

        debugEnabledSetting.addExtraButton((button) =>
            button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.debugEnabled =
                        DEFAULT_SETTINGS.debugEnabled;
                    await this.plugin.saveSettings();
                    this.display();
                })
        );
    }
}
