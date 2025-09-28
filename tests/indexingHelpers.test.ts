import { describe, expect, it } from 'vitest';
import {
    calculateSwapOperations,
    detectIndexConflict,
    extractNameParts,
    FolderInfo,
    formatIndex,
    generateFolderName,
    generateReindexPlan,
    isSpecialIndex,
    parseFolderIndex,
} from '../src/helpers/indexingHelpers';

describe('indexingHelpers', () => {
    const numericRegex = /^(\d+)\. /;

    describe('isSpecialIndex', () => {
        it('should identify special multi-digit indices', () => {
            expect(isSpecialIndex('00')).toBe(true);
            expect(isSpecialIndex('000')).toBe(true);
            expect(isSpecialIndex('99')).toBe(true);
            expect(isSpecialIndex('999')).toBe(true);
        });

        it('should not identify single digits as special', () => {
            expect(isSpecialIndex('0')).toBe(false);
            expect(isSpecialIndex('9')).toBe(false);
            expect(isSpecialIndex('1')).toBe(false);
            expect(isSpecialIndex('5')).toBe(false);
        });

        it('should not identify mixed digit patterns as special', () => {
            expect(isSpecialIndex('01')).toBe(false);
            expect(isSpecialIndex('90')).toBe(false);
            expect(isSpecialIndex('123')).toBe(false);
            expect(isSpecialIndex('909')).toBe(false);
        });

        it('should handle edge cases', () => {
            expect(isSpecialIndex('')).toBe(false);
            expect(isSpecialIndex('abc')).toBe(false);
        });
    });

    describe('parseFolderIndex', () => {
        it('should parse valid folder indices', () => {
            const result = parseFolderIndex('01. My Folder', numericRegex);
            expect(result).toEqual({
                name: '01. My Folder',
                index: 1,
                indexStr: '01',
                prefixLength: 2,
            });
        });

        it('should handle different index lengths', () => {
            const result1 = parseFolderIndex('1. Folder', numericRegex);
            expect(result1).toEqual({
                name: '1. Folder',
                index: 1,
                indexStr: '1',
                prefixLength: 1,
            });

            const result2 = parseFolderIndex('123. Long Index', numericRegex);
            expect(result2).toEqual({
                name: '123. Long Index',
                index: 123,
                indexStr: '123',
                prefixLength: 3,
            });
        });

        it('should return null for non-matching folders', () => {
            expect(
                parseFolderIndex('No Index Folder', numericRegex)
            ).toBeNull();
            expect(
                parseFolderIndex('TODO. Special Folder', numericRegex)
            ).toBeNull();
            expect(parseFolderIndex('', numericRegex)).toBeNull();
        });

        it('should handle zero-padded indices', () => {
            const result = parseFolderIndex('001. Zero Padded', numericRegex);
            expect(result).toEqual({
                name: '001. Zero Padded',
                index: 1,
                indexStr: '001',
                prefixLength: 3,
            });
        });
    });

    describe('formatIndex', () => {
        it('should format indices with proper padding', () => {
            expect(formatIndex(1, 2)).toBe('01');
            expect(formatIndex(5, 3)).toBe('005');
            expect(formatIndex(123, 4)).toBe('0123');
            expect(formatIndex(1000, 2)).toBe('1000'); // No truncation
        });

        it('should handle single digit padding', () => {
            expect(formatIndex(1, 1)).toBe('1');
            expect(formatIndex(9, 1)).toBe('9');
            expect(formatIndex(10, 1)).toBe('10'); // No truncation
        });

        it('should handle zero padding', () => {
            expect(formatIndex(1, 0)).toBe('1');
            expect(formatIndex(10, 0)).toBe('10');
        });
    });

    describe('extractNameParts', () => {
        it('should extract separator and name parts', () => {
            const result = extractNameParts('01. My Folder', '01');
            expect(result).toEqual({
                separator: '. ',
                namePart: 'My Folder',
            });
        });

        it('should handle different separators', () => {
            const result1 = extractNameParts('01-My Folder', '01');
            expect(result1).toEqual({
                separator: '-',
                namePart: 'My Folder',
            });

            const result2 = extractNameParts('01) My Folder', '01');
            expect(result2).toEqual({
                separator: ') ',
                namePart: 'My Folder',
            });
        });

        it('should handle complex separators', () => {
            const result = extractNameParts('001 -> My Complex Folder', '001');
            expect(result).toEqual({
                separator: ' -> ',
                namePart: 'My Complex Folder',
            });
        });

        it('should throw error for missing separator', () => {
            expect(() => extractNameParts('01MyFolder', '01')).toThrow(
                'No separator found in folder name "01MyFolder"'
            );
        });

        it('should handle empty name parts', () => {
            const result = extractNameParts('01. ', '01');
            expect(result).toEqual({
                separator: '. ',
                namePart: '',
            });
        });
    });

    describe('generateFolderName', () => {
        it('should generate new folder names with updated indices', () => {
            const result = generateFolderName('01. My Folder', '01', 5, 2);
            expect(result).toBe('05. My Folder');
        });

        it('should maintain prefix length', () => {
            const result = generateFolderName('001. My Folder', '001', 5, 3);
            expect(result).toBe('005. My Folder');
        });

        it('should handle different separators', () => {
            const result = generateFolderName('01-My Folder', '01', 10, 2);
            expect(result).toBe('10-My Folder');
        });

        it('should handle large index numbers', () => {
            const result = generateFolderName('01. My Folder', '01', 1000, 2);
            expect(result).toBe('1000. My Folder');
        });
    });

    describe('detectIndexConflict', () => {
        const folders: FolderInfo[] = [
            {
                name: '01. First',
                index: 1,
                indexStr: '01',
                prefixLength: 2,
            },
            {
                name: '02. Second',
                index: 2,
                indexStr: '02',
                prefixLength: 2,
            },
            {
                name: '00. Special',
                index: 0,
                indexStr: '00',
                prefixLength: 2,
            },
        ];

        it('should detect index conflicts', () => {
            const conflict = detectIndexConflict(folders, 1);
            expect(conflict).toEqual({
                currentIndex: 1,
                targetIndex: 1,
                conflictingFolder: '01. First',
                isSpecialIndex: false,
            });
        });

        it('should detect special index conflicts', () => {
            const conflict = detectIndexConflict(folders, 0);
            expect(conflict).toEqual({
                currentIndex: 0,
                targetIndex: 0,
                conflictingFolder: '00. Special',
                isSpecialIndex: true,
            });
        });

        it('should return null when no conflict exists', () => {
            const conflict = detectIndexConflict(folders, 5);
            expect(conflict).toBeNull();
        });

        it('should exclude specified folders from conflict checking', () => {
            const conflict = detectIndexConflict(folders, 1, '01. First');
            expect(conflict).toBeNull();
        });

        it('should handle empty folder arrays', () => {
            const conflict = detectIndexConflict([], 1);
            expect(conflict).toBeNull();
        });
    });

    describe('calculateSwapOperations', () => {
        const movingFolder: FolderInfo = {
            name: '01. Moving',
            index: 1,
            indexStr: '01',
            prefixLength: 2,
        };

        const conflictingFolder: FolderInfo = {
            name: '05. Target',
            index: 5,
            indexStr: '05',
            prefixLength: 2,
        };

        it('should calculate swap operations correctly', () => {
            const operations = calculateSwapOperations(
                movingFolder,
                5,
                conflictingFolder
            );

            expect(operations).toHaveLength(2);
            expect(operations[0]).toEqual({
                fromName: '05. Target',
                toName: '01. Target',
                fromIndex: 5,
                toIndex: 1,
            });
            expect(operations[1]).toEqual({
                fromName: '01. Moving',
                toName: '05. Moving',
                fromIndex: 1,
                toIndex: 5,
            });
        });

        it('should maintain prefix lengths', () => {
            const movingWithLongerPrefix: FolderInfo = {
                name: '001. Moving',
                index: 1,
                indexStr: '001',
                prefixLength: 3,
            };

            const operations = calculateSwapOperations(
                movingWithLongerPrefix,
                5,
                conflictingFolder
            );

            expect(operations[0].toName).toBe('01. Target');
            expect(operations[1].toName).toBe('005. Moving');
        });
    });

    describe('generateReindexPlan', () => {
        const folders: FolderInfo[] = [
            {
                name: '03. Third',
                index: 3,
                indexStr: '03',
                prefixLength: 2,
            },
            {
                name: '01. First',
                index: 1,
                indexStr: '01',
                prefixLength: 2,
            },
            {
                name: '05. Fifth',
                index: 5,
                indexStr: '05',
                prefixLength: 2,
            },
            {
                name: '00. Special',
                index: 0,
                indexStr: '00',
                prefixLength: 2,
            },
        ];

        it('should generate reindex plan excluding special indices', () => {
            const plan = generateReindexPlan(folders, 1, true);

            expect(plan).toHaveLength(2); // Only folders needing reindexing
            expect(plan[0]).toEqual({
                fromName: '03. Third',
                toName: '02. Third',
                fromIndex: 3,
                toIndex: 2,
            });
            expect(plan[1]).toEqual({
                fromName: '05. Fifth',
                toName: '03. Fifth',
                fromIndex: 5,
                toIndex: 3,
            });
        });

        it('should include special indices when requested', () => {
            const plan = generateReindexPlan(folders, 1, false);

            expect(plan).toHaveLength(3); // Includes special index folder
            expect(plan[0]).toEqual({
                fromName: '00. Special',
                toName: '01. Special',
                fromIndex: 0,
                toIndex: 1,
            });
        });

        it('should handle different start indices', () => {
            const plan = generateReindexPlan(folders, 10, true);

            expect(plan[0].toIndex).toBe(10);
            expect(plan[1].toIndex).toBe(11);
            expect(plan[2].toIndex).toBe(12);
        });

        it('should return empty plan when no reindexing needed', () => {
            const sequentialFolders: FolderInfo[] = [
                {
                    name: '01. First',
                    index: 1,
                    indexStr: '01',
                    prefixLength: 2,
                },
                {
                    name: '02. Second',
                    index: 2,
                    indexStr: '02',
                    prefixLength: 2,
                },
                {
                    name: '03. Third',
                    index: 3,
                    indexStr: '03',
                    prefixLength: 2,
                },
            ];

            const plan = generateReindexPlan(sequentialFolders, 1, true);
            expect(plan).toHaveLength(0);
        });

        it('should handle empty folder arrays', () => {
            const plan = generateReindexPlan([], 1, true);
            expect(plan).toHaveLength(0);
        });

        it('should preserve prefix lengths in generated names', () => {
            const foldersWithDifferentLengths: FolderInfo[] = [
                {
                    name: '001. First',
                    index: 1,
                    indexStr: '001',
                    prefixLength: 3,
                },
                {
                    name: '05. Fifth',
                    index: 5,
                    indexStr: '05',
                    prefixLength: 2,
                },
            ];

            const plan = generateReindexPlan(
                foldersWithDifferentLengths,
                1,
                true
            );

            expect(plan[0].toName).toBe('02. Fifth'); // Maintains original 2-digit prefix
        });
    });

    describe('integration tests', () => {
        it('should handle complete folder reordering workflow', () => {
            const folderNames = [
                '03. Project C',
                '01. Project A',
                '05. Project E',
            ];
            const parsedFolders = folderNames
                .map((name) => parseFolderIndex(name, numericRegex))
                .filter((f): f is FolderInfo => f !== null);

            // Test conflict detection
            const conflict = detectIndexConflict(parsedFolders, 1);
            expect(conflict).not.toBeNull();

            // Test reindexing plan
            const plan = generateReindexPlan(parsedFolders, 1, true);
            expect(plan).toHaveLength(2);

            // Verify final result would be sequential
            const expectedNames = [
                '01. Project A',
                '02. Project C',
                '03. Project E',
            ];
            expect(plan.map((op) => op.toName).sort()).toEqual(
                expectedNames.slice(1).sort()
            );
        });

        it('should handle mixed special and regular indices', () => {
            const folderNames = [
                '00. Archive',
                '02. Active',
                '99. Important',
                '01. Current',
            ];
            const parsedFolders = folderNames
                .map((name) => parseFolderIndex(name, numericRegex))
                .filter((f): f is FolderInfo => f !== null);

            // Special indices should be detected
            expect(isSpecialIndex('00')).toBe(true);
            expect(isSpecialIndex('99')).toBe(true);
            expect(isSpecialIndex('01')).toBe(false);
            expect(isSpecialIndex('02')).toBe(false);

            // Reindexing should exclude special indices by default
            generateReindexPlan(parsedFolders, 1, true);
            const specialFolders = parsedFolders.filter((f) =>
                isSpecialIndex(f.indexStr)
            );
            const regularFolders = parsedFolders.filter(
                (f) => !isSpecialIndex(f.indexStr)
            );

            expect(specialFolders).toHaveLength(2);
            expect(regularFolders).toHaveLength(2);
        });
    });
});
