import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import IndexableFoldersPlugin from '../src/main';
import { DEFAULT_SETTINGS } from '../src/settings';

// Mock the imported modules
vi.mock('../src/ui/SettingsTab', () => ({
    IndexableFoldersSettingTab: vi.fn(),
}));

vi.mock('../src/events', () => ({
    registerEvents: vi.fn(),
}));

vi.mock('../src/logic/fileExplorer', () => ({
    prefixNumericFolders: vi.fn(),
    revertFolderName: vi.fn(),
}));

vi.mock('../src/logic/statusBar', () => ({
    updateStatusBar: vi.fn(),
}));

describe('IndexableFoldersPlugin', () => {
    let plugin: IndexableFoldersPlugin;
    let mockApp: any;

    beforeEach(() => {
        // Create a fresh plugin instance for each test
        plugin = new IndexableFoldersPlugin(mockApp, {} as any);

        // Mock document.documentElement.style
        vi.spyOn(document.documentElement.style, 'setProperty');
        vi.spyOn(document.documentElement.style, 'removeProperty');
    });

    describe('Plugin Registration', () => {
        it('should be an instance of Plugin', () => {
            expect(plugin).toBeDefined();
            expect(plugin).toBeInstanceOf(IndexableFoldersPlugin);
        });

        it('should have required properties initialized', () => {
            expect(plugin.settings).toBeUndefined(); // Not loaded yet
            expect(plugin.folderObserver).toBeUndefined();
            expect(plugin.statusBarItemEl).toBeUndefined();
            expect(plugin.ignoreMutationsWhileMenuOpen).toBe(false);
        });

        it('should have exposed methods defined', () => {
            expect(typeof plugin.prefixNumericFolders).toBe('function');
            expect(typeof plugin.revertFolderName).toBe('function');
            expect(typeof plugin.updateStatusBar).toBe('function');
        });
    });

    describe('onload', () => {
        it('should load settings on plugin load', async () => {
            const loadDataSpy = vi
                .spyOn(plugin, 'loadData')
                .mockResolvedValue(null);
            const saveDataSpy = vi.spyOn(plugin, 'saveData');

            await plugin.onload();

            expect(loadDataSpy).toHaveBeenCalled();
            expect(plugin.settings).toBeDefined();
            expect(plugin.settings).toEqual(DEFAULT_SETTINGS);
        });

        it('should merge saved settings with defaults', async () => {
            const savedSettings = {
                separator: '-',
                debugEnabled: true,
            };

            vi.spyOn(plugin, 'loadData').mockResolvedValue(savedSettings);

            await plugin.onload();

            expect(plugin.settings).toEqual({
                ...DEFAULT_SETTINGS,
                ...savedSettings,
            });
        });

        it('should add status bar item', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue(null);
            const addStatusBarSpy = vi.spyOn(plugin, 'addStatusBarItem');

            await plugin.onload();

            expect(addStatusBarSpy).toHaveBeenCalled();
            expect(plugin.statusBarItemEl).toBeDefined();
        });

        it('should add settings tab', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue(null);
            const addSettingTabSpy = vi.spyOn(plugin, 'addSettingTab');

            await plugin.onload();

            expect(addSettingTabSpy).toHaveBeenCalled();
        });

        it('should initialize theme styles', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue(null);
            const updateLabelStylesSpy = vi.spyOn(plugin, 'updateLabelStyles');

            await plugin.onload();

            expect(updateLabelStylesSpy).toHaveBeenCalled();
        });

        it('should register events', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue(null);
            const { registerEvents } = await import('../src/events');

            await plugin.onload();

            expect(registerEvents).toHaveBeenCalledWith(plugin);
        });
    });

    describe('onunload', () => {
        it('should disconnect folder observer if it exists', () => {
            const mockObserver = {
                disconnect: vi.fn(),
                observe: vi.fn(),
                takeRecords: vi.fn(),
            };
            plugin.folderObserver = mockObserver as any;

            plugin.onunload();

            expect(mockObserver.disconnect).toHaveBeenCalled();
        });

        it('should not throw if folder observer does not exist', () => {
            plugin.folderObserver = undefined as any;

            expect(() => plugin.onunload()).not.toThrow();
        });

        it('should clean up mutation debounce timeout', () => {
            const mockTimeout = setTimeout(() => {}, 1000) as any;
            plugin['_mutationDebounceTimeout'] = mockTimeout;

            const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

            plugin.onunload();

            expect(clearTimeoutSpy).toHaveBeenCalledWith(mockTimeout);
            expect(plugin['_mutationDebounceTimeout']).toBeNull();
        });

        it('should clear pending mutations', () => {
            plugin['_pendingMutations'] = [
                {} as MutationRecord,
                {} as MutationRecord,
            ];

            plugin.onunload();

            expect(plugin['_pendingMutations']).toEqual([]);
        });

        it('should remove custom CSS properties', () => {
            const removePropertySpy = vi.spyOn(
                document.documentElement.style,
                'removeProperty'
            );

            plugin.onunload();

            expect(removePropertySpy).toHaveBeenCalledWith(
                '--indexable-folder-label-bg'
            );
            expect(removePropertySpy).toHaveBeenCalledWith(
                '--indexable-folder-label-text'
            );
        });
    });

    describe('loadSettings', () => {
        it('should load default settings when no saved data exists', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue(null);

            await plugin.loadSettings();

            expect(plugin.settings).toEqual(DEFAULT_SETTINGS);
        });

        it('should sanitize malicious color values on load', async () => {
            const maliciousSettings = {
                labelBackgroundColor: 'javascript:alert(1)',
                labelTextColor: '<script>alert(1)</script>',
            };

            vi.spyOn(plugin, 'loadData').mockResolvedValue(maliciousSettings);
            const saveSettingsSpy = vi
                .spyOn(plugin, 'saveSettings')
                .mockResolvedValue();

            await plugin.loadSettings();

            // Malicious values should be sanitized to defaults
            expect(plugin.settings.labelBackgroundColor).toBe(
                DEFAULT_SETTINGS.labelBackgroundColor
            );
            expect(plugin.settings.labelTextColor).toBe(
                DEFAULT_SETTINGS.labelTextColor
            );
            expect(saveSettingsSpy).toHaveBeenCalled();
        });

        it('should not save settings if colors are already valid', async () => {
            const validSettings = {
                labelBackgroundColor: '#007ACC',
                labelTextColor: '#FFFFFF',
            };

            vi.spyOn(plugin, 'loadData').mockResolvedValue(validSettings);
            const saveSettingsSpy = vi
                .spyOn(plugin, 'saveSettings')
                .mockResolvedValue();

            await plugin.loadSettings();

            expect(saveSettingsSpy).not.toHaveBeenCalled();
        });

        it('should invalidate regex cache when loading settings', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue(null);
            const invalidateSpy = vi.spyOn(
                plugin as any,
                'invalidateRegexCache'
            );

            await plugin.loadSettings();

            expect(invalidateSpy).toHaveBeenCalled();
        });
    });

    describe('saveSettings', () => {
        it('should save settings data', async () => {
            plugin.settings = { ...DEFAULT_SETTINGS };
            const saveDataSpy = vi.spyOn(plugin, 'saveData');

            await plugin.saveSettings();

            expect(saveDataSpy).toHaveBeenCalledWith(plugin.settings);
        });

        it('should invalidate regex cache when saving', async () => {
            plugin.settings = { ...DEFAULT_SETTINGS };
            vi.spyOn(plugin, 'saveData').mockResolvedValue();
            const invalidateSpy = vi.spyOn(
                plugin as any,
                'invalidateRegexCache'
            );

            await plugin.saveSettings();

            expect(invalidateSpy).toHaveBeenCalled();
        });
    });

    describe('Regex Caching', () => {
        beforeEach(() => {
            plugin.settings = { ...DEFAULT_SETTINGS };
        });

        it('should cache prefix regex', () => {
            const regex1 = plugin.getPrefixRegex();
            const regex2 = plugin.getPrefixRegex();

            expect(regex1).toBe(regex2); // Same instance (cached)
        });

        it('should cache numeric prefix regex', () => {
            const regex1 = plugin.getNumericPrefixRegex();
            const regex2 = plugin.getNumericPrefixRegex();

            expect(regex1).toBe(regex2); // Same instance (cached)
        });

        it('should invalidate cache when settings change', () => {
            const regex1 = plugin.getPrefixRegex();

            plugin.settings.separator = '-';
            plugin['invalidateRegexCache']();

            const regex2 = plugin.getPrefixRegex();

            expect(regex1).not.toBe(regex2); // Different instance
        });

        it('should generate correct prefix regex pattern', () => {
            plugin.settings.separator = '_';
            plugin.settings.specialPrefixes = 'zz, xx';

            const regex = plugin.getPrefixRegex();

            expect(regex.test('01_Folder')).toBe(true);
            expect(regex.test('zz_Archive')).toBe(true);
            expect(regex.test('xx_Special')).toBe(true);
            expect(regex.test('abc_NotIndexed')).toBe(false);
        });

        it('should generate correct numeric prefix regex pattern', () => {
            plugin.settings.separator = '_';

            const regex = plugin.getNumericPrefixRegex();

            expect(regex.test('01_Folder')).toBe(true);
            expect(regex.test('123_Folder')).toBe(true);
            expect(regex.test('zz_Folder')).toBe(false);
        });

        it('should escape special characters in separator', () => {
            plugin.settings.separator = '.';

            const regex = plugin.getPrefixRegex();

            expect(regex.test('01.Folder')).toBe(true);
            expect(regex.test('01XFolder')).toBe(false);
        });
    });

    describe('updateLabelStyles', () => {
        beforeEach(() => {
            plugin.settings = { ...DEFAULT_SETTINGS };
        });

        it('should set CSS custom properties', () => {
            const setPropertySpy = vi.spyOn(
                document.documentElement.style,
                'setProperty'
            );

            plugin.updateLabelStyles();

            expect(setPropertySpy).toHaveBeenCalledWith(
                '--indexable-folder-label-bg',
                expect.any(String)
            );
            expect(setPropertySpy).toHaveBeenCalledWith(
                '--indexable-folder-label-text',
                expect.any(String)
            );
        });

        it('should sanitize color values before applying', () => {
            plugin.settings.labelBackgroundColor = 'javascript:alert(1)';
            plugin.settings.labelTextColor = '#FFFFFF';

            const setPropertySpy = vi.spyOn(
                document.documentElement.style,
                'setProperty'
            );

            plugin.updateLabelStyles();

            // Malicious color should be replaced with fallback
            expect(setPropertySpy).toHaveBeenCalledWith(
                '--indexable-folder-label-bg',
                'var(--interactive-accent)'
            );
            expect(setPropertySpy).toHaveBeenCalledWith(
                '--indexable-folder-label-text',
                '#FFFFFF'
            );
        });

        it('should use fallback for empty color values', () => {
            plugin.settings.labelBackgroundColor = '';
            plugin.settings.labelTextColor = '';

            const setPropertySpy = vi.spyOn(
                document.documentElement.style,
                'setProperty'
            );

            plugin.updateLabelStyles();

            expect(setPropertySpy).toHaveBeenCalledWith(
                '--indexable-folder-label-bg',
                'var(--interactive-accent)'
            );
            expect(setPropertySpy).toHaveBeenCalledWith(
                '--indexable-folder-label-text',
                'var(--text-on-accent)'
            );
        });
    });

    describe('Mutation Handling', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should debounce mutation handling', () => {
            const mutation1 = {} as MutationRecord;
            const mutation2 = {} as MutationRecord;

            plugin.handleMutations([mutation1]);
            plugin.handleMutations([mutation2]);

            expect(plugin['_pendingMutations']).toHaveLength(2);

            // Fast-forward time
            vi.advanceTimersByTime(150);

            expect(plugin['_pendingMutations']).toHaveLength(0);
        });

        it('should clear existing timeout when new mutations arrive', () => {
            const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

            plugin.handleMutations([{} as MutationRecord]);
            const firstTimeout = plugin['_mutationDebounceTimeout'];

            plugin.handleMutations([{} as MutationRecord]);

            expect(clearTimeoutSpy).toHaveBeenCalledWith(firstTimeout);
        });
    });

    describe('batchDOMUpdates', () => {
        it('should execute operations in requestAnimationFrame', () => {
            const requestAnimationFrameSpy = vi.spyOn(
                global,
                'requestAnimationFrame'
            );
            const operation1 = vi.fn();
            const operation2 = vi.fn();

            plugin.batchDOMUpdates([operation1, operation2]);

            expect(requestAnimationFrameSpy).toHaveBeenCalled();
        });

        it('should handle empty operations array', () => {
            const requestAnimationFrameSpy = vi.spyOn(
                global,
                'requestAnimationFrame'
            );

            plugin.batchDOMUpdates([]);

            expect(requestAnimationFrameSpy).not.toHaveBeenCalled();
        });

        it('should catch errors in operations without stopping others', async () => {
            const consoleErrorSpy = vi
                .spyOn(console, 'error')
                .mockImplementation(() => {});
            const operation1 = vi.fn(() => {
                throw new Error('Test error');
            });
            const operation2 = vi.fn();

            plugin.batchDOMUpdates([operation1, operation2]);

            // Wait for requestAnimationFrame to execute
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(operation1).toHaveBeenCalled();
            expect(operation2).toHaveBeenCalled();
        });
    });
});
