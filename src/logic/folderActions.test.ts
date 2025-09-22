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

        it('should handle moving folder down scenario: 1_foo, 2_bar, 3_baz -> move 1_foo down to position 3', () => {
            const targetFolder = '1_foo';
            const targetIndex = 3;

            // Expected result: 1_bar, 2_baz, 3_foo
            expect(extractIndex(targetFolder)).toBe(1);
            expect(removeIndex(targetFolder)).toBe('foo');
            expect(formatWithIndex('foo', targetIndex)).toBe('3_foo');
        });

        it('should handle moving folder down scenario: 1_foo, 2_bar, 3_baz, 4_qux -> move 2_bar down to position 4', () => {
            const targetFolder = '2_bar';
            const targetIndex = 4;

            // Expected result: 1_foo, 2_baz, 3_qux, 4_bar
            expect(extractIndex(targetFolder)).toBe(2);
            expect(removeIndex(targetFolder)).toBe('bar');
            expect(formatWithIndex('bar', targetIndex)).toBe('4_bar');
        });

        it('should handle moving folder to same position (no-op)', () => {
            const targetFolder = '2_bar';
            const targetIndex = 2;

            expect(extractIndex(targetFolder)).toBe(2);
            expect(removeIndex(targetFolder)).toBe('bar');
            expect(formatWithIndex('bar', targetIndex)).toBe('2_bar');
        });

        it('should handle moving folder in sequence with zero-padded indices', () => {
            const targetFolder = '001_foo';
            const targetIndex = 5;

            expect(extractIndex(targetFolder)).toBe(1);
            expect(removeIndex(targetFolder)).toBe('foo');
            expect(formatWithIndex('foo', targetIndex, 3)).toBe('005_foo');
        });

        it('should handle edge case: moving first folder down in large sequence', () => {
            const targetFolder = '01_first';
            const targetIndex = 10;

            expect(extractIndex(targetFolder)).toBe(1);
            expect(removeIndex(targetFolder)).toBe('first');
            expect(formatWithIndex('first', targetIndex, 2)).toBe('10_first');
        });

        it('should handle edge case: moving last folder up in sequence', () => {
            const targetFolder = '10_last';
            const targetIndex = 1;

            expect(extractIndex(targetFolder)).toBe(10);
            expect(removeIndex(targetFolder)).toBe('last');
            expect(formatWithIndex('last', targetIndex, 2)).toBe('01_last');
        });
    });

    describe('complex folder name scenarios', () => {
        it('should handle folder names with multiple underscores', () => {
            const folder = '5_my_complex_folder_name';
            expect(extractIndex(folder)).toBe(5);
            expect(removeIndex(folder)).toBe('my_complex_folder_name');
            expect(formatWithIndex('my_complex_folder_name', 3)).toBe(
                '3_my_complex_folder_name'
            );
        });

        it('should handle folder names with special characters', () => {
            const folder = '2_folder-with-dashes';
            expect(extractIndex(folder)).toBe(2);
            expect(removeIndex(folder)).toBe('folder-with-dashes');
        });

        it('should handle folder names with spaces and numbers', () => {
            const folder = '7_Meeting Notes 2024';
            expect(extractIndex(folder)).toBe(7);
            expect(removeIndex(folder)).toBe('Meeting Notes 2024');
        });

        it('should handle folder names that are just numbers after prefix', () => {
            const folder = '3_123';
            expect(extractIndex(folder)).toBe(3);
            expect(removeIndex(folder)).toBe('123');
        });
    });

    describe('prefix length scenarios', () => {
        it('should maintain consistent prefix length when formatting', () => {
            expect(formatWithIndex('test', 1, 1)).toBe('1_test');
            expect(formatWithIndex('test', 1, 2)).toBe('01_test');
            expect(formatWithIndex('test', 1, 3)).toBe('001_test');
            expect(formatWithIndex('test', 10, 3)).toBe('010_test');
            expect(formatWithIndex('test', 100, 3)).toBe('100_test');
        });

        it('should handle prefix length detection from existing folders', () => {
            const folders = ['001_a', '002_b', '003_c'];
            folders.forEach((folder) => {
                const match = folder.match(numericPrefixRegex);
                const prefixLength = match ? match[1].length : 1;
                expect(prefixLength).toBe(3);
            });
        });
    });

    describe('boundary conditions', () => {
        it('should handle single digit indices', () => {
            expect(extractIndex('0_zero')).toBe(0);
            expect(extractIndex('9_nine')).toBe(9);
        });

        it('should handle large indices', () => {
            expect(extractIndex('999_large')).toBe(999);
            expect(extractIndex('1000_thousand')).toBe(1000);
        });

        it('should handle moving to index 0 (special case)', () => {
            const folder = '5_test';
            const newIndex = 0;
            expect(formatWithIndex(removeIndex(folder), newIndex)).toBe(
                '0_test'
            );
            expect(isSpecialIndex(newIndex)).toBe(true);
        });

        it('should identify edge case indices correctly', () => {
            expect(isSpecialIndex(0)).toBe(true);
            expect(isSpecialIndex(9)).toBe(true);
            expect(isSpecialIndex(99)).toBe(true);
            expect(isSpecialIndex(999)).toBe(true);
            expect(isSpecialIndex(9999)).toBe(true);
        });
    });

    describe('folder sequence validation', () => {
        function validateSequence(folderNames: string[]): boolean {
            const indices = folderNames
                .map((name) => extractIndex(name))
                .filter((index): index is number => index !== null)
                .sort((a, b) => a - b);

            // Check for duplicates
            const uniqueIndices = new Set(indices);
            return uniqueIndices.size === indices.length;
        }

        it('should validate proper sequence without duplicates', () => {
            const sequence = ['1_a', '2_b', '3_c', '4_d'];
            expect(validateSequence(sequence)).toBe(true);
        });

        it('should detect duplicate indices in sequence', () => {
            const sequence = ['1_a', '2_b', '2_c', '3_d'];
            expect(validateSequence(sequence)).toBe(false);
        });

        it('should validate mixed indexed and non-indexed folders', () => {
            const sequence = ['1_a', 'unindexed', '2_b', '3_c'];
            const indexedOnly = sequence.filter(
                (name) => extractIndex(name) !== null
            );
            expect(validateSequence(indexedOnly)).toBe(true);
        });
    });
});
