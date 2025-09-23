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

    describe('special index protection', () => {
        it('should prevent moving folders with all-zero indices', () => {
            const specialFolders = ['0_special', '00_special', '000_special'];
            specialFolders.forEach((folderName) => {
                const index = extractIndex(folderName);
                expect(index).not.toBe(null);
                expect(isSpecialIndex(index!)).toBe(true);
            });
        });

        it('should prevent moving folders with all-nine indices', () => {
            const specialFolders = ['9_special', '99_special', '999_special'];
            specialFolders.forEach((folderName) => {
                const index = extractIndex(folderName);
                expect(index).not.toBe(null);
                expect(isSpecialIndex(index!)).toBe(true);
            });
        });

        it('should allow moving folders with regular indices', () => {
            const regularFolders = [
                '1_regular',
                '12_regular',
                '90_regular',
                '909_regular',
            ];
            regularFolders.forEach((folderName) => {
                const index = extractIndex(folderName);
                expect(index).not.toBe(null);
                expect(isSpecialIndex(index!)).toBe(false);
            });
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

    describe('smart reindexing scenarios with special folders', () => {
        function simulateReindexing(
            folders: string[],
            targetFolder: string,
            targetIndex: number
        ): string[] {
            // Separate special and regular folders
            const specialFolders = folders.filter((name) => {
                const match = name.match(numericPrefixRegex);
                return match && isSpecialIndex(parseInt(match[1], 10));
            });

            const regularFolders = folders.filter((name) => {
                const match = name.match(numericPrefixRegex);
                return match && !isSpecialIndex(parseInt(match[1], 10));
            });

            // Sort regular folders by index
            regularFolders.sort((a, b) => {
                const indexA = parseInt(a.match(numericPrefixRegex)![1], 10);
                const indexB = parseInt(b.match(numericPrefixRegex)![1], 10);
                return indexA - indexB;
            });

            // Create new ordering
            const otherFolders = regularFolders.filter(
                (name) => name !== targetFolder
            );
            const newOrdering: string[] = [];

            let targetInserted = false;
            for (const folder of otherFolders) {
                const currentIndex = parseInt(
                    folder.match(numericPrefixRegex)![1],
                    10
                );

                if (!targetInserted && currentIndex >= targetIndex) {
                    newOrdering.push(targetFolder);
                    targetInserted = true;
                }

                newOrdering.push(folder);
            }

            if (!targetInserted) {
                newOrdering.push(targetFolder);
            }

            // Re-index starting from 1, skipping special indices
            const result = [...specialFolders];
            let nextIndex = 1;

            for (const folder of newOrdering) {
                // Skip indices occupied by special folders
                while (
                    specialFolders.some((sf) => {
                        const match = sf.match(numericPrefixRegex);
                        return match && parseInt(match[1], 10) === nextIndex;
                    })
                ) {
                    nextIndex++;
                }

                const name = removeIndex(folder);
                const newName = formatWithIndex(name, nextIndex);
                result.push(newName);
                nextIndex++;
            }

            // Sort result by index for comparison
            return result.sort((a, b) => {
                const indexA = parseInt(a.match(numericPrefixRegex)![1], 10);
                const indexB = parseInt(b.match(numericPrefixRegex)![1], 10);
                return indexA - indexB;
            });
        }

        it('should handle: 0_foo, 1_baz, 2_bar, 3_qux -> move 2_bar up -> 0_foo, 1_bar, 2_baz, 3_qux', () => {
            const folders = ['0_foo', '1_baz', '2_bar', '3_qux'];
            const result = simulateReindexing(folders, '2_bar', 1);
            expect(result).toEqual(['0_foo', '1_bar', '2_baz', '3_qux']);
        });

        it('should handle: 0_foo, 1_baz, 3_bar, 4_qux -> move 1_baz down -> 0_foo, 1_baz, 2_bar, 3_qux', () => {
            const folders = ['0_foo', '1_baz', '3_bar', '4_qux'];
            // Moving 1_baz down means it goes after 3_bar in the sequence
            const result = simulateReindexing(folders, '1_baz', 3);
            expect(result).toEqual(['0_foo', '1_baz', '2_bar', '3_qux']);
        });

        it('should handle: 0_foo, 1_baz, 3_bar, 4_qux -> move 3_bar up -> 0_foo, 1_baz, 2_bar, 3_qux', () => {
            const folders = ['0_foo', '1_baz', '3_bar', '4_qux'];
            // Moving 3_bar up means it goes before 1_baz in sequence, so position 2
            const result = simulateReindexing(folders, '3_bar', 2);
            expect(result).toEqual(['0_foo', '1_baz', '2_bar', '3_qux']);
        });

        it('should handle multiple special folders: 0_arch, 1_doc, 99_temp, 2_src -> move 2_src up -> 0_arch, 1_src, 2_doc, 99_temp', () => {
            const folders = ['0_arch', '1_doc', '99_temp', '2_src'];
            const result = simulateReindexing(folders, '2_src', 1);
            expect(result).toEqual(['0_arch', '1_src', '2_doc', '99_temp']);
        });

        it('should preserve special folders when reindexing around them', () => {
            const folders = ['0_special', '1_a', '2_b', '999_archive'];
            const result = simulateReindexing(folders, '1_a', 3);
            expect(result).toEqual(['0_special', '1_b', '2_a', '999_archive']);
        });
    });

    describe('simple move scenarios (no full reindexing needed)', () => {
        function simulateSimpleMove(
            folders: string[],
            targetFolder: string,
            newTargetIndex: number
        ): string[] {
            const result = [...folders];
            const targetIndex = result.findIndex((f) => f === targetFolder);

            if (targetIndex === -1) return result;

            // Check if target index is available (no conflicts)
            const targetIndexExists = result.some((f) => {
                const match = f.match(numericPrefixRegex);
                return match && parseInt(match[1], 10) === newTargetIndex;
            });

            if (targetIndexExists) {
                // Would need full reindexing - this test simulates the simple case
                return result;
            }

            // Simple rename
            const name = removeIndex(targetFolder);
            const newName = formatWithIndex(name, newTargetIndex);
            result[targetIndex] = newName;

            return result.sort((a, b) => {
                const indexA = parseInt(a.match(numericPrefixRegex)![1], 10);
                const indexB = parseInt(b.match(numericPrefixRegex)![1], 10);
                return indexA - indexB;
            });
        }

        it('should handle simple move down at the end: 0_foo, 1_baz, 3_bar, 4_qux -> move 4_qux down -> 0_foo, 1_baz, 3_bar, 5_qux', () => {
            const folders = ['0_foo', '1_baz', '3_bar', '4_qux'];
            const result = simulateSimpleMove(folders, '4_qux', 5);
            expect(result).toEqual(['0_foo', '1_baz', '3_bar', '5_qux']);
        });

        it('should handle simple move down in gap: 0_foo, 1_baz, 3_bar, 4_qux -> move 1_baz down -> 0_foo, 2_baz, 3_bar, 4_qux', () => {
            const folders = ['0_foo', '1_baz', '3_bar', '4_qux'];
            const result = simulateSimpleMove(folders, '1_baz', 2);
            expect(result).toEqual(['0_foo', '2_baz', '3_bar', '4_qux']);
        });

        it('should handle simple move up in gap: 0_foo, 1_baz, 3_bar, 4_qux -> move 3_bar up -> 0_foo, 1_baz, 2_bar, 4_qux', () => {
            const folders = ['0_foo', '1_baz', '3_bar', '4_qux'];
            const result = simulateSimpleMove(folders, '3_bar', 2);
            expect(result).toEqual(['0_foo', '1_baz', '2_bar', '4_qux']);
        });
    });

    describe('smart swap scenarios (two-folder swap)', () => {
        function simulateSmartSwap(
            folders: string[],
            targetFolder: string,
            newTargetIndex: number
        ): string[] {
            const result = [...folders];
            const targetIndex = result.findIndex((f) => f === targetFolder);

            if (targetIndex === -1) return result;

            // Find the folder currently at the target index
            const conflictFolder = result.find((f) => {
                const match = f.match(numericPrefixRegex);
                return match && parseInt(match[1], 10) === newTargetIndex;
            });

            if (!conflictFolder) return result; // No conflict, should be simple move

            // Get the original index of the target folder
            const targetMatch = targetFolder.match(numericPrefixRegex);
            if (!targetMatch) return result;
            const originalIndex = parseInt(targetMatch[1], 10);

            // Check if smart swap is possible (original position is available)
            const originalPositionOccupied = result.some((f) => {
                if (f === targetFolder || f === conflictFolder) return false;
                const match = f.match(numericPrefixRegex);
                return match && parseInt(match[1], 10) === originalIndex;
            });

            if (originalPositionOccupied) return result; // Can't do smart swap

            // Perform the swap
            const targetName = removeIndex(targetFolder);
            const conflictName = removeIndex(conflictFolder);

            const newTargetFolder = formatWithIndex(targetName, newTargetIndex);
            const newConflictFolder = formatWithIndex(
                conflictName,
                originalIndex
            );

            const newResult = result.map((f) => {
                if (f === targetFolder) return newTargetFolder;
                if (f === conflictFolder) return newConflictFolder;
                return f;
            });

            return newResult.sort((a, b) => {
                const indexA = parseInt(a.match(numericPrefixRegex)![1], 10);
                const indexB = parseInt(b.match(numericPrefixRegex)![1], 10);
                return indexA - indexB;
            });
        }

        it('should handle smart swap: 0_foo, 1_baz, 2_bar, 4_qux -> move 2_bar up -> 0_foo, 1_bar, 2_baz, 4_qux', () => {
            const folders = ['0_foo', '1_baz', '2_bar', '4_qux'];
            const result = simulateSmartSwap(folders, '2_bar', 1);
            expect(result).toEqual(['0_foo', '1_bar', '2_baz', '4_qux']);
        });

        it('should handle smart swap: 1_foo, 2_bar, 3_baz -> move 3_baz up to 1 -> 1_baz, 2_bar, 3_foo', () => {
            const folders = ['1_foo', '2_bar', '3_baz'];
            const result = simulateSmartSwap(folders, '3_baz', 1);
            expect(result).toEqual(['1_baz', '2_bar', '3_foo']);
        });

        it('should handle smart swap: 1_alpha, 3_beta, 4_gamma -> move 4_gamma up to 3 -> 1_alpha, 3_gamma, 4_beta', () => {
            const folders = ['1_alpha', '3_beta', '4_gamma'];
            const result = simulateSmartSwap(folders, '4_gamma', 3);
            expect(result).toEqual(['1_alpha', '3_gamma', '4_beta']);
        });
    });
});
