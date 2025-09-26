import { TFolder, Notice } from 'obsidian';
import IndexableFoldersPlugin from '../main';
import { log } from '../utils/logger';

export function isSpecialIndex(index: number): boolean {
    const indexStr = index.toString();
    const allZeros = /^0+$/.test(indexStr);
    const allNines = /^9+$/.test(indexStr);
    return allZeros || allNines;
}

export async function updateFolderIndex(
    plugin: IndexableFoldersPlugin,
    folder: TFolder,
    newIndex: number
) {
    log('updating index for', folder.name, 'to', newIndex);
    if (!folder.parent) return;

    const numericPrefixRegex = plugin.getNumericPrefixRegex();
    const match = folder.name.match(numericPrefixRegex);
    if (!match) return;

    const oldIndex = parseInt(match[1], 10);
    const prefixLength = match[1].length;

    // Check if this folder has a special index that shouldn't be moved
    if (isSpecialIndex(oldIndex)) {
        log('folder has special index (all 0s or all 9s), cannot be moved');
        new Notice(
            `Cannot move folder with special index: ${folder.name}`,
            3000
        );
        return;
    }

    // Check if target index is special
    if (isSpecialIndex(newIndex)) {
        log(
            'target index is special (all 0s or all 9s), cannot move to this position'
        );
        new Notice(`Cannot move to special index position: ${newIndex}`, 3000);
        return;
    }

    if (newIndex === oldIndex) {
        return;
    }

    // Try simple move first, fall back to full reindexing if needed
    const success = await trySimpleMove(plugin, folder, newIndex, prefixLength);
    if (!success) {
        await fullReindexWithConflictResolution(
            plugin,
            folder,
            newIndex,
            prefixLength
        );
    }
}

async function trySimpleMove(
    plugin: IndexableFoldersPlugin,
    folder: TFolder,
    newIndex: number,
    prefixLength: number
): Promise<boolean> {
    if (!folder.parent) return false;

    const numericPrefixRegex = plugin.getNumericPrefixRegex();

    // Get all indexed folders in the parent directory
    const allFolders = folder.parent.children
        .filter((f): f is TFolder => f instanceof TFolder)
        .filter((f) => numericPrefixRegex.test(f.name));

    // Check if the target index is occupied by a special folder
    const targetConflict = allFolders.find((f) => {
        const match = f.name.match(numericPrefixRegex);
        if (match) {
            const index = parseInt(match[1], 10);
            return index === newIndex && isSpecialIndex(index);
        }
        return false;
    });

    if (targetConflict) {
        log('target index conflicts with special folder, need full reindexing');
        return false;
    }

    // Check if the target index is occupied by a regular folder
    const regularConflict = allFolders.find((f) => {
        if (f.path === folder.path) return false; // Skip self
        const match = f.name.match(numericPrefixRegex);
        if (match) {
            const index = parseInt(match[1], 10);
            return index === newIndex && !isSpecialIndex(index);
        }
        return false;
    });

    if (regularConflict) {
        // Check if we can do a smart swap instead of full reindexing
        const sourceMatch = folder.name.match(numericPrefixRegex)!;
        const sourceIndex = parseInt(sourceMatch[1], 10);

        // Check if the source index position is available for the conflicting folder
        const sourcePositionOccupied = allFolders.find((f) => {
            if (f.path === folder.path || f.path === regularConflict.path)
                return false;
            const match = f.name.match(numericPrefixRegex);
            if (match) {
                const index = parseInt(match[1], 10);
                return index === sourceIndex;
            }
            return false;
        });

        if (!sourcePositionOccupied) {
            // Smart swap is possible!
            log(
                'performing smart swap:',
                folder.name,
                '↔',
                regularConflict.name
            );
            return await performSmartSwap(
                plugin,
                folder,
                regularConflict,
                newIndex,
                sourceIndex,
                prefixLength
            );
        }

        log(
            'target index conflicts with regular folder, and smart swap not possible, need full reindexing'
        );
        return false;
    }

    // Simple move is possible - just rename the target folder
    const match = folder.name.match(numericPrefixRegex)!;
    const restOfName = folder.name.substring(match[0].length);
    const newPrefix = String(newIndex).padStart(prefixLength, '0');
    const newName = `${newPrefix}${plugin.settings.separator}${restOfName}`;

    log('performing simple move:', folder.name, '→', newName);

    await plugin.app.fileManager.renameFile(
        folder,
        `${folder.parent.path}/${newName}`
    );

    new Notice(`Folder renamed: "${folder.name}" → "${newName}"`, 3000);
    return true;
}

async function performSmartSwap(
    plugin: IndexableFoldersPlugin,
    folder1: TFolder,
    folder2: TFolder,
    folder1NewIndex: number,
    folder2NewIndex: number,
    prefixLength: number
): Promise<boolean> {
    if (!folder1.parent || !folder2.parent) return false;

    const numericPrefixRegex = plugin.getNumericPrefixRegex();

    // Get the names without indices
    const folder1Match = folder1.name.match(numericPrefixRegex)!;
    const folder1Name = folder1.name.substring(folder1Match[0].length);

    const folder2Match = folder2.name.match(numericPrefixRegex)!;
    const folder2Name = folder2.name.substring(folder2Match[0].length);

    // Create new names
    const folder1NewPrefix = String(folder1NewIndex).padStart(
        prefixLength,
        '0'
    );
    const folder1NewName = `${folder1NewPrefix}${plugin.settings.separator}${folder1Name}`;

    const folder2NewPrefix = String(folder2NewIndex).padStart(
        prefixLength,
        '0'
    );
    const folder2NewName = `${folder2NewPrefix}${plugin.settings.separator}${folder2Name}`;

    try {
        // Rename folder1 to temporary name first to avoid conflicts
        const tempName = `temp${plugin.settings.separator}${Date.now()}${plugin.settings.separator}${folder1Name}`;
        await plugin.app.fileManager.renameFile(
            folder1,
            `${folder1.parent.path}/${tempName}`
        );

        // Rename folder2 to folder1's target position
        await plugin.app.fileManager.renameFile(
            folder2,
            `${folder2.parent.path}/${folder2NewName}`
        );

        // Rename folder1 from temp to its final position
        await plugin.app.fileManager.renameFile(
            folder1,
            `${folder1.parent.path}/${folder1NewName}`
        );

        log(
            'smart swap completed:',
            `${folder1Match[0]}${folder1Name}`,
            '↔',
            `${folder2Match[0]}${folder2Name}`
        );

        new Notice(
            `Folders swapped: "${folder1Match[0]}${folder1Name}" ↔ "${folder2Match[0]}${folder2Name}"`,
            3000
        );

        return true;
    } catch (error) {
        console.error('Smart swap failed:', error);
        return false;
    }
}

async function fullReindexWithConflictResolution(
    plugin: IndexableFoldersPlugin,
    targetFolder: TFolder,
    targetIndex: number,
    prefixLength: number
) {
    if (!targetFolder.parent) return;

    const numericPrefixRegex = plugin.getNumericPrefixRegex();

    // Get all indexed folders in the parent directory
    const allFolders = targetFolder.parent.children
        .filter((f): f is TFolder => f instanceof TFolder)
        .filter((f) => numericPrefixRegex.test(f.name));

    // Separate special folders from regular folders
    const specialFolders: TFolder[] = [];
    const regularFolders: TFolder[] = [];

    for (const folder of allFolders) {
        const match = folder.name.match(numericPrefixRegex);
        if (match) {
            const index = parseInt(match[1], 10);
            if (isSpecialIndex(index)) {
                specialFolders.push(folder);
            } else {
                regularFolders.push(folder);
            }
        }
    }

    // Sort regular folders by their current index
    regularFolders.sort((a, b) => {
        const indexA = parseInt(a.name.match(numericPrefixRegex)![1], 10);
        const indexB = parseInt(b.name.match(numericPrefixRegex)![1], 10);
        return indexA - indexB;
    });

    // Create new ordering: remove target folder and insert it at desired position
    const otherFolders = regularFolders.filter(
        (f) => f.path !== targetFolder.path
    );
    const newOrdering: TFolder[] = [];

    // Insert folders and target folder in the correct order
    let targetInserted = false;
    for (let i = 0; i < otherFolders.length; i++) {
        const currentFolder = otherFolders[i];
        const currentIndex = parseInt(
            currentFolder.name.match(numericPrefixRegex)![1],
            10
        );

        // If we haven't inserted target yet and current folder's index >= target index
        if (!targetInserted && currentIndex >= targetIndex) {
            newOrdering.push(targetFolder);
            targetInserted = true;
        }

        newOrdering.push(currentFolder);
    }

    // If target hasn't been inserted yet (it goes at the end)
    if (!targetInserted) {
        newOrdering.push(targetFolder);
    }

    // Re-index all regular folders starting from 1
    const foldersToRename: { from: TFolder; to: string }[] = [];
    let nextAvailableIndex = 1;

    for (const folder of newOrdering) {
        // Skip indices that are occupied by special folders
        while (
            specialFolders.some((sf) => {
                const match = sf.name.match(numericPrefixRegex);
                return match && parseInt(match[1], 10) === nextAvailableIndex;
            })
        ) {
            nextAvailableIndex++;
        }

        const match = folder.name.match(numericPrefixRegex)!;
        const restOfName = folder.name.substring(match[0].length);
        const newPrefix = String(nextAvailableIndex).padStart(
            prefixLength,
            '0'
        );
        const newName = `${newPrefix}${plugin.settings.separator}${restOfName}`;

        if (folder.name !== newName) {
            foldersToRename.push({
                from: folder,
                to: newName,
            });
        }

        nextAvailableIndex++;
    }

    log(
        'folders to rename (full reindex):',
        foldersToRename.map((r) => ({ from: r.from.name, to: r.to }))
    );

    // Perform renames
    for (const rename of foldersToRename) {
        if (!rename.from.parent) continue;

        const oldName = rename.from.name;
        await plugin.app.fileManager.renameFile(
            rename.from,
            `${rename.from.parent.path}/${rename.to}`
        );

        new Notice(`Folder renamed: "${oldName}" → "${rename.to}"`, 3000);
    }

    log('finished full reindexing for folder:', targetFolder.path);
}
