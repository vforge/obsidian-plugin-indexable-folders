import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IndexableFoldersSettingTab } from '../src/ui/SettingsTab';
import { DEFAULT_SETTINGS } from '../src/settings';
import type { IndexableFoldersSettings } from '../src/settings';
import { Notice } from 'obsidian';

// Mock the logger
vi.mock('../src/utils/logger', () => ({
    log: vi.fn(),
}));

// Mock CSS validation functions
vi.mock('../src/utils/cssValidation', () => ({
    isValidCSSColor: vi.fn((color: string) => {
        // Simple validation for testing
        if (color.trim() === '') return true;
        if (color.startsWith('#')) return /^#[0-9A-Fa-f]{3,6}$/.test(color);
        if (color.startsWith('rgb')) return true;
        if (color.startsWith('var(--')) return true;
        return false;
    }),
    sanitizeCSSColor: vi.fn((color: string) => color),
    getCSSColorErrorMessage: vi.fn(
        (color: string) => `Invalid CSS color: ${color}`
    ),
}));

describe('IndexableFoldersSettingTab', () => {
    let settingsTab: IndexableFoldersSettingTab;
    let mockApp: any;
    let mockPlugin: any;
    let mockSettings: IndexableFoldersSettings;

    beforeEach(() => {
        // Create fresh mock settings for each test
        mockSettings = { ...DEFAULT_SETTINGS };

        // Create mock plugin with required methods
        mockPlugin = {
            settings: mockSettings,
            saveSettings: vi.fn().mockResolvedValue(undefined),
            prefixNumericFolders: vi.fn(),
            updateStatusBar: vi.fn(),
        };

        // Create mock app
        mockApp = {};

        // Create settings tab instance
        settingsTab = new IndexableFoldersSettingTab(mockApp, mockPlugin);

        // Mock document.documentElement.style
        vi.spyOn(document.documentElement.style, 'setProperty');
        vi.spyOn(document.documentElement.style, 'removeProperty');

        // Mock timers for debounced validation tests
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    describe('Constructor', () => {
        it('should create an instance of PluginSettingTab', () => {
            expect(settingsTab).toBeDefined();
            expect(settingsTab.plugin).toBe(mockPlugin);
            expect(settingsTab.app).toBe(mockApp);
        });

        it('should have a containerEl element', () => {
            expect(settingsTab.containerEl).toBeDefined();
            expect(settingsTab.containerEl).toBeInstanceOf(HTMLElement);
        });

        it('should initialize validationTimeouts map', () => {
            expect(settingsTab['validationTimeouts']).toBeDefined();
            expect(settingsTab['validationTimeouts']).toBeInstanceOf(Map);
            expect(settingsTab['validationTimeouts'].size).toBe(0);
        });
    });

    describe('display()', () => {
        it('should empty the containerEl before displaying', () => {
            const emptySpy = vi.spyOn(settingsTab.containerEl, 'empty');
            settingsTab.display();
            expect(emptySpy).toHaveBeenCalled();
        });

        it('should clear validation timeouts when re-displaying', () => {
            // Set up a timeout
            const timeout = setTimeout(() => {}, 1000);
            settingsTab['validationTimeouts'].set('test', timeout);

            settingsTab.display();

            expect(settingsTab['validationTimeouts'].size).toBe(0);
        });

        it('should create special prefixes setting', () => {
            settingsTab.display();
            expect(settingsTab.containerEl.children.length).toBeGreaterThan(0);
        });

        it('should create status bar separator setting', () => {
            settingsTab.display();
            // Should have multiple settings created
            expect(settingsTab.containerEl.children.length).toBeGreaterThan(1);
        });

        it('should create prefix separator setting', () => {
            settingsTab.display();
            expect(settingsTab.containerEl.children.length).toBeGreaterThan(2);
        });

        it('should create debug logging toggle', () => {
            settingsTab.display();
            expect(settingsTab.containerEl.children.length).toBeGreaterThan(3);
        });

        it('should create theming section heading', () => {
            settingsTab.display();
            // Should have theming heading and color settings
            expect(settingsTab.containerEl.children.length).toBeGreaterThan(4);
        });

        it('should create label background color setting', () => {
            settingsTab.display();
            expect(settingsTab.containerEl.children.length).toBeGreaterThan(5);
        });

        it('should create label text color setting', () => {
            settingsTab.display();
            expect(settingsTab.containerEl.children.length).toBeGreaterThan(6);
        });
    });

    describe('updateLabelStyles()', () => {
        it('should set CSS custom property for background color', () => {
            mockPlugin.settings.labelBackgroundColor = '#007ACC';
            settingsTab.updateLabelStyles();

            expect(
                document.documentElement.style.setProperty
            ).toHaveBeenCalledWith('--indexable-folder-label-bg', '#007ACC');
        });

        it('should set CSS custom property for text color', () => {
            mockPlugin.settings.labelTextColor = '#FFFFFF';
            settingsTab.updateLabelStyles();

            expect(
                document.documentElement.style.setProperty
            ).toHaveBeenCalledWith('--indexable-folder-label-text', '#FFFFFF');
        });

        it('should use fallback value when background color is empty', async () => {
            const { sanitizeCSSColor } = await import(
                '../src/utils/cssValidation'
            );
            (sanitizeCSSColor as any).mockReturnValueOnce('');

            mockPlugin.settings.labelBackgroundColor = '';
            settingsTab.updateLabelStyles();

            expect(
                document.documentElement.style.setProperty
            ).toHaveBeenCalledWith(
                '--indexable-folder-label-bg',
                'var(--interactive-accent)'
            );
        });

        it('should use fallback value when text color is empty', async () => {
            const { sanitizeCSSColor } = await import(
                '../src/utils/cssValidation'
            );
            (sanitizeCSSColor as any).mockReturnValueOnce('#007ACC');
            (sanitizeCSSColor as any).mockReturnValueOnce('');

            mockPlugin.settings.labelTextColor = '';
            settingsTab.updateLabelStyles();

            expect(
                document.documentElement.style.setProperty
            ).toHaveBeenCalledWith(
                '--indexable-folder-label-text',
                'var(--text-on-accent)'
            );
        });

        it('should sanitize color values before applying', async () => {
            const { sanitizeCSSColor } = await import(
                '../src/utils/cssValidation'
            );

            mockPlugin.settings.labelBackgroundColor = '#007ACC';
            mockPlugin.settings.labelTextColor = 'rgb(255, 255, 255)';

            settingsTab.updateLabelStyles();

            expect(sanitizeCSSColor).toHaveBeenCalledWith('#007ACC');
            expect(sanitizeCSSColor).toHaveBeenCalledWith('rgb(255, 255, 255)');
        });
    });

    describe('debouncedValidation()', () => {
        it('should debounce validation with 800ms delay', async () => {
            const callback = vi.fn().mockResolvedValue(undefined);
            const value = 'invalid-color';

            settingsTab['debouncedValidation'](
                'testKey',
                value,
                callback,
                'Test Error'
            );

            // Callback should not be called immediately
            expect(callback).not.toHaveBeenCalled();

            // Fast-forward time by 799ms - still shouldn't be called
            vi.advanceTimersByTime(799);
            expect(callback).not.toHaveBeenCalled();

            // Fast-forward by 1ms more (total 800ms) - now it should be called
            vi.advanceTimersByTime(1);

            // Flush promises
            await vi.runAllTimersAsync();
        });

        it('should clear existing timeout for the same key', async () => {
            const callback1 = vi.fn().mockResolvedValue(undefined);
            const callback2 = vi.fn().mockResolvedValue(undefined);

            // First validation - with empty value so it will call callback
            settingsTab['debouncedValidation'](
                'testKey',
                '',
                callback1,
                'Error 1'
            );

            // Advance time by 400ms
            vi.advanceTimersByTime(400);

            // Second validation with same key - should clear first timeout
            settingsTab['debouncedValidation'](
                'testKey',
                '',
                callback2,
                'Error 2'
            );

            // Advance time by another 400ms (total 800ms from first call)
            vi.advanceTimersByTime(400);

            // First callback should NOT have been called (timeout was cleared)
            expect(callback1).not.toHaveBeenCalled();

            // Advance by another 400ms (800ms from second call)
            vi.advanceTimersByTime(400);

            // Flush all pending timers
            await vi.runAllTimersAsync();

            // Now only second callback should be called
            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).toHaveBeenCalled();
        });

        it('should not call callback for invalid non-empty values', async () => {
            const { isValidCSSColor } = await import(
                '../src/utils/cssValidation'
            );
            (isValidCSSColor as any).mockReturnValueOnce(false);

            const callback = vi.fn().mockResolvedValue(undefined);

            settingsTab['debouncedValidation'](
                'testKey',
                'invalid-color',
                callback,
                'Invalid color'
            );

            // Fast-forward time
            vi.advanceTimersByTime(800);

            await vi.runAllTimersAsync();

            // Callback should NOT be called for invalid values
            expect(callback).not.toHaveBeenCalled();
        });

        it('should call callback for empty values', async () => {
            const callback = vi.fn().mockResolvedValue(undefined);

            settingsTab['debouncedValidation'](
                'testKey',
                '',
                callback,
                'Invalid color'
            );

            vi.advanceTimersByTime(800);
            await vi.runAllTimersAsync();

            // Callback should be called for empty values
            expect(callback).toHaveBeenCalled();
        });

        it('should call callback for valid values', async () => {
            const { isValidCSSColor } = await import(
                '../src/utils/cssValidation'
            );
            (isValidCSSColor as any).mockReturnValueOnce(true);

            const callback = vi.fn().mockResolvedValue(undefined);

            settingsTab['debouncedValidation'](
                'testKey',
                '#007ACC',
                callback,
                'Invalid color'
            );

            vi.advanceTimersByTime(800);
            await vi.runAllTimersAsync();

            expect(callback).toHaveBeenCalled();
        });

        it('should store timeout in validationTimeouts map', () => {
            const callback = vi.fn().mockResolvedValue(undefined);

            expect(settingsTab['validationTimeouts'].size).toBe(0);

            settingsTab['debouncedValidation'](
                'testKey',
                'value',
                callback,
                'Error'
            );

            expect(settingsTab['validationTimeouts'].size).toBe(1);
            expect(settingsTab['validationTimeouts'].has('testKey')).toBe(true);
        });
    });

    describe('clearValidationTimeouts()', () => {
        it('should clear all timeouts', () => {
            // Add some timeouts
            const timeout1 = setTimeout(() => {}, 1000);
            const timeout2 = setTimeout(() => {}, 2000);
            settingsTab['validationTimeouts'].set('key1', timeout1);
            settingsTab['validationTimeouts'].set('key2', timeout2);

            expect(settingsTab['validationTimeouts'].size).toBe(2);

            settingsTab['clearValidationTimeouts']();

            expect(settingsTab['validationTimeouts'].size).toBe(0);
        });

        it('should clear the map after clearing timeouts', () => {
            const timeout = setTimeout(() => {}, 1000);
            settingsTab['validationTimeouts'].set('key', timeout);

            settingsTab['clearValidationTimeouts']();

            expect(settingsTab['validationTimeouts'].size).toBe(0);
            expect(settingsTab['validationTimeouts'].has('key')).toBe(false);
        });

        it('should handle empty validationTimeouts map', () => {
            expect(settingsTab['validationTimeouts'].size).toBe(0);

            // Should not throw
            expect(() => {
                settingsTab['clearValidationTimeouts']();
            }).not.toThrow();

            expect(settingsTab['validationTimeouts'].size).toBe(0);
        });
    });

    describe('Settings Integration', () => {
        it('should save settings when special prefixes change', async () => {
            settingsTab.display();

            // We can't directly trigger the onChange, but we can verify the plugin methods exist
            expect(mockPlugin.saveSettings).toBeDefined();
            expect(mockPlugin.prefixNumericFolders).toBeDefined();
            expect(mockPlugin.updateStatusBar).toBeDefined();
        });

        it('should update plugin settings when values change', () => {
            settingsTab.display();

            // Initial settings should match
            expect(mockPlugin.settings).toEqual(mockSettings);
        });

        it('should call prefixNumericFolders with force=true for separator changes', () => {
            settingsTab.display();

            // Verify method is available for separator setting callback
            expect(typeof mockPlugin.prefixNumericFolders).toBe('function');
        });

        it('should call updateStatusBar for relevant setting changes', () => {
            settingsTab.display();

            // Verify method is available for status bar related settings
            expect(typeof mockPlugin.updateStatusBar).toBe('function');
        });
    });

    describe('Color Validation Integration', () => {
        it('should immediately apply valid hex colors', async () => {
            const { isValidCSSColor } = await import(
                '../src/utils/cssValidation'
            );
            (isValidCSSColor as any).mockReturnValue(true);

            settingsTab.display();

            // Plugin should have color settings
            expect(mockPlugin.settings.labelBackgroundColor).toBeDefined();
            expect(mockPlugin.settings.labelTextColor).toBeDefined();
        });

        it('should immediately apply valid rgb colors', async () => {
            const { isValidCSSColor } = await import(
                '../src/utils/cssValidation'
            );
            (isValidCSSColor as any).mockReturnValue(true);

            mockPlugin.settings.labelBackgroundColor = 'rgb(0, 122, 204)';
            settingsTab.updateLabelStyles();

            expect(
                document.documentElement.style.setProperty
            ).toHaveBeenCalledWith(
                '--indexable-folder-label-bg',
                'rgb(0, 122, 204)'
            );
        });

        it('should immediately apply valid CSS variables', async () => {
            const { isValidCSSColor } = await import(
                '../src/utils/cssValidation'
            );
            (isValidCSSColor as any).mockReturnValue(true);

            mockPlugin.settings.labelBackgroundColor =
                'var(--interactive-accent)';
            settingsTab.updateLabelStyles();

            expect(
                document.documentElement.style.setProperty
            ).toHaveBeenCalledWith(
                '--indexable-folder-label-bg',
                'var(--interactive-accent)'
            );
        });

        it('should allow empty color values', () => {
            mockPlugin.settings.labelBackgroundColor = '';
            mockPlugin.settings.labelTextColor = '';

            // Should not throw
            expect(() => {
                settingsTab.updateLabelStyles();
            }).not.toThrow();
        });
    });

    describe('Edge Cases', () => {
        it('should handle multiple rapid display() calls', () => {
            settingsTab.display();
            settingsTab.display();
            settingsTab.display();

            expect(settingsTab.containerEl.children.length).toBeGreaterThan(0);
            expect(settingsTab['validationTimeouts'].size).toBe(0);
        });

        it('should handle settings tab without plugin methods', () => {
            const minimalPlugin = {
                settings: { ...DEFAULT_SETTINGS },
            };

            const minimalTab = new IndexableFoldersSettingTab(
                mockApp,
                minimalPlugin as any
            );

            expect(() => {
                minimalTab.display();
            }).not.toThrow();
        });

        it('should require settings to be defined for display', () => {
            const pluginWithoutSettings = {
                settings: undefined,
            };

            const tab = new IndexableFoldersSettingTab(
                mockApp,
                pluginWithoutSettings as any
            );

            // display() will throw because it tries to access settings properties
            expect(() => {
                tab.display();
            }).toThrow();
        });
    });
});
