import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import IndexableFoldersPlugin from '../main';
import { log } from '../utils/logger';
import {
    isValidCSSColor,
    sanitizeCSSColor,
    getCSSColorErrorMessage,
} from '../utils/cssValidation';

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

        new Setting(containerEl)
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

        // Theming section
        new Setting(containerEl).setName('Theming').setHeading();

        new Setting(containerEl)
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

        new Setting(containerEl)
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
    }
}
