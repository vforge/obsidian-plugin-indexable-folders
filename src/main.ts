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

    // Cached regex patterns for performance
    private _prefixRegexCache: RegExp | null = null;
    private _numericPrefixRegexCache: RegExp | null = null;
    private _lastCachedSettings: string | null = null;

    // MutationObserver debouncing for performance
    private _mutationDebounceTimeout: NodeJS.Timeout | null = null;
    private _pendingMutations: MutationRecord[] = [];
    private _mutationDebounceDelay = 150; // 150ms debounce delay

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

        // Clean up debouncing timeout to prevent memory leaks
        if (this._mutationDebounceTimeout) {
            clearTimeout(this._mutationDebounceTimeout);
            this._mutationDebounceTimeout = null;
        }
        this._pendingMutations = [];

        // Clean up custom CSS properties
        document.documentElement.style.removeProperty(
            '--indexable-folder-label-bg'
        );
        document.documentElement.style.removeProperty(
            '--indexable-folder-label-text'
        );
    }

    async loadSettings() {
        const savedData =
            (await this.loadData()) as Partial<IndexableFoldersSettings> | null;
        this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData || {});

        // Invalidate regex cache since settings may have changed
        this.invalidateRegexCache();

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
        // Invalidate regex caches when settings change
        this.invalidateRegexCache();
    }

    /**
     * Invalidates the regex cache when settings change
     */
    private invalidateRegexCache(): void {
        this._prefixRegexCache = null;
        this._numericPrefixRegexCache = null;
        this._lastCachedSettings = null;
    }

    /**
     * Checks if the regex cache needs to be invalidated based on settings changes
     */
    private shouldInvalidateCache(): boolean {
        const currentSettings = JSON.stringify({
            separator: this.settings.separator,
            specialPrefixes: this.settings.specialPrefixes,
        });

        if (this._lastCachedSettings !== currentSettings) {
            this._lastCachedSettings = currentSettings;
            return true;
        }
        return false;
    }

    /**
     * Processes accumulated mutations with debouncing to prevent performance issues
     */
    private processMutations(): void {
        if (this._pendingMutations.length === 0) {
            return;
        }

        // Clear the pending mutations
        this._pendingMutations = [];

        // Process the folder prefixing
        this.prefixNumericFolders();
    }

    /**
     * Handles mutation observer events with debouncing
     */
    public handleMutations(mutations: MutationRecord[]): void {
        // Add mutations to pending list
        this._pendingMutations.push(...mutations);

        // Clear existing timeout
        if (this._mutationDebounceTimeout) {
            clearTimeout(this._mutationDebounceTimeout);
        }

        // Set new debounced timeout
        this._mutationDebounceTimeout = setTimeout(() => {
            this.processMutations();
            this._mutationDebounceTimeout = null;
        }, this._mutationDebounceDelay);
    }

    /**
     * Executes DOM operations in a batch to minimize layout thrashing
     * @param operations Array of functions that perform DOM operations
     */
    public batchDOMUpdates(operations: Array<() => void>): void {
        if (operations.length === 0) {
            return;
        }

        // Use requestAnimationFrame to batch DOM updates in the next frame
        requestAnimationFrame(() => {
            // Execute all DOM operations in sequence during the same frame
            operations.forEach((operation) => {
                try {
                    operation();
                } catch (error) {
                    console.error('Error in batched DOM operation:', error);
                }
            });
        });
    }

    private getEscapedSeparator(): string {
        return this.settings.separator.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    getPrefixRegex(): RegExp {
        // Check if cache needs invalidation or doesn't exist
        if (this.shouldInvalidateCache() || !this._prefixRegexCache) {
            const special = this.settings.specialPrefixes
                .split(',')
                .map((p) => p.trim())
                .filter(Boolean)
                .map((p) => p.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&'));

            const escapedSeparator = this.getEscapedSeparator();
            const pattern = `^((?:\\d+)|(?:${special.join('|')}))${escapedSeparator}`;
            this._prefixRegexCache = new RegExp(pattern, 'i');
        }

        return this._prefixRegexCache;
    }

    getNumericPrefixRegex(): RegExp {
        // Check if cache needs invalidation or doesn't exist
        if (this.shouldInvalidateCache() || !this._numericPrefixRegexCache) {
            const escapedSeparator = this.getEscapedSeparator();
            const pattern = `^(\\d+)${escapedSeparator}`;
            this._numericPrefixRegexCache = new RegExp(pattern);
        }

        return this._numericPrefixRegexCache;
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
