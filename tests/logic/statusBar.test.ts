import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateStatusBar } from 'src/logic/statusBar';
import { TFolder, TFile } from 'obsidian';
import type IndexableFoldersPlugin from 'src/main';

// Mock the logger with shared mock
vi.mock('src/utils/logger', async () => {
    const mock = await import('tests/__mocks__/logger');
    return mock;
});

describe('statusBar', () => {
    describe('updateStatusBar', () => {
        let mockPlugin: IndexableFoldersPlugin;
        let mockStatusBarItemEl: HTMLElement;
        let mockWorkspace: any;
        let mockApp: any;
        let rootFolder: TFolder;

        // Helper function to create a folder chain with proper parent relationships
        // Returns the leaf folder (deepest in the hierarchy)
        const createFolderChain = (names: string[]): TFolder => {
            // Create root folder
            const root = new TFolder();
            root.name = '';
            root.path = '/';

            let currentParent: TFolder = root;
            let currentPath = '';

            // Build chain from root to leaf
            for (let i = 0; i < names.length; i++) {
                const folder = new TFolder();
                folder.name = names[i];
                currentPath = currentPath
                    ? `${currentPath}/${names[i]}`
                    : names[i];
                folder.path = currentPath;
                folder.parent = currentParent;

                currentParent = folder;
            }

            // Return the leaf folder
            return currentParent;
        };
        beforeEach(() => {
            // Create root folder for all tests
            rootFolder = new TFolder();
            rootFolder.name = '';
            rootFolder.path = '/';

            // Create mock status bar element
            mockStatusBarItemEl = document.createElement('div');

            // Spy on methods
            vi.spyOn(mockStatusBarItemEl, 'empty');
            vi.spyOn(mockStatusBarItemEl, 'appendChild');
            vi.spyOn(mockStatusBarItemEl, 'createEl');

            // Create mock workspace
            mockWorkspace = {
                getActiveFile: vi.fn(),
            };

            // Create mock app
            mockApp = {
                workspace: mockWorkspace,
            };

            // Create mock plugin
            mockPlugin = {
                app: mockApp,
                statusBarItemEl: mockStatusBarItemEl,
                settings: {
                    debugEnabled: false,
                    statusBarSeparator: ' › ',
                    separator: '_',
                    statusBarEnabled: true,
                },
                getPrefixRegex: vi.fn().mockReturnValue(/^(\d+)_/),
            } as unknown as IndexableFoldersPlugin;
        });

        it('should empty status bar when called', () => {
            mockWorkspace.getActiveFile.mockReturnValue(null);

            updateStatusBar(mockPlugin);

            expect(mockStatusBarItemEl.empty).toHaveBeenCalled();
        });

        it('should return early if no active file', () => {
            mockWorkspace.getActiveFile.mockReturnValue(null);

            updateStatusBar(mockPlugin);

            expect(mockStatusBarItemEl.empty).toHaveBeenCalled();
            expect(mockStatusBarItemEl.appendChild).not.toHaveBeenCalled();
        });

        it('should return early if active file has no parent', () => {
            const mockFile = new TFile();
            mockFile.name = 'test.md';
            mockFile.path = 'test.md';
            mockFile.parent = null;

            mockWorkspace.getActiveFile.mockReturnValue(mockFile);

            updateStatusBar(mockPlugin);

            expect(mockStatusBarItemEl.empty).toHaveBeenCalled();
            expect(mockStatusBarItemEl.appendChild).not.toHaveBeenCalled();
        });

        it('should display single folder without prefix', () => {
            const parentFolder = createFolderChain(['MyFolder']);

            const mockFile = new TFile();
            mockFile.name = 'test.md';
            mockFile.path = 'MyFolder/test.md';
            mockFile.parent = parentFolder;

            mockWorkspace.getActiveFile.mockReturnValue(mockFile);

            updateStatusBar(mockPlugin);

            expect(mockStatusBarItemEl.empty).toHaveBeenCalled();
            expect(mockStatusBarItemEl.appendChild).toHaveBeenCalled();
            // Check the status bar element's text content
            expect(mockStatusBarItemEl.textContent).toContain('MyFolder');
        });

        it('should display single folder with numeric prefix', () => {
            const parentFolder = createFolderChain(['01_MyFolder']);

            const mockFile = new TFile();
            mockFile.name = 'test.md';
            mockFile.path = '01_MyFolder/test.md';
            mockFile.parent = parentFolder;

            mockWorkspace.getActiveFile.mockReturnValue(mockFile);

            updateStatusBar(mockPlugin);

            expect(mockStatusBarItemEl.empty).toHaveBeenCalled();
            expect(mockStatusBarItemEl.appendChild).toHaveBeenCalled();

            // Check for prefix span in the status bar element
            const prefixSpan = mockStatusBarItemEl.querySelector(
                '.indexable-folder-prefix'
            );
            expect(prefixSpan).toBeTruthy();
            expect(prefixSpan?.textContent).toBe('01');
            expect(mockStatusBarItemEl.textContent).toContain('MyFolder');
        });

        it('should display nested folders with separators', () => {
            const parentFolder = createFolderChain(['GrandParent', 'Parent']);

            const mockFile = new TFile();
            mockFile.name = 'test.md';
            mockFile.path = 'GrandParent/Parent/test.md';
            mockFile.parent = parentFolder;

            mockWorkspace.getActiveFile.mockReturnValue(mockFile);

            updateStatusBar(mockPlugin);

            expect(mockStatusBarItemEl.empty).toHaveBeenCalled();
            // Should have called appendChild for folders and createEl for separator
            expect(mockStatusBarItemEl.appendChild).toHaveBeenCalled();
            expect(mockStatusBarItemEl.createEl).toHaveBeenCalledWith('span', {
                text: ' › ',
                cls: 'indexable-folder-path-separator',
            });

            // Verify final content
            expect(mockStatusBarItemEl.textContent).toContain('GrandParent');
            expect(mockStatusBarItemEl.textContent).toContain('Parent');
        });

        it('should display nested folders with numeric prefixes', () => {
            const parentFolder = createFolderChain([
                '01_GrandParent',
                '02_Parent',
            ]);

            const mockFile = new TFile();
            mockFile.name = 'test.md';
            mockFile.path = '01_GrandParent/02_Parent/test.md';
            mockFile.parent = parentFolder;

            mockWorkspace.getActiveFile.mockReturnValue(mockFile);

            updateStatusBar(mockPlugin);

            expect(mockStatusBarItemEl.empty).toHaveBeenCalled();
            expect(mockStatusBarItemEl.appendChild).toHaveBeenCalled();

            // Check that both folders have styled prefixes
            const prefixes = mockStatusBarItemEl.querySelectorAll(
                '.indexable-folder-prefix'
            );
            expect(prefixes.length).toBe(2);
            expect(prefixes[0].textContent).toBe('01');
            expect(prefixes[1].textContent).toBe('02');

            // Verify folder names
            expect(mockStatusBarItemEl.textContent).toContain('GrandParent');
            expect(mockStatusBarItemEl.textContent).toContain('Parent');
        });

        it('should display mixed prefixed and non-prefixed folders', () => {
            const parentFolder = createFolderChain([
                'NoPrefixFolder',
                '01_PrefixedFolder',
            ]);

            const mockFile = new TFile();
            mockFile.name = 'test.md';
            mockFile.path = 'NoPrefixFolder/01_PrefixedFolder/test.md';
            mockFile.parent = parentFolder;

            mockWorkspace.getActiveFile.mockReturnValue(mockFile);

            updateStatusBar(mockPlugin);

            expect(mockStatusBarItemEl.appendChild).toHaveBeenCalled();

            // First folder should not have prefix, second should
            const prefixes = mockStatusBarItemEl.querySelectorAll(
                '.indexable-folder-prefix'
            );
            expect(prefixes.length).toBe(1);
            expect(prefixes[0].textContent).toBe('01');

            // Verify both folder names appear
            expect(mockStatusBarItemEl.textContent).toContain('NoPrefixFolder');
            expect(mockStatusBarItemEl.textContent).toContain('PrefixedFolder');
        });

        it('should use custom status bar separator', () => {
            mockPlugin.settings.statusBarSeparator = ' / ';

            const parentFolder = createFolderChain(['Folder1', 'Folder2']);

            const mockFile = new TFile();
            mockFile.name = 'test.md';
            mockFile.path = 'Folder1/Folder2/test.md';
            mockFile.parent = parentFolder;

            mockWorkspace.getActiveFile.mockReturnValue(mockFile);

            updateStatusBar(mockPlugin);

            expect(mockStatusBarItemEl.createEl).toHaveBeenCalledWith('span', {
                text: ' / ',
                cls: 'indexable-folder-path-separator',
            });
        });

        it('should stop at root folder', () => {
            const parentFolder = createFolderChain(['Folder']);

            const mockFile = new TFile();
            mockFile.name = 'test.md';
            mockFile.path = 'Folder/test.md';
            mockFile.parent = parentFolder;

            mockWorkspace.getActiveFile.mockReturnValue(mockFile);

            updateStatusBar(mockPlugin);

            // Should only append 1 folder (not the root)
            expect(mockStatusBarItemEl.appendChild).toHaveBeenCalledTimes(1);
            // No separator needed
            expect(mockStatusBarItemEl.createEl).not.toHaveBeenCalled();
        });

        it('should handle deeply nested folder structure', () => {
            const level1 = createFolderChain([
                'Level3',
                '02_Level2',
                '01_Level1',
            ]);

            const mockFile = new TFile();
            mockFile.name = 'test.md';
            mockFile.path = 'Level3/02_Level2/01_Level1/test.md';
            mockFile.parent = level1;

            mockWorkspace.getActiveFile.mockReturnValue(mockFile);

            updateStatusBar(mockPlugin);

            // Should have 3 folders
            expect(mockStatusBarItemEl.appendChild).toHaveBeenCalled();

            // Verify all folder names appear
            expect(mockStatusBarItemEl.textContent).toContain('Level3');
            expect(mockStatusBarItemEl.textContent).toContain('Level2');
            expect(mockStatusBarItemEl.textContent).toContain('Level1');

            // Verify prefixes
            const prefixes = mockStatusBarItemEl.querySelectorAll(
                '.indexable-folder-prefix'
            );
            expect(prefixes.length).toBe(2); // 02_ and 01_
        });

        it('should handle folders with multi-digit prefixes', () => {
            const parentFolder = createFolderChain(['123_BigNumberFolder']);

            const mockFile = new TFile();
            mockFile.name = 'test.md';
            mockFile.path = '123_BigNumberFolder/test.md';
            mockFile.parent = parentFolder;

            mockWorkspace.getActiveFile.mockReturnValue(mockFile);

            updateStatusBar(mockPlugin);

            const prefixSpan = mockStatusBarItemEl.querySelector(
                '.indexable-folder-prefix'
            );
            expect(prefixSpan).toBeTruthy();
            expect(prefixSpan?.textContent).toBe('123');
            expect(mockStatusBarItemEl.textContent).toContain(
                'BigNumberFolder'
            );
        });

        it('should preserve folder order (root to leaf)', () => {
            const leafFolder = createFolderChain(['Root', 'Mid', 'Leaf']);

            const mockFile = new TFile();
            mockFile.name = 'test.md';
            mockFile.path = 'Root/Mid/Leaf/test.md';
            mockFile.parent = leafFolder;

            mockWorkspace.getActiveFile.mockReturnValue(mockFile);

            updateStatusBar(mockPlugin);

            // Verify order by checking that text appears in correct sequence
            const text = mockStatusBarItemEl.textContent || '';
            const rootIndex = text.indexOf('Root');
            const midIndex = text.indexOf('Mid');
            const leafIndex = text.indexOf('Leaf');

            expect(rootIndex).toBeGreaterThan(-1);
            expect(midIndex).toBeGreaterThan(rootIndex);
            expect(leafIndex).toBeGreaterThan(midIndex);
        });
    });
});
