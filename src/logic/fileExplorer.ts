import { TFolder } from 'obsidian';
import IndexableFoldersPlugin from 'src/main';
import { log } from 'src/utils/logger';

/**
 * Handles rename state changes for folder elements
 */
function handleRenameStateChanges(
    plugin: IndexableFoldersPlugin,
    mutations: MutationRecord[]
) {
    mutations.forEach((mutation) => {
        if (
            mutation.type === 'attributes' &&
            mutation.attributeName === 'class'
        ) {
            const target = mutation.target as HTMLElement;

            // Check if this is a nav-folder-title element
            if (!target.classList.contains('nav-folder-title')) {
                return;
            }

            // Get the folder path from the closest folder container
            const folderContainer = target.closest('[data-path]');
            if (!folderContainer) {
                return;
            }

            const dataPath = folderContainer.getAttribute('data-path');
            if (!dataPath) {
                return;
            }

            const isBeingRenamed =
                target.classList.contains('is-being-renamed');
            const wasBeingRenamed = (mutation.oldValue || '').includes(
                'is-being-renamed'
            );

            log(
                plugin.settings.debugEnabled,
                `Rename state change for ${dataPath}: isBeingRenamed=${isBeingRenamed}, wasBeingRenamed=${wasBeingRenamed}`
            );

            if (isBeingRenamed && !wasBeingRenamed) {
                // Folder entered rename mode - revert to original name
                log(
                    plugin.settings.debugEnabled,
                    `Folder ${dataPath} entered rename mode`
                );

                const folder = plugin.app.vault.getAbstractFileByPath(dataPath);
                if (folder instanceof TFolder) {
                    // Only revert if this folder has a numeric prefix
                    const numericPrefixRegex = plugin.getNumericPrefixRegex();
                    if (folder.name.match(numericPrefixRegex)) {
                        revertFolderName(plugin, folder);
                    }
                }
            } else if (!isBeingRenamed && wasBeingRenamed) {
                // Folder exited rename mode - re-apply styling
                log(
                    plugin.settings.debugEnabled,
                    `Folder ${dataPath} exited rename mode`
                );

                // Use a small delay to ensure the rename operation is complete
                setTimeout(() => {
                    plugin.prefixNumericFolders(true);
                }, 100);
            }
        }
    });
}

export function startFolderObserver(plugin: IndexableFoldersPlugin) {
    log(plugin.settings.debugEnabled, 'starting folder observer');
    const fileExplorer = plugin.app.workspace.containerEl.querySelector(
        '.nav-files-container'
    );

    if (!fileExplorer) {
        log(
            plugin.settings.debugEnabled,
            'file explorer not found, retrying...'
        );
        setTimeout(() => startFolderObserver(plugin), 500);
        return;
    }
    log(
        plugin.settings.debugEnabled,
        'file explorer pane found, adding indexable folder actions'
    );

    plugin.folderObserver = new MutationObserver((mutations) => {
        // Handle rename state changes first
        handleRenameStateChanges(plugin, mutations);

        if (plugin.ignoreMutationsWhileMenuOpen) {
            log(
                plugin.settings.debugEnabled,
                'mutation ignored due to context menu'
            );
            return;
        }
        log(plugin.settings.debugEnabled, 'mutation observed', mutations);

        // Then handle regular mutations
        plugin.handleMutations(mutations);
    });

    plugin.folderObserver.observe(fileExplorer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class'],
        attributeOldValue: true,
    });

    // Initial run
    log(plugin.settings.debugEnabled, 'initial run of prefixNumericFolders');
    plugin.prefixNumericFolders();
}

export function prefixNumericFolders(
    plugin: IndexableFoldersPlugin,
    forceRefresh = false
) {
    log(plugin.settings.debugEnabled, 'running prefixNumericFolders', {
        forceRefresh,
    });
    const fileExplorer = plugin.app.workspace.containerEl.querySelector(
        '.nav-files-container'
    );
    if (!fileExplorer) return;

    const prefixRegex = plugin.getPrefixRegex();

    const folderTitleElements = fileExplorer.querySelectorAll(
        '.nav-folder-title-content'
    );

    // Batch DOM updates to prevent layout thrashing
    const updates: Array<{
        element: HTMLElement;
        folderName: string;
        numericPrefix: string;
        newFolderName: string;
    }> = [];

    // First pass: collect all changes without DOM manipulation
    folderTitleElements.forEach((el: HTMLElement) => {
        const existingPrefixSpan = el.querySelector(
            'span.indexable-folder-prefix'
        );

        // If forcing refresh, restore original name first
        if (forceRefresh && existingPrefixSpan) {
            const originalName =
                existingPrefixSpan.getAttribute('data-original-name');
            if (originalName) {
                el.textContent = originalName;
            }
        } else if (existingPrefixSpan) {
            // If our prefix span already exists and not forcing refresh, skip this element.
            return;
        }

        const folderName = el.textContent;
        const match = folderName?.match(prefixRegex);

        if (match && folderName) {
            log(
                plugin.settings.debugEnabled,
                'found matching folder:',
                folderName
            );
            const numericPrefix = match[1];
            const newFolderName = folderName.substring(match[0].length);

            updates.push({
                element: el,
                folderName,
                numericPrefix,
                newFolderName,
            });
        }
    });

    // Second pass: apply all DOM updates in a single batch
    if (updates.length > 0) {
        // Use DocumentFragment for efficient DOM manipulation
        updates.forEach(
            ({ element, folderName, numericPrefix, newFolderName }) => {
                // Clear the original text content before adding new elements.
                element.textContent = '';

                // Create elements in memory first
                const fragment = document.createDocumentFragment();

                const label = document.createElement('span');
                label.setText(numericPrefix);
                label.addClass('indexable-folder-prefix');
                // Store original name to revert for rename
                label.setAttribute('data-original-name', folderName);

                fragment.appendChild(label);
                fragment.appendChild(document.createTextNode(newFolderName));

                // Single DOM operation per element
                element.appendChild(fragment);
            }
        );

        log(
            plugin.settings.debugEnabled,
            `Batch updated ${updates.length} folder prefixes`
        );
    }
}

export function revertFolderName(
    plugin: IndexableFoldersPlugin,
    file: TFolder
) {
    log(plugin.settings.debugEnabled, 'reverting folder name for', file.path);
    const fileExplorer = plugin.app.workspace.containerEl.querySelector(
        '.nav-files-container'
    );
    if (!fileExplorer) return;

    const folderEl = fileExplorer.querySelector(`[data-path="${file.path}"]`);
    if (!folderEl) return;

    const folderTitleEl = folderEl.querySelector('.nav-folder-title-content');
    if (folderTitleEl) {
        const prefixSpan = folderTitleEl.querySelector(
            'span.indexable-folder-prefix'
        );
        if (prefixSpan) {
            const originalName = prefixSpan.getAttribute('data-original-name');
            if (originalName) {
                log(plugin.settings.debugEnabled, 'reverting to', originalName);
                folderTitleEl.textContent = originalName;
            }
        }
    }
}
