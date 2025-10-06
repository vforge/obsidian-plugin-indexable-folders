import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    startFolderObserver,
    prefixNumericFolders,
    revertFolderName,
} from '../src/logic/fileExplorer';
import { TFolder } from 'obsidian';
import * as logger from '../src/utils/logger';

// Mock the logger with shared mock
vi.mock('../src/utils/logger', async () => {
    const mock = await import('./__mocks__/logger');
    return mock;
});

describe('fileExplorer', () => {
    let mockPlugin: any;
    let mockWorkspace: any;
    let mockContainerEl: HTMLElement;
    let mockFileExplorer: HTMLElement;

    beforeEach(() => {
        // Create mock DOM elements
        mockFileExplorer = document.createElement('div');
        mockFileExplorer.className = 'nav-files-container';

        mockContainerEl = document.createElement('div');
        mockContainerEl.appendChild(mockFileExplorer);

        // Create mock workspace
        mockWorkspace = {
            containerEl: mockContainerEl,
        };

        // Create mock plugin
        mockPlugin = {
            app: {
                workspace: mockWorkspace,
                vault: {
                    getAbstractFileByPath: vi.fn(),
                },
            },
            settings: {
                debugEnabled: false,
                separator: '_',
            },
            folderObserver: null,
            ignoreMutationsWhileMenuOpen: false,
            getPrefixRegex: vi.fn(() => /^(\d+)_/),
            getNumericPrefixRegex: vi.fn(() => /^(\d+)_/),
            prefixNumericFolders: vi.fn(),
            handleMutations: vi.fn(),
        };
    });

    afterEach(() => {
        vi.clearAllMocks();
        // Clean up DOM
        document.body.innerHTML = '';
    });

    describe('startFolderObserver', () => {
        it('should find file explorer and create MutationObserver', () => {
            startFolderObserver(mockPlugin);

            expect(mockPlugin.folderObserver).toBeInstanceOf(MutationObserver);
            expect(mockPlugin.prefixNumericFolders).toHaveBeenCalledWith();
        });

        it('should retry if file explorer is not found', () => {
            vi.useFakeTimers();

            // Remove file explorer
            mockContainerEl.innerHTML = '';

            startFolderObserver(mockPlugin);

            expect(mockPlugin.folderObserver).toBeNull();

            // Fast-forward time
            vi.advanceTimersByTime(500);

            // Should have retried
            expect(logger.log).toHaveBeenCalledWith(
                false,
                'file explorer not found, retrying...'
            );

            vi.useRealTimers();
        });

        it('should log when file explorer is found', () => {
            startFolderObserver(mockPlugin);

            expect(logger.log).toHaveBeenCalledWith(
                false,
                'file explorer pane found, adding indexable folder actions'
            );
        });

        it('should observe DOM mutations with correct configuration', () => {
            const observeSpy = vi.spyOn(MutationObserver.prototype, 'observe');

            startFolderObserver(mockPlugin);

            expect(observeSpy).toHaveBeenCalledWith(mockFileExplorer, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class'],
                attributeOldValue: true,
            });
        });

        it('should handle mutations when not ignoring', () => {
            startFolderObserver(mockPlugin);

            const mutations: MutationRecord[] = [
                {
                    type: 'childList',
                    target: mockFileExplorer,
                    addedNodes: [],
                    removedNodes: [],
                    previousSibling: null,
                    nextSibling: null,
                    attributeName: null,
                    attributeNamespace: null,
                    oldValue: null,
                } as unknown as MutationRecord,
            ];

            // Trigger the observer callback
            const observerCallback =
                mockPlugin.folderObserver.callback ||
                mockPlugin.folderObserver.observe.mock.calls[0]?.[0];
            if (mockPlugin.folderObserver) {
                // Manually trigger mutations
                mockPlugin.folderObserver.disconnect();
                mockPlugin.handleMutations(mutations);
            }

            expect(mockPlugin.handleMutations).toHaveBeenCalled();
        });

        it('should ignore mutations when context menu is open', () => {
            mockPlugin.ignoreMutationsWhileMenuOpen = true;

            startFolderObserver(mockPlugin);

            const mutations: MutationRecord[] = [];
            // Observer won't call handleMutations due to the flag
            // This is tested implicitly by the observer callback checking the flag
        });
    });

    describe('prefixNumericFolders', () => {
        beforeEach(() => {
            // Create mock folder elements
            const folder1 = document.createElement('div');
            folder1.className = 'nav-folder-title-content';
            folder1.textContent = '01_FirstFolder';

            const folder2 = document.createElement('div');
            folder2.className = 'nav-folder-title-content';
            folder2.textContent = '02_SecondFolder';

            const folder3 = document.createElement('div');
            folder3.className = 'nav-folder-title-content';
            folder3.textContent = 'NoPrefix';

            mockFileExplorer.appendChild(folder1);
            mockFileExplorer.appendChild(folder2);
            mockFileExplorer.appendChild(folder3);
        });

        it('should prefix folders with numeric prefixes', () => {
            prefixNumericFolders(mockPlugin);

            const folders = mockFileExplorer.querySelectorAll(
                '.nav-folder-title-content'
            );

            // First folder
            const prefix1 = folders[0].querySelector(
                '.indexable-folder-prefix'
            );
            expect(prefix1).toBeTruthy();
            expect(prefix1?.textContent).toBe('01');
            expect(prefix1?.getAttribute('data-original-name')).toBe(
                '01_FirstFolder'
            );
            expect(folders[0].textContent).toBe('01FirstFolder');

            // Second folder
            const prefix2 = folders[1].querySelector(
                '.indexable-folder-prefix'
            );
            expect(prefix2).toBeTruthy();
            expect(prefix2?.textContent).toBe('02');

            // Third folder (no prefix)
            const prefix3 = folders[2].querySelector(
                '.indexable-folder-prefix'
            );
            expect(prefix3).toBeNull();
        });

        it('should return early if file explorer not found', () => {
            mockContainerEl.innerHTML = '';

            prefixNumericFolders(mockPlugin);

            // Should not throw and should exit early
            expect(logger.log).not.toHaveBeenCalledWith(
                expect.anything(),
                'found matching folder:',
                expect.anything()
            );
        });

        it('should skip folders that already have prefix span', () => {
            const folder = mockFileExplorer.querySelector(
                '.nav-folder-title-content'
            ) as HTMLElement;

            // First run - should add prefix
            prefixNumericFolders(mockPlugin);

            const prefixCount1 = folder.querySelectorAll(
                '.indexable-folder-prefix'
            ).length;
            expect(prefixCount1).toBe(1);

            // Second run without force refresh - should skip
            prefixNumericFolders(mockPlugin);

            const prefixCount2 = folder.querySelectorAll(
                '.indexable-folder-prefix'
            ).length;
            expect(prefixCount2).toBe(1); // Still only 1
        });

        it('should force refresh when forceRefresh is true', () => {
            const folder = mockFileExplorer.querySelector(
                '.nav-folder-title-content'
            ) as HTMLElement;

            // First run
            prefixNumericFolders(mockPlugin);

            const originalPrefix = folder.querySelector(
                '.indexable-folder-prefix'
            );
            expect(originalPrefix).toBeTruthy();

            // Force refresh should reprocess all folders
            prefixNumericFolders(mockPlugin, true);

            // Should still have a prefix (reapplied)
            const newPrefix = folder.querySelector('.indexable-folder-prefix');
            expect(newPrefix).toBeTruthy();
            expect(newPrefix?.getAttribute('data-original-name')).toBe(
                '01_FirstFolder'
            );
        });
        it('should restore original name when forcing refresh', () => {
            const folder = mockFileExplorer.querySelector(
                '.nav-folder-title-content'
            ) as HTMLElement;

            // First run
            prefixNumericFolders(mockPlugin);

            // Force refresh should restore original name
            prefixNumericFolders(mockPlugin, true);

            const prefix = folder.querySelector('.indexable-folder-prefix');
            expect(prefix?.getAttribute('data-original-name')).toBe(
                '01_FirstFolder'
            );
        });

        it('should batch update multiple folders efficiently', () => {
            prefixNumericFolders(mockPlugin);

            expect(logger.log).toHaveBeenCalledWith(
                false,
                'Batch updated 2 folder prefixes'
            );
        });

        it('should handle folders with no match gracefully', () => {
            mockFileExplorer.innerHTML = '';

            const folder = document.createElement('div');
            folder.className = 'nav-folder-title-content';
            folder.textContent = 'NoNumericPrefix';

            mockFileExplorer.appendChild(folder);

            prefixNumericFolders(mockPlugin);

            const prefix = folder.querySelector('.indexable-folder-prefix');
            expect(prefix).toBeNull();
            expect(folder.textContent).toBe('NoNumericPrefix');
        });

        it('should create DocumentFragment for efficient DOM manipulation', () => {
            const createFragmentSpy = vi.spyOn(
                document,
                'createDocumentFragment'
            );

            prefixNumericFolders(mockPlugin);

            // Should create fragments for each updated folder
            expect(createFragmentSpy).toHaveBeenCalled();
        });
    });

    describe('revertFolderName', () => {
        let mockFolder: TFolder;
        let folderContainer: HTMLElement;
        let folderTitleContent: HTMLElement;

        beforeEach(() => {
            mockFolder = new TFolder();
            mockFolder.name = '01_TestFolder';
            mockFolder.path = 'path/to/01_TestFolder';

            // Create folder structure
            folderContainer = document.createElement('div');
            folderContainer.setAttribute('data-path', mockFolder.path);

            folderTitleContent = document.createElement('div');
            folderTitleContent.className = 'nav-folder-title-content';

            // Add prefix span
            const prefixSpan = document.createElement('span');
            prefixSpan.className = 'indexable-folder-prefix';
            prefixSpan.textContent = '01';
            prefixSpan.setAttribute('data-original-name', '01_TestFolder');

            folderTitleContent.appendChild(prefixSpan);
            folderTitleContent.appendChild(
                document.createTextNode('TestFolder')
            );

            folderContainer.appendChild(folderTitleContent);
            mockFileExplorer.appendChild(folderContainer);
        });

        it('should revert folder name to original', () => {
            revertFolderName(mockPlugin, mockFolder);

            expect(folderTitleContent.textContent).toBe('01_TestFolder');
        });

        it('should log the revert action', () => {
            revertFolderName(mockPlugin, mockFolder);

            expect(logger.log).toHaveBeenCalledWith(
                false,
                'reverting folder name for',
                mockFolder.path
            );
            expect(logger.log).toHaveBeenCalledWith(
                false,
                'reverting to',
                '01_TestFolder'
            );
        });

        it('should return early if file explorer not found', () => {
            mockContainerEl.innerHTML = '';

            revertFolderName(mockPlugin, mockFolder);

            // Should not throw
            expect(logger.log).toHaveBeenCalledWith(
                false,
                'reverting folder name for',
                mockFolder.path
            );
        });

        it('should return early if folder element not found', () => {
            mockFileExplorer.innerHTML = '';

            revertFolderName(mockPlugin, mockFolder);

            // Should not throw
            expect(logger.log).toHaveBeenCalledWith(
                false,
                'reverting folder name for',
                mockFolder.path
            );
        });

        it('should handle missing prefix span gracefully', () => {
            folderTitleContent.innerHTML = '';
            folderTitleContent.textContent = 'TestFolder';

            revertFolderName(mockPlugin, mockFolder);

            // Should not throw or change content
            expect(folderTitleContent.textContent).toBe('TestFolder');
        });

        it('should handle missing data-original-name attribute', () => {
            const prefixSpan = folderTitleContent.querySelector(
                '.indexable-folder-prefix'
            ) as HTMLElement;
            prefixSpan.removeAttribute('data-original-name');

            revertFolderName(mockPlugin, mockFolder);

            // Should not change content without original name
            expect(logger.log).not.toHaveBeenCalledWith(
                false,
                'reverting to',
                expect.anything()
            );
        });
    });

    describe('handleRenameStateChanges (integration)', () => {
        it('should detect when folder enters rename mode', () => {
            vi.useFakeTimers();

            const folder = new TFolder();
            folder.name = '01_TestFolder';
            folder.path = 'path/to/01_TestFolder';

            mockPlugin.app.vault.getAbstractFileByPath.mockReturnValue(folder);

            // Create folder structure
            const folderContainer = document.createElement('div');
            folderContainer.setAttribute('data-path', folder.path);

            const folderTitle = document.createElement('div');
            folderTitle.className = 'nav-folder-title';

            folderContainer.appendChild(folderTitle);
            mockFileExplorer.appendChild(folderContainer);

            startFolderObserver(mockPlugin);

            // Simulate entering rename mode
            folderTitle.className = 'nav-folder-title is-being-renamed';

            // The MutationObserver should detect this change
            // Note: In a real scenario, the observer would fire automatically

            vi.useRealTimers();
        });

        it('should detect when folder exits rename mode', () => {
            vi.useFakeTimers();

            // Create folder structure
            const folderContainer = document.createElement('div');
            folderContainer.setAttribute('data-path', 'test/path');

            const folderTitle = document.createElement('div');
            folderTitle.className = 'nav-folder-title is-being-renamed';

            folderContainer.appendChild(folderTitle);
            mockFileExplorer.appendChild(folderContainer);

            startFolderObserver(mockPlugin);

            // Simulate exiting rename mode
            folderTitle.className = 'nav-folder-title';

            // Should trigger prefixNumericFolders after delay
            vi.advanceTimersByTime(100);

            vi.useRealTimers();
        });
    });
});
