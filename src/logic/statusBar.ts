import { TFolder } from 'obsidian';
import IndexableFoldersPlugin from '../main';

export function updateStatusBar(plugin: IndexableFoldersPlugin): void {
	plugin.statusBarItemEl.empty();
	const activeFile = plugin.app.workspace.getActiveFile();
	console.debug(
		'Indexable Folders Plugin: updating status bar for file:',
		activeFile?.path
	);

	if (!activeFile || !activeFile.parent) {
		return;
	}

	const prefixRegex = plugin.getPrefixRegex();
	const pathParts: DocumentFragment[] = [];

	let currentFolder: TFolder | null = activeFile.parent;
	while (currentFolder && !currentFolder.isRoot()) {
		const folderName = currentFolder.name;
		const match = folderName.match(prefixRegex);

		const fragment = document.createDocumentFragment();

		if (match) {
			const prefix = match[1];
			const nameWithoutPrefix = folderName.substring(match[0].length);

			const label = fragment.createEl('span');
			label.setText(prefix);
			label.addClass('indexable-folder-prefix');
			fragment.append(label);
			fragment.append(document.createTextNode(` ${nameWithoutPrefix}`));
		} else {
			fragment.append(document.createTextNode(folderName));
		}

		pathParts.unshift(fragment);
		currentFolder = currentFolder.parent;
	}

	console.debug('Indexable Folders Plugin: status bar path parts:', pathParts);
	pathParts.forEach((part, index) => {
		plugin.statusBarItemEl.appendChild(part);
		if (index < pathParts.length - 1) {
			plugin.statusBarItemEl.createEl('span', {
				text: plugin.settings.statusBarSeparator,
				cls: 'indexable-folder-path-separator',
			});
		}
	});
	console.log(
		`Status bar updated: ${this.indexedFoldersCount} indexed folders`
	);
}
