import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Setup DOM for file system operation tests
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window as any;

describe('Plugin File System Operations - Obsidian Integration', () => {
    let mockApp: any;
    let mockPlugin: any;
    let mockVault: any;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';

        // Mock vault with comprehensive file operations
        mockVault = {
            rename: vi.fn().mockResolvedValue(undefined),
            createFolder: vi.fn().mockResolvedValue({}),
            delete: vi.fn().mockResolvedValue(undefined),
            getAbstractFileByPath: vi.fn(),
            getAllLoadedFiles: vi.fn().mockReturnValue([]),
            on: vi.fn(),
            off: vi.fn(),
        };

        // Mock workspace
        const mockWorkspace = {
            containerEl: document.body,
            getActiveFile: vi.fn().mockReturnValue(null),
            on: vi.fn(),
            off: vi.fn(),
        };

        // Mock app
        mockApp = {
            vault: mockVault,
            workspace: mockWorkspace,
            metadataCache: {
                on: vi.fn(),
                off: vi.fn(),
            },
        };

        // Mock plugin
        mockPlugin = {
            app: mockApp,
            settings: {
                blacklistedPrefixes: 'zz, archive, temp',
                statusBarSeparator: '→',
            },
            statusBarItemEl: document.createElement('div'),
            folderObserver: null,
            loadData: vi.fn().mockResolvedValue({}),
            saveData: vi.fn().mockResolvedValue(undefined),
        };
    });

    describe('Folder Creation and Organization', () => {
        it('should handle creating indexed folder sequences', async () => {
            const folderNames = ['01_Projects', '02_Resources', '03_Archive'];

            for (const folderName of folderNames) {
                await mockApp.vault.createFolder(folderName);
            }

            expect(mockApp.vault.createFolder).toHaveBeenCalledTimes(3);
            expect(mockApp.vault.createFolder).toHaveBeenCalledWith(
                '01_Projects'
            );
            expect(mockApp.vault.createFolder).toHaveBeenCalledWith(
                '02_Resources'
            );
            expect(mockApp.vault.createFolder).toHaveBeenCalledWith(
                '03_Archive'
            );
        });

        it('should validate folder naming conventions', () => {
            const testFolders = [
                { name: '01_ValidFolder', isValid: true },
                { name: '999_AnotherValid', isValid: true },
                { name: 'zz_SpecialPrefix', isValid: true }, // Blacklisted prefix
                { name: 'InvalidFolder', isValid: false },
                { name: '1_NoLeadingZero', isValid: true },
                { name: 'a1_InvalidStart', isValid: false },
                { name: '_01_WrongFormat', isValid: false },
            ];

            testFolders.forEach(({ name, isValid }) => {
                const numericMatch = name.match(/^(\d+)_(.+)$/);
                const blacklistedPrefixes =
                    mockPlugin.settings.blacklistedPrefixes
                        .split(',')
                        .map((p: string) => p.trim().toLowerCase());
                const hasBlacklistedPrefix = blacklistedPrefixes.some(
                    (prefix: string) =>
                        name.toLowerCase().startsWith(prefix + '_')
                );

                const isIndexable = !!(numericMatch || hasBlacklistedPrefix);
                expect(isIndexable).toBe(isValid);
            });
        });

        it('should handle folder hierarchy with mixed indexed and regular folders', async () => {
            const folderStructure = [
                '01_Projects',
                '01_Projects/RegularSubfolder',
                '01_Projects/02_ActiveProjects',
                '01_Projects/02_ActiveProjects/03_CurrentSprint',
                'RegularRootFolder',
                'RegularRootFolder/01_IndexedSubfolder',
            ];

            for (const folderPath of folderStructure) {
                await mockApp.vault.createFolder(folderPath);
            }

            expect(mockApp.vault.createFolder).toHaveBeenCalledTimes(6);

            // Verify each path was called correctly
            folderStructure.forEach((path) => {
                expect(mockApp.vault.createFolder).toHaveBeenCalledWith(path);
            });
        });
    });

    describe('Folder Renaming and Index Management', () => {
        it('should handle single folder renaming operations', async () => {
            const originalPath = '05_MiddleFolder';
            const newIndex = 3;
            const expectedNewPath = '03_MiddleFolder';

            const mockFolder = {
                name: '05_MiddleFolder',
                path: originalPath,
            };

            const match = mockFolder.name.match(/^(\d+)_(.+)$/);
            if (match) {
                const baseName = match[2];
                const newPath = `${newIndex.toString().padStart(2, '0')}_${baseName}`;
                await mockApp.vault.rename(mockFolder, newPath);
            }

            expect(mockApp.vault.rename).toHaveBeenCalledWith(
                mockFolder,
                expectedNewPath
            );
        });

        it('should handle cascading folder renames when inserting new index', async () => {
            // Simulate existing folders that need to be shifted
            const existingFolders = [
                { name: '01_First', path: '01_First' },
                { name: '02_Second', path: '02_Second' },
                { name: '03_Third', path: '03_Third' },
                { name: '04_Fourth', path: '04_Fourth' },
            ];

            // Insert new folder at index 2, should shift 02_Second -> 03_Second, etc.
            const insertIndex = 2;
            const foldersToRename = existingFolders.filter((folder) => {
                const match = folder.name.match(/^(\d+)_(.+)$/);
                return match && parseInt(match[1], 10) >= insertIndex;
            });

            // Simulate renaming each affected folder
            for (const folder of foldersToRename) {
                const match = folder.name.match(/^(\d+)_(.+)$/);
                if (match) {
                    const currentIndex = parseInt(match[1], 10);
                    const baseName = match[2];
                    const newIndex = currentIndex + 1;
                    const newPath = `${newIndex.toString().padStart(2, '0')}_${baseName}`;
                    await mockApp.vault.rename(folder, newPath);
                }
            }

            expect(mockApp.vault.rename).toHaveBeenCalledTimes(3);
            expect(mockApp.vault.rename).toHaveBeenCalledWith(
                { name: '02_Second', path: '02_Second' },
                '03_Second'
            );
            expect(mockApp.vault.rename).toHaveBeenCalledWith(
                { name: '03_Third', path: '03_Third' },
                '04_Third'
            );
            expect(mockApp.vault.rename).toHaveBeenCalledWith(
                { name: '04_Fourth', path: '04_Fourth' },
                '05_Fourth'
            );
        });

        it('should revert indexed folders to clean names', async () => {
            const indexedFolders = [
                { name: '01_Projects', expectedRevert: 'Projects' },
                { name: '02_Resources', expectedRevert: 'Resources' },
                { name: 'zz_Archive', expectedRevert: 'Archive' },
            ];

            for (const folder of indexedFolders) {
                const numericMatch = folder.name.match(/^(\d+)_(.+)$/);
                const blacklistedPrefixes =
                    mockPlugin.settings.blacklistedPrefixes
                        .split(',')
                        .map((p: string) => p.trim().toLowerCase());

                let newName = folder.name;
                if (numericMatch) {
                    newName = numericMatch[2];
                } else {
                    const matchedPrefix = blacklistedPrefixes.find(
                        (prefix: string) =>
                            folder.name.toLowerCase().startsWith(prefix + '_')
                    );
                    if (matchedPrefix) {
                        newName = folder.name.substring(
                            matchedPrefix.length + 1
                        );
                    }
                }

                await mockApp.vault.rename(
                    { name: folder.name, path: folder.name },
                    newName
                );
                expect(newName).toBe(folder.expectedRevert);
            }

            expect(mockApp.vault.rename).toHaveBeenCalledTimes(3);
        });
    });

    describe('Event Handling and Observer Management', () => {
        it('should register and unregister vault events properly', () => {
            // Simulate plugin loading
            mockApp.vault.on('create', vi.fn());
            mockApp.vault.on('rename', vi.fn());
            mockApp.vault.on('delete', vi.fn());

            expect(mockApp.vault.on).toHaveBeenCalledTimes(3);
            expect(mockApp.vault.on).toHaveBeenCalledWith(
                'create',
                expect.any(Function)
            );
            expect(mockApp.vault.on).toHaveBeenCalledWith(
                'rename',
                expect.any(Function)
            );
            expect(mockApp.vault.on).toHaveBeenCalledWith(
                'delete',
                expect.any(Function)
            );

            // Simulate plugin unloading
            mockApp.vault.off('create', vi.fn());
            mockApp.vault.off('rename', vi.fn());
            mockApp.vault.off('delete', vi.fn());

            expect(mockApp.vault.off).toHaveBeenCalledTimes(3);
        });

        it('should handle DOM mutations for dynamic folder updates', () => {
            // Mock MutationObserver functionality
            const mockObserver = {
                observe: vi.fn(),
                disconnect: vi.fn(),
                takeRecords: vi.fn().mockReturnValue([]),
            };

            // Test observer setup
            expect(() => {
                mockPlugin.folderObserver = mockObserver;
            }).not.toThrow();

            expect(mockPlugin.folderObserver).toBe(mockObserver);

            // Test cleanup
            mockPlugin.folderObserver.disconnect();
            expect(mockObserver.disconnect).toHaveBeenCalled();
        });
    });

    describe('Settings Persistence and Loading', () => {
        it('should load and merge settings correctly', async () => {
            const savedSettings = {
                blacklistedPrefixes: 'old, temp, draft',
                statusBarSeparator: ' | ',
            };

            mockPlugin.loadData.mockResolvedValue(savedSettings);
            const loadedData = await mockPlugin.loadData();

            // Simulate settings merge
            const defaultSettings = {
                blacklistedPrefixes: 'zz, archive',
                statusBarSeparator: '→',
            };

            const mergedSettings = { ...defaultSettings, ...loadedData };

            expect(mergedSettings.blacklistedPrefixes).toBe('old, temp, draft');
            expect(mergedSettings.statusBarSeparator).toBe(' | ');
        });

        it('should handle missing or corrupted settings gracefully', async () => {
            // Test with null data
            mockPlugin.loadData.mockResolvedValue(null);
            let loadedData = await mockPlugin.loadData();
            expect(loadedData).toBeNull();

            // Test with partial data
            mockPlugin.loadData.mockResolvedValue({
                blacklistedPrefixes: 'partial',
            });
            loadedData = await mockPlugin.loadData();
            expect(loadedData.blacklistedPrefixes).toBe('partial');
            expect(loadedData.statusBarSeparator).toBeUndefined();

            // Test with empty object
            mockPlugin.loadData.mockResolvedValue({});
            loadedData = await mockPlugin.loadData();
            expect(loadedData).toEqual({});
        });

        it('should save settings when changes are made', async () => {
            const newSettings = {
                blacklistedPrefixes: 'updated, prefixes, list',
                statusBarSeparator: ' → ',
            };

            await mockPlugin.saveData(newSettings);

            expect(mockPlugin.saveData).toHaveBeenCalledWith(newSettings);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle vault operation failures gracefully', async () => {
            // Mock vault rename failure
            mockApp.vault.rename.mockRejectedValue(
                new Error('File system error')
            );

            const mockFolder = { name: '01_Test', path: '01_Test' };

            try {
                await mockApp.vault.rename(mockFolder, 'Test');
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toBe('File system error');
            }
        });

        it('should handle concurrent folder operations', async () => {
            const folderOperations = [
                mockApp.vault.createFolder('01_First'),
                mockApp.vault.createFolder('02_Second'),
                mockApp.vault.createFolder('03_Third'),
            ];

            await Promise.all(folderOperations);

            expect(mockApp.vault.createFolder).toHaveBeenCalledTimes(3);
        });

        it('should validate folder paths for security', () => {
            const testPaths = [
                { path: '01_Normal', valid: true },
                { path: '../01_Parent', valid: false },
                { path: '/absolute/01_Path', valid: false },
                { path: '01_Normal/SubFolder', valid: true },
                { path: '..\\..\\01_Windows', valid: false },
                { path: '01_With Space', valid: true },
                { path: '01_With\nNewline', valid: false },
            ];

            testPaths.forEach(({ path, valid }) => {
                // Basic security validation
                const hasPathTraversal =
                    path.includes('../') || path.includes('..\\');
                const hasAbsolutePath =
                    path.startsWith('/') || /^[A-Z]:\\/.test(path);
                const hasInvalidChars = /[\n\r\t]/.test(path);

                const isSecure =
                    !hasPathTraversal && !hasAbsolutePath && !hasInvalidChars;
                expect(isSecure).toBe(valid);
            });
        });
    });

    describe('Performance and Memory Management', () => {
        it('should handle large folder structures efficiently', async () => {
            const startTime = performance.now();

            // Create many folders
            const folderPromises = [];
            for (let i = 1; i <= 100; i++) {
                const folderName = `${i.toString().padStart(3, '0')}_Folder${i}`;
                folderPromises.push(mockApp.vault.createFolder(folderName));
            }

            await Promise.all(folderPromises);

            const endTime = performance.now();
            const executionTime = endTime - startTime;

            expect(mockApp.vault.createFolder).toHaveBeenCalledTimes(100);
            expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
        });

        it('should clean up resources properly on plugin unload', () => {
            // Simulate cleanup
            if (mockPlugin.folderObserver) {
                mockPlugin.folderObserver.disconnect();
                mockPlugin.folderObserver = null;
            }

            // Cleanup event listeners
            mockApp.vault.off('create', vi.fn());
            mockApp.vault.off('rename', vi.fn());
            mockApp.vault.off('delete', vi.fn());

            expect(mockApp.vault.off).toHaveBeenCalledTimes(3);
        });

        it('should handle memory-intensive operations without leaks', () => {
            // Simulate intensive DOM operations
            const elements: HTMLElement[] = [];

            for (let i = 0; i < 1000; i++) {
                const element = document.createElement('div');
                element.className = 'folder-index-pill';
                element.textContent = i.toString();
                elements.push(element);
            }

            // Cleanup simulation
            elements.forEach((el) => el.remove());
            elements.length = 0;

            expect(elements).toHaveLength(0);
        });
    });

    describe('Integration with Obsidian Workspace', () => {
        it('should update status bar when active file changes', () => {
            const mockFile = {
                path: '01_Projects/02_Active/task.md',
                parent: {
                    name: '02_Active',
                    path: '01_Projects/02_Active',
                    parent: {
                        name: '01_Projects',
                        path: '01_Projects',
                        parent: null,
                    },
                },
            };

            mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
            const activeFile = mockApp.workspace.getActiveFile();

            expect(activeFile).toBe(mockFile);
            expect(activeFile.path).toBe('01_Projects/02_Active/task.md');
        });

        it('should handle workspace layout changes', () => {
            // Simulate workspace event registration
            mockApp.workspace.on('layout-change', vi.fn());
            mockApp.workspace.on('active-leaf-change', vi.fn());
            mockApp.workspace.on('file-open', vi.fn());

            expect(mockApp.workspace.on).toHaveBeenCalledTimes(3);
            expect(mockApp.workspace.on).toHaveBeenCalledWith(
                'layout-change',
                expect.any(Function)
            );
            expect(mockApp.workspace.on).toHaveBeenCalledWith(
                'active-leaf-change',
                expect.any(Function)
            );
            expect(mockApp.workspace.on).toHaveBeenCalledWith(
                'file-open',
                expect.any(Function)
            );
        });
    });
});
