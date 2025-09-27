import { TFolder } from 'obsidian';
import IndexableFoldersPlugin from '../main';
import { log } from '../utils/logger';

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
        if (plugin.ignoreMutationsWhileMenuOpen) {
            log(
                plugin.settings.debugEnabled,
                'mutation ignored due to context menu'
            );
            return;
        }
        log(plugin.settings.debugEnabled, 'mutation observed', mutations);
        plugin.handleMutations(mutations);
    });

    plugin.folderObserver.observe(fileExplorer, {
        childList: true,
        subtree: true,
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

            // Clear the original text content before adding new elements.
            el.textContent = '';

            const label = el.createEl('span');
            label.setText(numericPrefix);
            label.addClass('indexable-folder-prefix');
            // Store original name to revert for rename
            label.setAttribute('data-original-name', folderName);

            el.appendChild(label);
            el.appendChild(document.createTextNode(newFolderName));
        }
    });
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
