import { Menu, TFolder, Notice } from 'obsidian';
import IndexableFoldersPlugin from './main';
import { revertFolderName, startFolderObserver } from './logic/fileExplorer';
import { updateStatusBar } from './logic/statusBar';
import { UpdateIndexModal } from './ui/UpdateIndexModal';
import { updateFolderIndex } from './logic/folderActions';

export function registerEvents(plugin: IndexableFoldersPlugin) {
    plugin.app.workspace.onLayoutReady(() => {
        console.debug('Indexable Folders Plugin: layout ready');
        startFolderObserver(plugin);
        updateStatusBar(plugin);
    });

    plugin.registerEvent(
        plugin.app.workspace.on('file-open', (file) => {
            console.debug(
                'Indexable Folders Plugin: file-open event for',
                file?.path
            );
            updateStatusBar(plugin);
        })
    );

    plugin.registerEvent(
        plugin.app.workspace.on('file-menu', (menu: Menu, file) => {
            if (!(file instanceof TFolder)) {
                return;
            }
            console.debug(
                'Indexable Folders Plugin: file-menu event for folder:',
                file.path
            );

            revertFolderName(plugin, file);

            const numericPrefixRegex = /^(\d+)_/;
            const match = file.name.match(numericPrefixRegex);

            if (!match) {
                console.debug(
                    'Indexable Folders Plugin: folder does not have a numeric prefix, skipping context menu items.'
                );
                return;
            }

            const prefix = match[1];
            const restOfName = file.name.substring(match[0].length);
            const currentNumber = parseInt(prefix, 10);
            const prefixLength = prefix.length;

            // Add "Update index" option
            menu.addItem((item) => {
                item.setTitle('Update index...')
                    .setIcon('edit')
                    .onClick(() => {
                        console.debug(
                            'Indexable Folders Plugin: "Update index" clicked for',
                            file.name
                        );
                        new UpdateIndexModal(
                            plugin.app,
                            file,
                            async (newIndex) => {
                                await updateFolderIndex(plugin, file, newIndex);
                            }
                        ).open();
                    });
            });

            // Add "Move up" option
            menu.addItem((item) => {
                item.setTitle('Move up')
                    .setIcon('arrow-up')
                    .setDisabled(currentNumber <= 0)
                    .onClick(async () => {
                        console.debug(
                            'Indexable Folders Plugin: "Move up" clicked for',
                            file.name
                        );
                        if (currentNumber <= 0) return;
                        if (!file.parent) return;

                        const siblings = file.parent.children
                            .filter(
                                (f): f is TFolder =>
                                    f instanceof TFolder && f !== file
                            )
                            .filter((f) => numericPrefixRegex.test(f.name));

                        const siblingMap = new Map<number, TFolder>();
                        siblings.forEach((sibling) => {
                            const m = sibling.name.match(numericPrefixRegex);
                            if (m) {
                                siblingMap.set(parseInt(m[1], 10), sibling);
                            }
                        });

                        const foldersToRename: { from: TFolder; to: string }[] =
                            [];
                        let currentNumToShift = currentNumber - 1;

                        while (
                            siblingMap.has(currentNumToShift) &&
                            currentNumToShift >= 0
                        ) {
                            const folderToShift =
                                siblingMap.get(currentNumToShift)!;
                            const newNum = currentNumToShift - 1;
                            if (newNum < 0) break; // Boundary hit

                            const rest = folderToShift.name.substring(
                                folderToShift.name.indexOf('_') + 1
                            );
                            const newPrefix = String(newNum).padStart(
                                prefixLength,
                                '0'
                            );
                            foldersToRename.push({
                                from: folderToShift,
                                to: `${newPrefix}_${rest}`,
                            });
                            currentNumToShift--;
                        }

                        // Add the original folder to be renamed
                        const newPrefix = String(currentNumber - 1).padStart(
                            prefixLength,
                            '0'
                        );
                        foldersToRename.push({
                            from: file,
                            to: `${newPrefix}_${restOfName}`,
                        });

                        console.debug(
                            'Indexable Folders Plugin: folders to rename (move up):',
                            foldersToRename.map((r) => ({
                                from: r.from.name,
                                to: r.to,
                            }))
                        );
                        // Rename from lowest index to highest to avoid conflicts
                        for (const rename of foldersToRename.sort(
                            (a, b) =>
                                parseInt(a.to.split('_')[0], 10) -
                                parseInt(b.to.split('_')[0], 10)
                        )) {
                            if (rename.from.parent) {
                                const oldName = rename.from.name;
                                await plugin.app.fileManager.renameFile(
                                    rename.from,
                                    `${rename.from.parent.path}/${rename.to}`
                                );
                                // Show notification for each renamed folder
                                new Notice(
                                    `Folder renamed: "${oldName}" → "${rename.to}"`,
                                    3000
                                );
                            }
                        }
                    });
            });

            // Add "Move down" option
            menu.addItem((item) => {
                const maxNumber = Math.pow(10, prefixLength) - 1;
                item.setTitle('Move down')
                    .setIcon('arrow-down')
                    .setDisabled(currentNumber >= maxNumber)
                    .onClick(async () => {
                        console.debug(
                            'Indexable Folders Plugin: "Move down" clicked for',
                            file.name
                        );
                        if (currentNumber >= maxNumber) return;
                        if (!file.parent) return;

                        const siblings = file.parent.children
                            .filter(
                                (f): f is TFolder =>
                                    f instanceof TFolder && f !== file
                            )
                            .filter((f) => numericPrefixRegex.test(f.name));

                        const siblingMap = new Map<number, TFolder>();
                        siblings.forEach((sibling) => {
                            const m = sibling.name.match(numericPrefixRegex);
                            if (m) {
                                siblingMap.set(parseInt(m[1], 10), sibling);
                            }
                        });

                        const foldersToRename: { from: TFolder; to: string }[] =
                            [];
                        let currentNumToShift = currentNumber + 1;

                        while (
                            siblingMap.has(currentNumToShift) &&
                            currentNumToShift <= maxNumber
                        ) {
                            const folderToShift =
                                siblingMap.get(currentNumToShift)!;
                            const newNum = currentNumToShift + 1;
                            if (newNum > maxNumber) break; // Boundary hit

                            const rest = folderToShift.name.substring(
                                folderToShift.name.indexOf('_') + 1
                            );
                            const newPrefix = String(newNum).padStart(
                                prefixLength,
                                '0'
                            );
                            foldersToRename.push({
                                from: folderToShift,
                                to: `${newPrefix}_${rest}`,
                            });
                            currentNumToShift++;
                        }

                        // Add the original folder to be renamed
                        const newPrefix = String(currentNumber + 1).padStart(
                            prefixLength,
                            '0'
                        );
                        foldersToRename.push({
                            from: file,
                            to: `${newPrefix}_${restOfName}`,
                        });

                        console.debug(
                            'Indexable Folders Plugin: folders to rename (move down):',
                            foldersToRename.map((r) => ({
                                from: r.from.name,
                                to: r.to,
                            }))
                        );
                        // Rename from highest index to lowest to avoid conflicts
                        for (const rename of foldersToRename.sort(
                            (a, b) =>
                                parseInt(b.to.split('_')[0], 10) -
                                parseInt(a.to.split('_')[0], 10)
                        )) {
                            if (rename.from.parent) {
                                const oldName = rename.from.name;
                                await plugin.app.fileManager.renameFile(
                                    rename.from,
                                    `${rename.from.parent.path}/${rename.to}`
                                );
                                // Show notification for each renamed folder
                                new Notice(
                                    `Folder renamed: "${oldName}" → "${rename.to}"`,
                                    3000
                                );
                            }
                        }
                    });
            });
        })
    );
}
