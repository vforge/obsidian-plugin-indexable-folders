import { TFolder } from 'obsidian';
import IndexableFoldersPlugin from '../main';

export function startFolderObserver(plugin: IndexableFoldersPlugin) {
    console.log('Indexable Folders Plugin: starting folder observer');
    const fileExplorer = plugin.app.workspace.containerEl.querySelector('.nav-files-container');

    if (!fileExplorer) {
        console.log('Indexable Folders Plugin: file explorer not found, retrying...');
        setTimeout(() => startFolderObserver(plugin), 500);
        return;
    }
    console.log('Indexable Folders Plugin: file explorer found');

    plugin.folderObserver = new MutationObserver(() => {
        console.log('Indexable Folders Plugin: mutation observed');
        plugin.prefixNumericFolders();
    });

    plugin.folderObserver.observe(fileExplorer, {
        childList: true,
        subtree: true
    });

    // Initial run
    console.log('Indexable Folders Plugin: initial run of prefixNumericFolders');
    plugin.prefixNumericFolders();
}

export function prefixNumericFolders(plugin: IndexableFoldersPlugin) {
    console.log('Indexable Folders Plugin: running prefixNumericFolders');
    const fileExplorer = plugin.app.workspace.containerEl.querySelector('.nav-files-container');
    if (!fileExplorer) return;

    const prefixRegex = plugin.getPrefixRegex();

    const folderTitleElements = fileExplorer.querySelectorAll('.nav-folder-title-content');
    folderTitleElements.forEach((el: HTMLElement) => {
        // If our prefix span already exists, skip this element.
        if (el.querySelector('span.indexable-folder-prefix')) {
            return;
        }

        const folderName = el.textContent;
        const match = folderName?.match(prefixRegex);

        if (match) {
            console.log(`Indexable Folders Plugin: found matching folder: ${folderName}`);
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

export function revertFolderName(plugin: IndexableFoldersPlugin, file: TFolder) {
    console.log(`Indexable Folders Plugin: reverting folder name for ${file.path}`);
    const fileExplorer = plugin.app.workspace.containerEl.querySelector('.nav-files-container');
    if (!fileExplorer) return;

    const folderEl = fileExplorer.querySelector(`[data-path="${file.path}"]`);
    if (!folderEl) return;

    const folderTitleEl = folderEl.querySelector('.nav-folder-title-content');
    if (folderTitleEl) {
        const prefixSpan = folderTitleEl.querySelector('span.indexable-folder-prefix');
        if (prefixSpan) {
            const originalName = prefixSpan.getAttribute('data-original-name');
            if (originalName) {
                console.log(`Indexable Folders Plugin: reverting to ${originalName}`);
                folderTitleEl.textContent = originalName;
            }
        }
    }
}
