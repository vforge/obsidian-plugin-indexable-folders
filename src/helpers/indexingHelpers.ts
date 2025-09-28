/**
 * Pure helper functions for folder indexing logic
 * These functions contain no Obsidian dependencies and can be easily tested
 */

export interface FolderInfo {
    name: string;
    index: number;
    indexStr: string;
    prefixLength: number;
}

export interface IndexConflict {
    currentIndex: number;
    targetIndex: number;
    conflictingFolder: string;
    isSpecialIndex: boolean;
}

export interface RenameOperation {
    fromName: string;
    toName: string;
    fromIndex: number;
    toIndex: number;
}

/**
 * Determines if an index string represents a special index
 * Special indices are multi-digit patterns with all same characters (all 0s or all 9s)
 * @param indexStr - The index string to check
 * @returns True if the index is special (non-movable)
 */
export function isSpecialIndex(indexStr: string): boolean {
    // Only multi-digit patterns with all same characters are considered special
    // Single digits are always normal indices
    if (indexStr.length <= 1) {
        return false;
    }

    // Check if all characters are "0"s or all characters are "9"s
    const allZeros = /^0+$/.test(indexStr);
    const allNines = /^9+$/.test(indexStr);
    return allZeros || allNines;
}

/**
 * Parses a folder name to extract indexing information
 * @param folderName - The folder name to parse
 * @param numericRegex - Regex for matching numeric prefixes
 * @returns Folder info object or null if no valid index found
 */
export function parseFolderIndex(
    folderName: string,
    numericRegex: RegExp
): FolderInfo | null {
    const match = folderName.match(numericRegex);
    if (!match) {
        return null;
    }

    const indexStr = match[1];
    const index = parseInt(indexStr, 10);
    const prefixLength = indexStr.length;

    return {
        name: folderName,
        index,
        indexStr,
        prefixLength,
    };
}

/**
 * Formats an index number with the specified padding length
 * @param index - The numeric index to format
 * @param prefixLength - The desired length with zero padding
 * @returns Zero-padded index string
 */
export function formatIndex(index: number, prefixLength: number): string {
    return String(index).padStart(prefixLength, '0');
}

/**
 * Extracts the separator and name part from a folder name
 * @param folderName - The folder name to parse
 * @param indexStr - The index string portion
 * @returns Object with separator and name part
 */
export function extractNameParts(
    folderName: string,
    indexStr: string
): { separator: string; namePart: string } {
    const indexEnd = indexStr.length;
    const remainingPart = folderName.substring(indexEnd);

    // Find the separator - everything before the first alphanumeric character
    const nameStartMatch = remainingPart.match(/[a-zA-Z0-9]/);
    if (!nameStartMatch) {
        // No alphanumeric character found, treat everything as separator with empty name
        return { separator: remainingPart, namePart: '' };
    }

    const nameStartIndex = nameStartMatch.index!;
    const separator = remainingPart.substring(0, nameStartIndex);
    const namePart = remainingPart.substring(nameStartIndex);

    if (separator.length === 0) {
        throw new Error(`No separator found in folder name "${folderName}"`);
    }

    return { separator, namePart };
}

/**
 * Generates a new folder name with the specified index
 * @param originalName - The original folder name
 * @param originalIndexStr - The original index string
 * @param newIndex - The new index number
 * @param prefixLength - The desired prefix length
 * @returns New folder name with updated index
 */
export function generateFolderName(
    originalName: string,
    originalIndexStr: string,
    newIndex: number,
    prefixLength: number
): string {
    const { separator, namePart } = extractNameParts(
        originalName,
        originalIndexStr
    );
    const newIndexStr = formatIndex(newIndex, prefixLength);

    return `${newIndexStr}${separator}${namePart}`;
}

/**
 * Detects index conflicts in a list of folders
 * @param folders - Array of folder info objects
 * @param targetIndex - The index we want to move to
 * @param excludeFolder - Folder name to exclude from conflict checking (the one being moved)
 * @returns Conflict information or null if no conflict
 */
export function detectIndexConflict(
    folders: FolderInfo[],
    targetIndex: number,
    excludeFolder?: string
): IndexConflict | null {
    for (const folder of folders) {
        if (excludeFolder && folder.name === excludeFolder) {
            continue;
        }

        if (folder.index === targetIndex) {
            return {
                currentIndex: folder.index,
                targetIndex,
                conflictingFolder: folder.name,
                isSpecialIndex: isSpecialIndex(folder.indexStr),
            };
        }
    }

    return null;
}

/**
 * Calculates the rename operations needed for smart swapping
 * @param movingFolder - The folder being moved
 * @param targetIndex - The desired index
 * @param conflictingFolder - The folder currently at the target index
 * @returns Array of rename operations to perform the swap
 */
export function calculateSwapOperations(
    movingFolder: FolderInfo,
    targetIndex: number,
    conflictingFolder: FolderInfo
): RenameOperation[] {
    const operations: RenameOperation[] = [];

    // Step 1: Move conflicting folder to moving folder's current position
    const conflictingNewName = generateFolderName(
        conflictingFolder.name,
        conflictingFolder.indexStr,
        movingFolder.index,
        conflictingFolder.prefixLength
    );

    operations.push({
        fromName: conflictingFolder.name,
        toName: conflictingNewName,
        fromIndex: conflictingFolder.index,
        toIndex: movingFolder.index,
    });

    // Step 2: Move original folder to target position
    const movingNewName = generateFolderName(
        movingFolder.name,
        movingFolder.indexStr,
        targetIndex,
        movingFolder.prefixLength
    );

    operations.push({
        fromName: movingFolder.name,
        toName: movingNewName,
        fromIndex: movingFolder.index,
        toIndex: targetIndex,
    });

    return operations;
}

/**
 * Generates a comprehensive reindexing plan for a list of folders
 * @param folders - Array of folder info objects
 * @param startIndex - Starting index for reindexing (default: 1)
 * @param excludeSpecial - Whether to exclude special indices from reindexing
 * @returns Array of rename operations for complete reindexing
 */
export function generateReindexPlan(
    folders: FolderInfo[],
    startIndex = 1,
    excludeSpecial = true
): RenameOperation[] {
    const operations: RenameOperation[] = [];

    // Filter and sort folders
    const foldersToReindex = folders
        .filter((folder) => !excludeSpecial || !isSpecialIndex(folder.indexStr))
        .sort((a, b) => a.index - b.index);

    let currentIndex = startIndex;

    for (const folder of foldersToReindex) {
        if (folder.index !== currentIndex) {
            const newName = generateFolderName(
                folder.name,
                folder.indexStr,
                currentIndex,
                folder.prefixLength
            );

            operations.push({
                fromName: folder.name,
                toName: newName,
                fromIndex: folder.index,
                toIndex: currentIndex,
            });
        }
        currentIndex++;
    }

    return operations;
}
