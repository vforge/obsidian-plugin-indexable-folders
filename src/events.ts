import { Menu, TFolder } from 'obsidian';
import IndexableFoldersPlugin from './main';
import { revertFolderName, startFolderObserver } from './logic/fileExplorer';
import { updateStatusBar } from './logic/statusBar';
import { UpdateIndexModal } from './ui/UpdateIndexModal';
import { updateFolderIndex, isSpecialIndex } from './logic/folderActions';

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

            const numericPrefixRegex = plugin.getNumericPrefixRegex();
            const match = file.name.match(numericPrefixRegex);

            if (!match) {
                console.debug(
                    'Indexable Folders Plugin: folder does not have a numeric prefix, skipping context menu items.'
                );
                return;
            }

            const prefix = match[1];
            const currentNumber = parseInt(prefix, 10);
            const prefixLength = prefix.length;

            // Check if this is a special index folder (all 0s or all 9s)
            const isSpecialFolder = isSpecialIndex(currentNumber);

            // Add "Update index" option
            menu.addItem((item) => {
                item.setTitle('Update index...')
                    .setIcon('edit')
                    .setDisabled(isSpecialFolder)
                    .onClick(() => {
                        console.debug(
                            'Indexable Folders Plugin: "Update index" clicked for',
                            file.name
                        );
                        new UpdateIndexModal(
                            plugin.app,
                            plugin,
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
                    .setDisabled(currentNumber <= 0 || isSpecialFolder)
                    .onClick(async () => {
                        console.debug(
                            'Indexable Folders Plugin: "Move up" clicked for',
                            file.name
                        );
                        if (currentNumber <= 0 || isSpecialFolder) return;

                        await updateFolderIndex(
                            plugin,
                            file,
                            currentNumber - 1
                        );
                    });
            });

            // Add "Move down" option
            menu.addItem((item) => {
                const maxNumber = Math.pow(10, prefixLength) - 1;
                item.setTitle('Move down')
                    .setIcon('arrow-down')
                    .setDisabled(currentNumber >= maxNumber || isSpecialFolder)
                    .onClick(async () => {
                        console.debug(
                            'Indexable Folders Plugin: "Move down" clicked for',
                            file.name
                        );
                        if (currentNumber >= maxNumber || isSpecialFolder)
                            return;

                        await updateFolderIndex(
                            plugin,
                            file,
                            currentNumber + 1
                        );
                    });
            });
        })
    );
}
