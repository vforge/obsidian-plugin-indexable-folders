import { Menu, TFolder } from 'obsidian';
import IndexableFoldersPlugin from './main';
import { startFolderObserver } from './logic/fileExplorer';
import { updateStatusBar } from './logic/statusBar';
import { UpdateIndexModal } from './ui/UpdateIndexModal';
import { updateFolderIndex, isSpecialIndex } from './logic/folderActions';
import { log } from './utils/logger';

export function registerEvents(plugin: IndexableFoldersPlugin) {
    plugin.app.workspace.onLayoutReady(() => {
        startFolderObserver(plugin);
        updateStatusBar(plugin);
    });

    plugin.registerEvent(
        plugin.app.workspace.on('file-open', (file) => {
            log(
                plugin.settings.debugEnabled,
                'file-open event for',
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
            log(
                plugin.settings.debugEnabled,
                'file-menu event for folder:',
                file.path
            );

            // Ignore mutations while context menu is open
            plugin.ignoreMutationsWhileMenuOpen = true;

            // TODO: Do we even need it?
            /*
            // Find folder DOM element
            const fileExplorer = plugin.app.workspace.containerEl.querySelector(
                '.nav-files-container'
            );
            let folderEl: HTMLElement | null = null;
            if (fileExplorer) {
                folderEl = fileExplorer.querySelector(
                    `[data-path="${file.path}"]`
                );
            }

            // Handler to re-enable mutations and re-apply styling
            const reenableMutations = () => {
                plugin.ignoreMutationsWhileMenuOpen = false;
                log(
                    plugin.settings.debugEnabled,
                    'ignoreMutationsWhileMenuOpen = false (focusout or menu hide)'
                );

                // Re-apply styling when menu is dismissed
                // Use setTimeout to ensure menu is fully closed before re-styling
                setTimeout(() => {
                    plugin.prefixNumericFolders(true);
                }, 50);
            };

            // Listen for folder losing focus
            if (folderEl) {
                folderEl.addEventListener('focusout', reenableMutations);
            }

            // Resume mutations when menu closes and clean up focusout listener
            menu.onHide(() => {
                reenableMutations();
                if (folderEl) {
                    folderEl.removeEventListener('focusout', reenableMutations);
                }
            });

            // Revert folder name to show original name in context menu
            revertFolderName(plugin, file);
            */

            const numericPrefixRegex = plugin.getNumericPrefixRegex();
            const match = file.name.match(numericPrefixRegex);

            if (!match) {
                log(
                    plugin.settings.debugEnabled,
                    'folder does not have a numeric prefix, skipping context menu items'
                );
                return;
            }

            const prefix = match[1];
            const currentNumber = parseInt(prefix, 10);
            const prefixLength = prefix.length;

            // Check if this is a special index folder (all 0s or all 9s)
            const isSpecialFolder = isSpecialIndex(prefix);

            // Add "Update index" option
            menu.addItem((item) => {
                item.setTitle('Update index...')
                    .setIcon('edit')
                    .setDisabled(isSpecialFolder)
                    .onClick(() => {
                        log(
                            plugin.settings.debugEnabled,
                            '"Update index" clicked for',
                            file.name
                        );
                        new UpdateIndexModal(
                            plugin.app,
                            plugin,
                            file,
                            async (newIndex) => {
                                await updateFolderIndex(plugin, file, newIndex);
                                plugin.prefixNumericFolders(true);
                            }
                        ).open();
                    });
            });

            // Add "Move up" option
            // NOTE: Testing the onClick handler execution is complex due to module mocking
            // limitations. The handler logic is validated through manual testing and guard
            // clause tests that verify boundary conditions.
            menu.addItem((item) => {
                item.setTitle('Move up')
                    .setIcon('arrow-up')
                    .setDisabled(currentNumber <= 0 || isSpecialFolder)
                    .onClick(async () => {
                        log(
                            plugin.settings.debugEnabled,
                            '"Move up" clicked for',
                            file.name
                        );
                        if (currentNumber <= 0 || isSpecialFolder) return;

                        await updateFolderIndex(
                            plugin,
                            file,
                            currentNumber - 1
                        );
                        plugin.prefixNumericFolders(true);
                    });
            });

            // Add "Move down" option
            // NOTE: Testing the onClick handler execution is complex due to module mocking
            // limitations. The handler logic is validated through manual testing and guard
            // clause tests that verify boundary conditions.
            menu.addItem((item) => {
                const maxNumber = Math.pow(10, prefixLength) - 1;
                item.setTitle('Move down')
                    .setIcon('arrow-down')
                    .setDisabled(currentNumber >= maxNumber || isSpecialFolder)
                    .onClick(async () => {
                        log(
                            plugin.settings.debugEnabled,
                            '"Move down" clicked for',
                            file.name
                        );
                        if (currentNumber >= maxNumber || isSpecialFolder)
                            return;

                        await updateFolderIndex(
                            plugin,
                            file,
                            currentNumber + 1
                        );
                        plugin.prefixNumericFolders(true);
                    });
            });
        })
    );
}
