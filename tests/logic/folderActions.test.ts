import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    isSpecialIndex,
    updateFolderIndex,
} from '../../src/logic/folderActions';
import { TFolder, Notice } from 'obsidian';
import type IndexableFoldersPlugin from '../../src/main';

// Mock the logger with shared mock
vi.mock('../../src/utils/logger', async () => {
    const mock = await import('../__mocks__/logger');
    return mock;
});

// Mock Notice
vi.mock('obsidian', async () => {
    const actual = await vi.importActual<typeof import('obsidian')>('obsidian');
    return {
        ...actual,
        Notice: vi.fn().mockImplementation((message: string) => {
            // Store notice for testing
            return { message };
        }),
    };
});

describe('folderActions', () => {
    describe('isSpecialIndex', () => {
        it('should return false for single digit indices', () => {
            expect(isSpecialIndex('0')).toBe(false);
            expect(isSpecialIndex('1')).toBe(false);
            expect(isSpecialIndex('5')).toBe(false);
            expect(isSpecialIndex('9')).toBe(false);
        });

        it('should return true for all zeros pattern (multi-digit)', () => {
            expect(isSpecialIndex('00')).toBe(true);
            expect(isSpecialIndex('000')).toBe(true);
            expect(isSpecialIndex('0000')).toBe(true);
        });

        it('should return true for all nines pattern (multi-digit)', () => {
            expect(isSpecialIndex('99')).toBe(true);
            expect(isSpecialIndex('999')).toBe(true);
            expect(isSpecialIndex('9999')).toBe(true);
        });

        it('should return false for mixed digit indices', () => {
            expect(isSpecialIndex('01')).toBe(false);
            expect(isSpecialIndex('10')).toBe(false);
            expect(isSpecialIndex('12')).toBe(false);
            expect(isSpecialIndex('89')).toBe(false);
            expect(isSpecialIndex('90')).toBe(false);
        });

        it('should return false for empty string', () => {
            expect(isSpecialIndex('')).toBe(false);
        });
    });

    describe('updateFolderIndex', () => {
        let mockPlugin: IndexableFoldersPlugin;
        let mockFolder: TFolder;
        let mockParentFolder: TFolder;
        let mockFileManager: any;

        beforeEach(() => {
            // Create mock parent folder
            mockParentFolder = new TFolder();
            mockParentFolder.name = 'parent';
            mockParentFolder.path = 'parent';
            mockParentFolder.children = [];

            // Create mock folder
            mockFolder = new TFolder();
            mockFolder.name = '01_TestFolder';
            mockFolder.path = 'parent/01_TestFolder';
            mockFolder.parent = mockParentFolder;

            // Create mock file manager
            mockFileManager = {
                renameFile: vi.fn().mockResolvedValue(undefined),
            };

            // Create mock plugin
            mockPlugin = {
                app: {
                    fileManager: mockFileManager,
                    vault: {
                        getAbstractFileByPath: vi.fn(),
                    },
                },
                settings: {
                    debugEnabled: false,
                    separator: '_',
                },
                getNumericPrefixRegex: vi.fn().mockReturnValue(/^(\d+)_/),
                getPrefixRegex: vi.fn().mockReturnValue(/^(\d+)_/),
            } as unknown as IndexableFoldersPlugin;
        });

        it('should return early if folder has no parent', async () => {
            mockFolder.parent = null;

            await updateFolderIndex(mockPlugin, mockFolder, 2);

            expect(mockFileManager.renameFile).not.toHaveBeenCalled();
        });

        it('should return early if folder has no numeric prefix', async () => {
            mockFolder.name = 'NoPrefix';

            await updateFolderIndex(mockPlugin, mockFolder, 2);

            expect(mockFileManager.renameFile).not.toHaveBeenCalled();
        });

        it('should return early if new index equals old index', async () => {
            await updateFolderIndex(mockPlugin, mockFolder, 1);

            expect(mockFileManager.renameFile).not.toHaveBeenCalled();
        });

        it('should prevent moving folder with special index (all zeros)', async () => {
            mockFolder.name = '00_SpecialFolder';
            mockFolder.path = 'parent/00_SpecialFolder';

            await updateFolderIndex(mockPlugin, mockFolder, 2);

            expect(mockFileManager.renameFile).not.toHaveBeenCalled();
            expect(Notice).toHaveBeenCalledWith(
                'Cannot move folder with special index: 00_SpecialFolder',
                3000
            );
        });

        it('should prevent moving folder with special index (all nines)', async () => {
            mockFolder.name = '99_SpecialFolder';
            mockFolder.path = 'parent/99_SpecialFolder';

            await updateFolderIndex(mockPlugin, mockFolder, 2);

            expect(mockFileManager.renameFile).not.toHaveBeenCalled();
            expect(Notice).toHaveBeenCalledWith(
                'Cannot move folder with special index: 99_SpecialFolder',
                3000
            );
        });

        it('should prevent moving to special index position (all zeros)', async () => {
            await updateFolderIndex(mockPlugin, mockFolder, 0);

            expect(mockFileManager.renameFile).not.toHaveBeenCalled();
            expect(Notice).toHaveBeenCalledWith(
                'Cannot move to special index position: 0',
                3000
            );
        });

        it('should perform simple move when target position is available', async () => {
            mockParentFolder.children = [mockFolder];

            await updateFolderIndex(mockPlugin, mockFolder, 5);

            expect(mockFileManager.renameFile).toHaveBeenCalledWith(
                mockFolder,
                'parent/05_TestFolder'
            );
            expect(Notice).toHaveBeenCalledWith(
                'Folder renamed: "01_TestFolder" → "05_TestFolder"',
                3000
            );
        });

        it('should preserve prefix length when renaming', async () => {
            mockFolder.name = '001_TestFolder';
            mockFolder.path = 'parent/001_TestFolder';
            mockParentFolder.children = [mockFolder];

            await updateFolderIndex(mockPlugin, mockFolder, 5);

            expect(mockFileManager.renameFile).toHaveBeenCalledWith(
                mockFolder,
                'parent/005_TestFolder'
            );
        });

        it('should perform smart swap when target is occupied and source is free', async () => {
            const folder2 = new TFolder();
            folder2.name = '02_AnotherFolder';
            folder2.path = 'parent/02_AnotherFolder';
            folder2.parent = mockParentFolder;

            mockParentFolder.children = [mockFolder, folder2];

            await updateFolderIndex(mockPlugin, mockFolder, 2);

            // Should rename to temp, then swap
            expect(mockFileManager.renameFile).toHaveBeenCalledTimes(3);
            expect(Notice).toHaveBeenCalledWith(
                expect.stringContaining('Folders swapped:'),
                3000
            );
        });

        it('should handle smart swap failure gracefully', async () => {
            const folder2 = new TFolder();
            folder2.name = '02_AnotherFolder';
            folder2.path = 'parent/02_AnotherFolder';
            folder2.parent = mockParentFolder;

            mockParentFolder.children = [mockFolder, folder2];

            // Make first rename fail
            mockFileManager.renameFile.mockRejectedValueOnce(
                new Error('Rename failed')
            );

            await updateFolderIndex(mockPlugin, mockFolder, 2);

            // Should attempt smart swap but fail, then do full reindex
            expect(mockFileManager.renameFile).toHaveBeenCalled();
        });

        it('should perform full reindex when smart swap is not possible', async () => {
            const folder2 = new TFolder();
            folder2.name = '02_AnotherFolder';
            folder2.path = 'parent/02_AnotherFolder';
            folder2.parent = mockParentFolder;

            const folder3 = new TFolder();
            folder3.name = '01_ThirdFolder'; // Occupies the source position
            folder3.path = 'parent/01_ThirdFolder';
            folder3.parent = mockParentFolder;

            // Need to create a new mockFolder since position 01 is taken
            mockFolder.name = '03_TestFolder';
            mockFolder.path = 'parent/03_TestFolder';

            mockParentFolder.children = [folder3, folder2, mockFolder];

            await updateFolderIndex(mockPlugin, mockFolder, 2);

            // Should perform full reindex since smart swap not possible
            expect(mockFileManager.renameFile).toHaveBeenCalled();
        });

        it('should skip special folders during full reindex', async () => {
            const specialFolder = new TFolder();
            specialFolder.name = '00_SpecialFolder';
            specialFolder.path = 'parent/00_SpecialFolder';
            specialFolder.parent = mockParentFolder;

            const folder2 = new TFolder();
            folder2.name = '02_RegularFolder';
            folder2.path = 'parent/02_RegularFolder';
            folder2.parent = mockParentFolder;

            mockParentFolder.children = [specialFolder, mockFolder, folder2];

            await updateFolderIndex(mockPlugin, mockFolder, 3);

            // Special folder should not be renamed
            const renameCalls = mockFileManager.renameFile.mock.calls;
            const specialFolderRenamed = renameCalls.some(
                (call: any) => call[0] === specialFolder
            );
            expect(specialFolderRenamed).toBe(false);
        });

        it('should handle folder without parent during smart swap gracefully', async () => {
            const folder2 = new TFolder();
            folder2.name = '02_AnotherFolder';
            folder2.path = 'parent/02_AnotherFolder';
            folder2.parent = mockParentFolder;

            mockParentFolder.children = [mockFolder, folder2];

            // Simulate parent being removed during operation
            mockFileManager.renameFile.mockImplementationOnce(async () => {
                folder2.parent = null;
            });

            await updateFolderIndex(mockPlugin, mockFolder, 2);

            // Should attempt smart swap
            expect(mockFileManager.renameFile).toHaveBeenCalled();
        });

        it('should reorder folders correctly during full reindex', async () => {
            const folder2 = new TFolder();
            folder2.name = '02_Folder2';
            folder2.path = 'parent/02_Folder2';
            folder2.parent = mockParentFolder;

            const folder3 = new TFolder();
            folder3.name = '03_Folder3';
            folder3.path = 'parent/03_Folder3';
            folder3.parent = mockParentFolder;

            const folder4 = new TFolder();
            folder4.name = '04_Folder4';
            folder4.path = 'parent/04_Folder4';
            folder4.parent = mockParentFolder;

            mockParentFolder.children = [mockFolder, folder2, folder3, folder4];

            // Move folder 1 to position 3
            await updateFolderIndex(mockPlugin, mockFolder, 3);

            // Should reindex: folder2->01, folder3->02, mockFolder->03, folder4->04
            expect(mockFileManager.renameFile).toHaveBeenCalled();
        });

        it('should prevent moving to special index with multi-digit zeros', async () => {
            mockFolder.name = '001_TestFolder';
            mockFolder.path = 'parent/001_TestFolder';

            await updateFolderIndex(mockPlugin, mockFolder, 0);

            expect(mockFileManager.renameFile).not.toHaveBeenCalled();
            expect(Notice).toHaveBeenCalledWith(
                'Cannot move to special index position: 0',
                3000
            );
        });

        it('should handle target conflict with special folder', async () => {
            const specialFolder = new TFolder();
            specialFolder.name = '00_SpecialFolder';
            specialFolder.path = 'parent/00_SpecialFolder';
            specialFolder.parent = mockParentFolder;

            mockParentFolder.children = [specialFolder, mockFolder];

            // Try to move to position occupied by special folder
            await updateFolderIndex(mockPlugin, mockFolder, 0);

            // Should show notice about special index
            expect(Notice).toHaveBeenCalledWith(
                'Cannot move to special index position: 0',
                3000
            );
        });

        it('should insert folder at the beginning during full reindex', async () => {
            const folder2 = new TFolder();
            folder2.name = '02_Folder2';
            folder2.path = 'parent/02_Folder2';
            folder2.parent = mockParentFolder;

            const folder3 = new TFolder();
            folder3.name = '03_Folder3';
            folder3.path = 'parent/03_Folder3';
            folder3.parent = mockParentFolder;

            mockFolder.name = '05_TestFolder';
            mockFolder.path = 'parent/05_TestFolder';

            mockParentFolder.children = [folder2, folder3, mockFolder];

            // Move to position 1
            await updateFolderIndex(mockPlugin, mockFolder, 1);

            expect(mockFileManager.renameFile).toHaveBeenCalled();
        });

        it('should insert folder at the end during full reindex', async () => {
            const folder2 = new TFolder();
            folder2.name = '02_Folder2';
            folder2.path = 'parent/02_Folder2';
            folder2.parent = mockParentFolder;

            const folder3 = new TFolder();
            folder3.name = '03_Folder3';
            folder3.path = 'parent/03_Folder3';
            folder3.parent = mockParentFolder;

            mockParentFolder.children = [mockFolder, folder2, folder3];

            // Move to position 10 (beyond end)
            await updateFolderIndex(mockPlugin, mockFolder, 10);

            expect(mockFileManager.renameFile).toHaveBeenCalled();
        });

        it('should actually rename folders during full reindex', async () => {
            const folder2 = new TFolder();
            folder2.name = '02_Folder2';
            folder2.path = 'parent/02_Folder2';
            folder2.parent = mockParentFolder;

            const folder3 = new TFolder();
            folder3.name = '03_Folder3';
            folder3.path = 'parent/03_Folder3';
            folder3.parent = mockParentFolder;

            const folder4 = new TFolder();
            folder4.name = '05_Folder4';
            folder4.path = 'parent/05_Folder4';
            folder4.parent = mockParentFolder;

            mockParentFolder.children = [mockFolder, folder2, folder3, folder4];

            // Move folder 1 to position 4, which requires reindexing
            await updateFolderIndex(mockPlugin, mockFolder, 4);

            // Check that Notice was called for renaming
            expect(Notice).toHaveBeenCalledWith(
                expect.stringContaining('Folder renamed:'),
                3000
            );
        });
    });
});
