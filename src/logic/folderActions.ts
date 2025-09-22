import { TFolder, Notice } from 'obsidian';
import IndexableFoldersPlugin from '../main';

export async function updateFolderIndex(
    plugin: IndexableFoldersPlugin,
    folder: TFolder,
    newIndex: number
) {
    console.debug(
        `Indexable Folders Plugin: updating index for ${folder.name} to ${newIndex}`
    );
    if (!folder.parent) return;

    const numericPrefixRegex = /^(\d+)_/;
    const match = folder.name.match(numericPrefixRegex);
    if (!match) return;

    const oldIndex = parseInt(match[1], 10);
    const prefixLength = match[1].length;
    const restOfName = folder.name.substring(match[0].length);

    if (newIndex === oldIndex) {
        console.debug(
            'Indexable Folders Plugin: new index is same as old, no action needed.'
        );
        return;
    }

    const siblings = folder.parent.children
        .filter((f): f is TFolder => f instanceof TFolder && f !== folder)
        .filter((f) => numericPrefixRegex.test(f.name));

    const foldersToRename: { from: TFolder; to: string }[] = [];

    if (newIndex > oldIndex) {
        // Moving down
        const affectedSiblings = siblings.filter((f) => {
            const idx = parseInt(f.name.match(numericPrefixRegex)![1], 10);
            return idx > oldIndex && idx <= newIndex;
        });

        for (const sibling of affectedSiblings) {
            const siblingMatch = sibling.name.match(numericPrefixRegex)!;
            const siblingIndex = parseInt(siblingMatch[1], 10);
            const siblingRest = sibling.name.substring(siblingMatch[0].length);
            const newSiblingPrefix = String(siblingIndex - 1).padStart(
                prefixLength,
                '0'
            );
            foldersToRename.push({
                from: sibling,
                to: `${newSiblingPrefix}_${siblingRest}`,
            });
        }
    } else {
        // Moving up
        const affectedSiblings = siblings.filter((f) => {
            const idx = parseInt(f.name.match(numericPrefixRegex)![1], 10);
            return idx >= newIndex && idx < oldIndex;
        });

        for (const sibling of affectedSiblings) {
            const siblingMatch = sibling.name.match(numericPrefixRegex)!;
            const siblingIndex = parseInt(siblingMatch[1], 10);
            const siblingRest = sibling.name.substring(siblingMatch[0].length);
            const newSiblingPrefix = String(siblingIndex + 1).padStart(
                prefixLength,
                '0'
            );
            foldersToRename.push({
                from: sibling,
                to: `${newSiblingPrefix}_${siblingRest}`,
            });
        }
    }

    // Add the original folder to the list
    const newPrefix = String(newIndex).padStart(prefixLength, '0');
    foldersToRename.push({ from: folder, to: `${newPrefix}_${restOfName}` });

    console.debug(
        'Indexable Folders Plugin: folders to rename (update index):',
        foldersToRename.map((r) => ({ from: r.from.name, to: r.to }))
    );

    // Perform renames and show notifications for all affected folders
    for (const rename of foldersToRename) {
        if (!rename.from.parent) continue;

        const oldName = rename.from.name;
        await plugin.app.fileManager.renameFile(
            rename.from,
            `${rename.from.parent.path}/${rename.to}`
        );

        // Show notification for each renamed folder (works for both up and down moves)
        new Notice(`Folder renamed: "${oldName}" → "${rename.to}"`, 3000);
    }

    console.log(`Finished updating index for folder: ${folder.path}`);
}
