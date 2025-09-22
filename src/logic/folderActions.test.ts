import { describe, it, expect } from 'vitest';

// Test utilities for folder indexing logic
describe('Folder Index Utils', () => {
    const numericPrefixRegex = /^(\d+)_/;

    function extractIndex(folderName: string): number | null {
        const match = folderName.match(numericPrefixRegex);
        return match ? parseInt(match[1], 10) : null;
    }

    function removeIndex(folderName: string): string {
        const match = folderName.match(numericPrefixRegex);
        return match ? folderName.substring(match[0].length) : folderName;
    }

    function formatWithIndex(
        name: string,
        index: number,
        prefixLength = 1
    ): string {
        const prefix = String(index).padStart(prefixLength, '0');
        return `${prefix}_${name}`;
    }

    function isSpecialIndex(index: number): boolean {
        const indexStr = index.toString();
        const allZeros = /^0+$/.test(indexStr);
        const allNines = /^9+$/.test(indexStr);
        return allZeros || allNines;
    }

    describe('extractIndex', () => {
        it('should extract numeric index from folder name', () => {
            expect(extractIndex('1_foo')).toBe(1);
            expect(extractIndex('01_bar')).toBe(1);
            expect(extractIndex('123_baz')).toBe(123);
            expect(extractIndex('0_zero')).toBe(0);
        });

        it('should return null for folder names without index', () => {
            expect(extractIndex('foo')).toBe(null);
            expect(extractIndex('_bar')).toBe(null);
            expect(extractIndex('a1_baz')).toBe(null);
        });
    });

    describe('removeIndex', () => {
        it('should remove index prefix from folder name', () => {
            expect(removeIndex('1_foo')).toBe('foo');
            expect(removeIndex('01_bar')).toBe('bar');
            expect(removeIndex('123_baz_qux')).toBe('baz_qux');
        });

        it('should return original name if no index present', () => {
            expect(removeIndex('foo')).toBe('foo');
            expect(removeIndex('_bar')).toBe('_bar');
        });
    });

    describe('formatWithIndex', () => {
        it('should format folder name with index', () => {
            expect(formatWithIndex('foo', 1)).toBe('1_foo');
            expect(formatWithIndex('bar', 10, 2)).toBe('10_bar');
            expect(formatWithIndex('baz', 5, 3)).toBe('005_baz');
        });
    });

    describe('isSpecialIndex', () => {
        it('should identify all-zero indices as special', () => {
            expect(isSpecialIndex(0)).toBe(true);
        });

        it('should identify all-nine indices as special', () => {
            expect(isSpecialIndex(9)).toBe(true);
            expect(isSpecialIndex(99)).toBe(true);
            expect(isSpecialIndex(999)).toBe(true);
        });

        it('should not identify regular indices as special', () => {
            expect(isSpecialIndex(1)).toBe(false);
            expect(isSpecialIndex(12)).toBe(false);
            expect(isSpecialIndex(90)).toBe(false);
            expect(isSpecialIndex(909)).toBe(false);
        });
    });

    describe('folder reordering scenarios', () => {
        it('should handle moving folder up scenario: 1_foo, 2_bar, 3_baz -> move 3_baz up to position 2', () => {
            const targetFolder = '3_baz';
            const targetIndex = 2;

            // Expected result: 1_foo, 2_baz, 3_bar
            expect(extractIndex(targetFolder)).toBe(3);
            expect(removeIndex(targetFolder)).toBe('baz');
            expect(formatWithIndex('baz', targetIndex)).toBe('2_baz');
        });

        it('should handle moving folder up scenario: 1_foo, 2_bar, 3_baz -> move 2_bar up to position 1', () => {
            const targetFolder = '2_bar';
            const targetIndex = 1;

            // Expected result: 1_bar, 2_foo, 3_baz
            expect(extractIndex(targetFolder)).toBe(2);
            expect(removeIndex(targetFolder)).toBe('bar');
            expect(formatWithIndex('bar', targetIndex)).toBe('1_bar');
        });
    });
});
