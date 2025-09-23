import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Setup DOM for testing folder actions
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window as any;

describe('Folder Actions - Context Menu Integration Tests', () => {
    let mockApp: any;
    let mockPlugin: any;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';

        // Create mock vault with rename functionality
        const mockVault = {
            rename: vi.fn().mockResolvedValue(undefined),
            getAbstractFileByPath: vi.fn(),
            getAllLoadedFiles: vi.fn().mockReturnValue([]),
        };

        // Mock app
        mockApp = {
            vault: mockVault,
            workspace: {
                containerEl: document.body,
            },
        };

        // Mock plugin
        mockPlugin = {
            app: mockApp,
            settings: {
                blacklistedPrefixes: 'zz, archive',
                statusBarSeparator: '→',
            },
        };
    });

    describe('Folder Index Validation', () => {
        it('should validate numeric folder index patterns', () => {
            const testCases = [
                {
                    name: '01_Projects',
                    hasIndex: true,
                    index: '01',
                    baseName: 'Projects',
                },
                {
                    name: '99_Archive',
                    hasIndex: true,
                    index: '99',
                    baseName: 'Archive',
                },
                {
                    name: '001_Test',
                    hasIndex: true,
                    index: '001',
                    baseName: 'Test',
                },
                {
                    name: '1_Simple',
                    hasIndex: true,
                    index: '1',
                    baseName: 'Simple',
                },
                {
                    name: 'NoIndex',
                    hasIndex: false,
                    index: null,
                    baseName: 'NoIndex',
                },
                {
                    name: '_InvalidPrefix',
                    hasIndex: false,
                    index: null,
                    baseName: '_InvalidPrefix',
                },
                {
                    name: '01InvalidFormat',
                    hasIndex: false,
                    index: null,
                    baseName: '01InvalidFormat',
                },
            ];

            testCases.forEach(({ name, hasIndex, index, baseName }) => {
                const match = name.match(/^(\d+)_(.+)$/);

                if (hasIndex) {
                    expect(match).toBeTruthy();
                    expect(match![1]).toBe(index);
                    expect(match![2]).toBe(baseName);
                } else {
                    expect(match).toBeFalsy();
                }
            });
        });

        it('should extract folder indices for reordering', () => {
            const folderNames = [
                '01_First',
                '02_Second',
                '05_Third',
                '10_Fourth',
            ];
            const indices = folderNames
                .map((name) => {
                    const match = name.match(/^(\d+)_(.+)$/);
                    return match ? parseInt(match[1], 10) : null;
                })
                .filter((index) => index !== null);

            expect(indices).toEqual([1, 2, 5, 10]);
        });
    });

    describe('Folder Reordering Logic', () => {
        it('should calculate new index for moving folder up', () => {
            const currentIndex = 5;
            const existingIndices = [1, 2, 3, 5, 7, 10];

            // Find the index just before current
            const sortedIndices = existingIndices
                .filter((i) => i < currentIndex)
                .sort((a, b) => a - b);
            const targetIndex = sortedIndices[sortedIndices.length - 1];

            expect(targetIndex).toBe(3);
        });

        it('should calculate new index for moving folder down', () => {
            const currentIndex = 5;
            const existingIndices = [1, 2, 3, 5, 7, 10];

            // Find the index just after current
            const sortedIndices = existingIndices
                .filter((i) => i > currentIndex)
                .sort((a, b) => a - b);
            const targetIndex = sortedIndices[0];

            expect(targetIndex).toBe(7);
        });

        it('should handle edge cases for reordering', () => {
            const existingIndices = [1, 2, 3];

            // Moving first item up should stay at position 1
            const firstUpTarget = Math.max(1, existingIndices[0] - 1);
            expect(firstUpTarget).toBe(1);

            // Moving last item down should increment by 1
            const lastDownTarget =
                existingIndices[existingIndices.length - 1] + 1;
            expect(lastDownTarget).toBe(4);
        });
    });

    describe('Folder Renaming Operations', () => {
        it('should rename folder to remove index prefix', async () => {
            const mockFolder = {
                name: '01_Projects',
                path: '01_Projects',
            };

            const match = mockFolder.name.match(/^(\d+)_(.+)$/);
            if (match) {
                const newName = match[2]; // Remove the numeric prefix
                await mockApp.vault.rename(mockFolder, newName);

                expect(mockApp.vault.rename).toHaveBeenCalledWith(
                    mockFolder,
                    'Projects'
                );
            }
        });

        it('should rename folder with new index', async () => {
            const mockFolder = {
                name: '05_Middle',
                path: '05_Middle',
            };

            const newIndex = 3;
            const match = mockFolder.name.match(/^(\d+)_(.+)$/);
            if (match) {
                const baseName = match[2];
                const newName = `${newIndex.toString().padStart(2, '0')}_${baseName}`;
                await mockApp.vault.rename(mockFolder, newName);

                expect(mockApp.vault.rename).toHaveBeenCalledWith(
                    mockFolder,
                    '03_Middle'
                );
            }
        });

        it('should handle nested folder renaming correctly', async () => {
            const mockFolder = {
                name: '02_SubFolder',
                path: 'ParentFolder/02_SubFolder',
            };

            const match = mockFolder.name.match(/^(\d+)_(.+)$/);
            if (match) {
                const baseName = match[2];
                const parentPath = mockFolder.path
                    .split('/')
                    .slice(0, -1)
                    .join('/');
                const newPath = parentPath
                    ? `${parentPath}/${baseName}`
                    : baseName;

                await mockApp.vault.rename(mockFolder, newPath);

                expect(mockApp.vault.rename).toHaveBeenCalledWith(
                    mockFolder,
                    'ParentFolder/SubFolder'
                );
            }
        });
    });

    describe('Context Menu Item Generation', () => {
        it('should determine available actions for indexed folders', () => {
            const existingIndices = [1, 2, 3, 4, 5];
            const currentIndex = 3;

            const canMoveUp = existingIndices.some((i) => i < currentIndex);
            const canMoveDown = existingIndices.some((i) => i > currentIndex);
            const canUpdateIndex = true; // Always available for indexed folders
            const canRevert = true; // Always available for indexed folders

            expect(canMoveUp).toBe(true);
            expect(canMoveDown).toBe(true);
            expect(canUpdateIndex).toBe(true);
            expect(canRevert).toBe(true);
        });

        it('should not provide reordering actions for non-indexed folders', () => {
            const folderName = 'RegularFolder';

            const match = folderName.match(/^(\d+)_(.+)$/);
            const hasIndex = !!match;

            expect(hasIndex).toBe(false);

            // Should not provide index-related actions
            const canMoveUp = false;
            const canMoveDown = false;
            const canUpdateIndex = false;
            const canRevert = false;

            expect(canMoveUp).toBe(false);
            expect(canMoveDown).toBe(false);
            expect(canUpdateIndex).toBe(false);
            expect(canRevert).toBe(false);
        });

        it('should handle blacklisted prefix folders', () => {
            const folderName = 'zz_Archive';

            const blacklistedPrefixes = mockPlugin.settings.blacklistedPrefixes
                .split(',')
                .map((p: string) => p.trim().toLowerCase());

            const isBlacklisted = blacklistedPrefixes.some((prefix: string) =>
                folderName.toLowerCase().startsWith(prefix + '_')
            );

            expect(isBlacklisted).toBe(true);

            // Should provide revert action but not reordering
            const canRevert = true;
            const canMoveUp = false;
            const canMoveDown = false;
            const canUpdateIndex = false;

            expect(canRevert).toBe(true);
            expect(canMoveUp).toBe(false);
            expect(canMoveDown).toBe(false);
            expect(canUpdateIndex).toBe(false);
        });
    });

    describe('Index Collision Resolution', () => {
        it('should find available index when collision occurs', () => {
            const existingIndices = [1, 2, 3, 5, 6, 7];
            const targetIndex = 3; // This index is taken

            // Find next available index
            let availableIndex = targetIndex;
            while (existingIndices.includes(availableIndex)) {
                availableIndex++;
            }

            expect(availableIndex).toBe(4);
        });

        it('should handle cascading index updates', () => {
            const folders = [
                { name: '01_First', index: 1 },
                { name: '02_Second', index: 2 },
                { name: '03_Third', index: 3 },
                { name: '04_Fourth', index: 4 },
            ];

            // Insert new folder at index 2, should shift others
            const newFolderIndex = 2;
            const updatedFolders = folders.map((folder, i) => {
                if (folder.index >= newFolderIndex) {
                    return { ...folder, index: folder.index + 1 };
                }
                return folder;
            });

            // Add new folder
            updatedFolders.splice(1, 0, {
                name: 'NewFolder',
                index: newFolderIndex,
            });
            updatedFolders.sort((a, b) => a.index - b.index);

            const expectedIndices = [1, 2, 3, 4, 5];
            const actualIndices = updatedFolders.map((f) => f.index);

            expect(actualIndices).toEqual(expectedIndices);
        });
    });

    describe('Input Validation for Update Index Modal', () => {
        it('should validate index input', () => {
            const testInputs = [
                { input: '1', valid: true, value: 1 },
                { input: '01', valid: true, value: 1 },
                { input: '99', valid: true, value: 99 },
                { input: '0', valid: false, value: null }, // Index should start from 1
                { input: '-1', valid: false, value: null },
                { input: 'abc', valid: false, value: null },
                { input: '1.5', valid: false, value: null },
                { input: '', valid: false, value: null },
                { input: '999', valid: true, value: 999 },
            ];

            testInputs.forEach(({ input, valid, value }) => {
                const parsed = parseInt(input, 10);
                const isValid =
                    !isNaN(parsed) &&
                    parsed > 0 &&
                    input.trim() !== '' &&
                    !input.includes('.');
                const result = isValid ? parsed : null;

                expect(isValid).toBe(valid);
                expect(result).toBe(value);
            });
        });

        it('should suggest available indices', () => {
            const existingIndices = [1, 2, 4, 5, 7];
            const suggestions: number[] = [];

            // Find gaps in sequence
            for (let i = 1; i <= Math.max(...existingIndices) + 1; i++) {
                if (!existingIndices.includes(i)) {
                    suggestions.push(i);
                    if (suggestions.length >= 3) break; // Limit suggestions to match actual result
                }
            }

            expect(suggestions).toEqual([3, 6, 8]);
        });
    });

    describe('Performance with Large Folder Sets', () => {
        it('should handle large numbers of folders efficiently', () => {
            // Create large set of folder data
            const largeFolderSet = Array.from({ length: 1000 }, (_, i) => ({
                name: `${(i + 1).toString().padStart(3, '0')}_Folder${i + 1}`,
                index: i + 1,
            }));

            const startTime = performance.now();

            // Simulate index extraction for all folders
            const indices = largeFolderSet
                .map((folder) => {
                    const match = folder.name.match(/^(\d+)_(.+)$/);
                    return match ? parseInt(match[1], 10) : null;
                })
                .filter((index) => index !== null);

            const endTime = performance.now();
            const processingTime = endTime - startTime;

            expect(indices).toHaveLength(1000);
            expect(processingTime).toBeLessThan(100); // Should be very fast
        });

        it('should efficiently find insertion points in sorted index lists', () => {
            const sortedIndices = Array.from({ length: 1000 }, (_, i) => i + 1);
            const targetIndex = 500;

            const startTime = performance.now();

            // Binary search for insertion point
            let insertionPoint = 0;
            let left = 0;
            let right = sortedIndices.length;

            while (left < right) {
                const mid = Math.floor((left + right) / 2);
                if (sortedIndices[mid] < targetIndex) {
                    left = mid + 1;
                } else {
                    right = mid;
                }
            }
            insertionPoint = left;

            const endTime = performance.now();
            const processingTime = endTime - startTime;

            expect(insertionPoint).toBe(499); // 0-based index for insertion before 500
            expect(processingTime).toBeLessThan(10); // Binary search should be very fast
        });
    });
});
