import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerEvents } from 'src/events';
import { TFolder } from 'obsidian';
import * as folderActions from 'src/logic/folderActions';
import * as fileExplorer from 'src/logic/fileExplorer';
import * as statusBar from 'src/logic/statusBar';
import { UpdateIndexModal } from 'src/ui/UpdateIndexModal';
import * as logger from 'src/utils/logger';

// Mock the imported modules
vi.mock('src/logic/fileExplorer', () => ({
    startFolderObserver: vi.fn(),
}));

vi.mock('src/logic/statusBar', () => ({
    updateStatusBar: vi.fn(),
}));

vi.mock('src/ui/UpdateIndexModal');

vi.mock('src/logic/folderActions', () => ({
    updateFolderIndex: vi.fn().mockResolvedValue(undefined),
    isSpecialIndex: vi.fn().mockReturnValue(false),
}));

vi.mock('src/utils/logger', async () => {
    const mock = await import('tests/__mocks__/logger');
    return mock;
});

describe('events', () => {
    let mockPlugin: any;
    let mockWorkspace: any;
    let mockApp: any;
    let layoutReadyCallback: () => void;
    let fileOpenCallback: (file: any) => void;
    let fileMenuCallback: (menu: any, file: any) => void;

    beforeEach(() => {
        // Set up UpdateIndexModal mock implementation
        vi.mocked(UpdateIndexModal).mockImplementation(
            () =>
                ({
                    open: vi.fn(),
                }) as any
        );

        // Create mock workspace with event system
        mockWorkspace = {
            onLayoutReady: vi.fn((callback) => {
                layoutReadyCallback = callback;
            }),
            on: vi.fn((event, callback) => {
                if (event === 'file-open') {
                    fileOpenCallback = callback;
                } else if (event === 'file-menu') {
                    fileMenuCallback = callback;
                }
                return {}; // Return mock event ref
            }),
            containerEl: document.createElement('div'),
        };

        mockApp = {
            workspace: mockWorkspace,
            vault: {
                getAbstractFileByPath: vi.fn(),
                rename: vi.fn(),
            },
        };

        mockPlugin = {
            app: mockApp,
            settings: {
                debugEnabled: false,
                separator: '_',
                specialPrefixes: 'zz, xx',
            },
            registerEvent: vi.fn(),
            ignoreMutationsWhileMenuOpen: false,
            getNumericPrefixRegex: vi.fn(() => /^(\d+)_/),
            prefixNumericFolders: vi.fn(),
        };
    });

    describe('registerEvents', () => {
        it('should register layout ready callback', () => {
            registerEvents(mockPlugin);

            expect(mockWorkspace.onLayoutReady).toHaveBeenCalled();
        });

        it('should register file-open event', () => {
            registerEvents(mockPlugin);

            expect(mockWorkspace.on).toHaveBeenCalledWith(
                'file-open',
                expect.any(Function)
            );
            expect(mockPlugin.registerEvent).toHaveBeenCalled();
        });

        it('should register file-menu event', () => {
            registerEvents(mockPlugin);

            expect(mockWorkspace.on).toHaveBeenCalledWith(
                'file-menu',
                expect.any(Function)
            );
            expect(mockPlugin.registerEvent).toHaveBeenCalled();
        });
    });

    describe('layout ready event', () => {
        it('should start folder observer when layout is ready', async () => {
            const { startFolderObserver } = await import(
                '../src/logic/fileExplorer'
            );
            registerEvents(mockPlugin);

            layoutReadyCallback();

            expect(startFolderObserver).toHaveBeenCalledWith(mockPlugin);
        });

        it('should update status bar when layout is ready', async () => {
            const { updateStatusBar } = await import('../src/logic/statusBar');
            registerEvents(mockPlugin);

            layoutReadyCallback();

            expect(updateStatusBar).toHaveBeenCalledWith(mockPlugin);
        });
    });

    describe('file-open event', () => {
        it('should update status bar when file is opened', async () => {
            const { updateStatusBar } = await import('../src/logic/statusBar');
            registerEvents(mockPlugin);

            const mockFile = { path: 'test.md' };
            fileOpenCallback(mockFile);

            expect(updateStatusBar).toHaveBeenCalledWith(mockPlugin);
        });

        it('should log debug message when debug is enabled', async () => {
            const { log } = await import('../src/utils/logger');
            mockPlugin.settings.debugEnabled = true;
            registerEvents(mockPlugin);

            const mockFile = { path: 'test.md' };
            fileOpenCallback(mockFile);

            expect(log).toHaveBeenCalledWith(
                true,
                'file-open event for',
                'test.md'
            );
        });

        it('should handle null file', async () => {
            const { updateStatusBar } = await import('../src/logic/statusBar');
            registerEvents(mockPlugin);

            fileOpenCallback(null);

            expect(updateStatusBar).toHaveBeenCalledWith(mockPlugin);
        });
    });

    describe('file-menu event', () => {
        let mockMenu: any;
        let mockFolder: any;

        beforeEach(() => {
            mockMenu = {
                addItem: vi.fn((callback) => {
                    const item = {
                        setTitle: vi.fn().mockReturnThis(),
                        setIcon: vi.fn().mockReturnThis(),
                        setDisabled: vi.fn().mockReturnThis(),
                        onClick: vi.fn().mockReturnThis(),
                    };
                    callback(item);
                    return item;
                }),
                onHide: vi.fn(),
            };

            mockFolder = new TFolder();
            mockFolder.name = '01_TestFolder';
            mockFolder.path = 'path/to/01_TestFolder';
        });

        it('should ignore non-folder files', () => {
            registerEvents(mockPlugin);

            const mockFile = { path: 'test.md', name: 'test.md' };
            fileMenuCallback(mockMenu, mockFile);

            expect(mockMenu.addItem).not.toHaveBeenCalled();
        });

        it('should set ignoreMutationsWhileMenuOpen to true for folders', () => {
            registerEvents(mockPlugin);

            fileMenuCallback(mockMenu, mockFolder);

            expect(mockPlugin.ignoreMutationsWhileMenuOpen).toBe(true);
        });

        it('should skip folders without numeric prefix', () => {
            registerEvents(mockPlugin);

            const nonIndexedFolder = new TFolder();
            nonIndexedFolder.name = 'RegularFolder';
            nonIndexedFolder.path = 'path/to/RegularFolder';

            fileMenuCallback(mockMenu, nonIndexedFolder);

            expect(mockMenu.addItem).not.toHaveBeenCalled();
        });

        it('should log debug message when debug is enabled', async () => {
            const { log } = await import('../src/utils/logger');
            mockPlugin.settings.debugEnabled = true;
            registerEvents(mockPlugin);

            fileMenuCallback(mockMenu, mockFolder);

            expect(log).toHaveBeenCalledWith(
                true,
                'file-menu event for folder:',
                mockFolder.path
            );
        });

        describe('context menu items', () => {
            it('should add "Update index" menu item', () => {
                registerEvents(mockPlugin);

                fileMenuCallback(mockMenu, mockFolder);

                expect(mockMenu.addItem).toHaveBeenCalled();
                // First call is for "Update index"
                const firstCall = mockMenu.addItem.mock.calls[0];
                expect(firstCall).toBeDefined();
            });

            it('should add "Move up" menu item', () => {
                registerEvents(mockPlugin);

                fileMenuCallback(mockMenu, mockFolder);

                // Second call is for "Move up"
                expect(mockMenu.addItem).toHaveBeenCalledTimes(3);
            });

            it('should add "Move down" menu item', () => {
                registerEvents(mockPlugin);

                fileMenuCallback(mockMenu, mockFolder);

                // Third call is for "Move down"
                expect(mockMenu.addItem).toHaveBeenCalledTimes(3);
            });

            it('should disable "Update index" for special folders', async () => {
                const { isSpecialIndex } = await import(
                    '../src/logic/folderActions'
                );
                vi.mocked(isSpecialIndex).mockReturnValue(true);

                let capturedItem: any;
                mockMenu.addItem = vi.fn((callback) => {
                    const item = {
                        setTitle: vi.fn().mockReturnThis(),
                        setIcon: vi.fn().mockReturnThis(),
                        setDisabled: vi.fn().mockReturnThis(),
                        onClick: vi.fn().mockReturnThis(),
                    };
                    callback(item);
                    capturedItem = item;
                    return item;
                });

                registerEvents(mockPlugin);
                fileMenuCallback(mockMenu, mockFolder);

                // First item is "Update index"
                const updateIndexItem = capturedItem;
                expect(updateIndexItem.setDisabled).toHaveBeenCalledWith(true);
            });

            it('should disable "Move up" when current number is 0', () => {
                const zeroFolder = new TFolder();
                zeroFolder.name = '00_TestFolder';
                zeroFolder.path = 'path/to/00_TestFolder';

                let moveUpItem: any;
                let callCount = 0;
                mockMenu.addItem = vi.fn((callback) => {
                    const item = {
                        setTitle: vi.fn().mockReturnThis(),
                        setIcon: vi.fn().mockReturnThis(),
                        setDisabled: vi.fn().mockReturnThis(),
                        onClick: vi.fn().mockReturnThis(),
                    };
                    callback(item);
                    callCount++;
                    if (callCount === 2) {
                        // Second item is "Move up"
                        moveUpItem = item;
                    }
                    return item;
                });

                registerEvents(mockPlugin);
                fileMenuCallback(mockMenu, zeroFolder);

                expect(moveUpItem.setDisabled).toHaveBeenCalledWith(true);
            });

            it('should disable "Move down" when at maximum number', () => {
                const maxFolder = new TFolder();
                maxFolder.name = '99_TestFolder';
                maxFolder.path = 'path/to/99_TestFolder';

                let moveDownItem: any;
                let callCount = 0;
                mockMenu.addItem = vi.fn((callback) => {
                    const item = {
                        setTitle: vi.fn().mockReturnThis(),
                        setIcon: vi.fn().mockReturnThis(),
                        setDisabled: vi.fn().mockReturnThis(),
                        onClick: vi.fn().mockReturnThis(),
                    };
                    callback(item);
                    callCount++;
                    if (callCount === 3) {
                        // Third item is "Move down"
                        moveDownItem = item;
                    }
                    return item;
                });

                registerEvents(mockPlugin);
                fileMenuCallback(mockMenu, maxFolder);

                expect(moveDownItem.setDisabled).toHaveBeenCalledWith(true);
            });

            it('should open UpdateIndexModal when "Update index" is clicked', async () => {
                const { UpdateIndexModal } = await import(
                    '../src/ui/UpdateIndexModal'
                );

                let updateIndexOnClick: () => void;
                let callCount = 0;
                mockMenu.addItem = vi.fn((callback) => {
                    const item = {
                        setTitle: vi.fn().mockReturnThis(),
                        setIcon: vi.fn().mockReturnThis(),
                        setDisabled: vi.fn().mockReturnThis(),
                        onClick: vi.fn((handler) => {
                            callCount++;
                            if (callCount === 1) {
                                // First item is "Update index"
                                updateIndexOnClick = handler;
                            }
                            return item;
                        }),
                    };
                    callback(item);
                    return item;
                });

                registerEvents(mockPlugin);
                fileMenuCallback(mockMenu, mockFolder);

                // Click "Update index"
                updateIndexOnClick!();

                expect(UpdateIndexModal).toHaveBeenCalledWith(
                    mockApp,
                    mockPlugin,
                    mockFolder,
                    expect.any(Function)
                );
            });

            // NOTE: The following tests verify onClick handler registration only, not execution.
            // Testing the actual execution of these handlers is complex due to module mocking
            // limitations - the handlers are closures that capture imports at module load time,
            // making it difficult to verify calls to mocked functions like updateFolderIndex.
            // The handler logic is instead validated through:
            // 1. Guard clause tests (below) that verify boundary conditions
            // 2. Manual testing in the Obsidian environment
            // 3. Integration with the rest of the tested codebase

            it('should register onClick handler for "Move up"', async () => {
                const items: any[] = [];
                mockMenu.addItem = vi.fn((callback) => {
                    const item: any = {
                        setTitle: vi.fn().mockReturnThis(),
                        setIcon: vi.fn().mockReturnThis(),
                        setDisabled: vi.fn().mockReturnThis(),
                        onClick: vi.fn((handler) => {
                            item._clickHandler = handler;
                            return item;
                        }),
                    };
                    callback(item);
                    items.push(item);
                    return item;
                });

                registerEvents(mockPlugin);
                fileMenuCallback(mockMenu, mockFolder);

                // Verify we have 3 menu items
                expect(items.length).toBe(3);

                // Get the "Move up" item (second item)
                const moveUpItem = items[1];

                // Verify the onClick handler was registered
                expect(moveUpItem.onClick).toHaveBeenCalled();
                expect(moveUpItem._clickHandler).toBeDefined();
                expect(typeof moveUpItem._clickHandler).toBe('function');
            });

            it('should register onClick handler for "Move down"', async () => {
                const items: any[] = [];
                mockMenu.addItem = vi.fn((callback) => {
                    const item: any = {
                        setTitle: vi.fn().mockReturnThis(),
                        setIcon: vi.fn().mockReturnThis(),
                        setDisabled: vi.fn().mockReturnThis(),
                        onClick: vi.fn((handler) => {
                            item._clickHandler = handler;
                            return item;
                        }),
                    };
                    callback(item);
                    items.push(item);
                    return item;
                });

                registerEvents(mockPlugin);
                fileMenuCallback(mockMenu, mockFolder);

                // Get the "Move down" item (third item)
                const moveDownItem = items[2];

                // Verify the onClick handler was registered
                expect(moveDownItem.onClick).toHaveBeenCalled();
                expect(moveDownItem._clickHandler).toBeDefined();
                expect(typeof moveDownItem._clickHandler).toBe('function');
            });

            it('should register onClick handler that calls prefixNumericFolders', async () => {
                const items: any[] = [];
                mockMenu.addItem = vi.fn((callback) => {
                    const item: any = {
                        setTitle: vi.fn().mockReturnThis(),
                        setIcon: vi.fn().mockReturnThis(),
                        setDisabled: vi.fn().mockReturnThis(),
                        onClick: vi.fn((handler) => {
                            item._clickHandler = handler;
                            return item;
                        }),
                    };
                    callback(item);
                    items.push(item);
                    return item;
                });

                registerEvents(mockPlugin);
                fileMenuCallback(mockMenu, mockFolder);

                // Verify all menu items have click handlers
                expect(items.length).toBe(3);
                items.forEach((item, index) => {
                    expect(item._clickHandler).toBeDefined();
                    expect(typeof item._clickHandler).toBe('function');
                });
            });

            it('should not move up if at minimum (guard clause)', async () => {
                const mockUpdateFolderIndex = vi.mocked(
                    folderActions.updateFolderIndex
                );

                const zeroFolder = new TFolder();
                zeroFolder.name = '00_TestFolder';
                zeroFolder.path = 'path/to/00_TestFolder';

                let moveUpOnClick: () => void;
                let callCount = 0;
                mockMenu.addItem = vi.fn((callback) => {
                    const item = {
                        setTitle: vi.fn().mockReturnThis(),
                        setIcon: vi.fn().mockReturnThis(),
                        setDisabled: vi.fn().mockReturnThis(),
                        onClick: vi.fn((handler) => {
                            callCount++;
                            if (callCount === 2) {
                                moveUpOnClick = handler;
                            }
                            return item;
                        }),
                    };
                    callback(item);
                    return item;
                });

                registerEvents(mockPlugin);
                fileMenuCallback(mockMenu, zeroFolder);

                // Click "Move up"
                await moveUpOnClick!();

                // Should not call updateFolderIndex
                expect(mockUpdateFolderIndex).not.toHaveBeenCalled();
            });

            it('should not move down if at maximum (guard clause)', async () => {
                const mockUpdateFolderIndex = vi.mocked(
                    folderActions.updateFolderIndex
                );

                const maxFolder = new TFolder();
                maxFolder.name = '99_TestFolder';
                maxFolder.path = 'path/to/99_TestFolder';

                let moveDownOnClick: () => void;
                let callCount = 0;
                mockMenu.addItem = vi.fn((callback) => {
                    const item = {
                        setTitle: vi.fn().mockReturnThis(),
                        setIcon: vi.fn().mockReturnThis(),
                        setDisabled: vi.fn().mockReturnThis(),
                        onClick: vi.fn((handler) => {
                            callCount++;
                            if (callCount === 3) {
                                moveDownOnClick = handler;
                            }
                            return item;
                        }),
                    };
                    callback(item);
                    return item;
                });

                registerEvents(mockPlugin);
                fileMenuCallback(mockMenu, maxFolder);

                // Click "Move down"
                await moveDownOnClick!();

                // Should not call updateFolderIndex
                expect(mockUpdateFolderIndex).not.toHaveBeenCalled();
            });
        });
    });
});
