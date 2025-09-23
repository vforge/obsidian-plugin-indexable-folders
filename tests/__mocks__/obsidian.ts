// Mock Obsidian API for testing
export class TFile {
    name: string;
    path: string;
    parent: TFolder | null;

    constructor(name: string, path: string, parent: TFolder | null = null) {
        this.name = name;
        this.path = path;
        this.parent = parent;
    }
}

export class TFolder {
    name: string;
    path: string;
    parent: TFolder | null;
    children: (TFile | TFolder)[];

    constructor(name: string, path: string, parent: TFolder | null = null) {
        this.name = name;
        this.path = path;
        this.parent = parent;
        this.children = [];
    }

    isRoot(): boolean {
        return this.parent === null;
    }
}

export class Vault {
    private folders: Map<string, TFolder> = new Map();
    private files: Map<string, TFile> = new Map();

    createFolder(path: string): Promise<TFolder> {
        const pathParts = path.split('/');
        let currentPath = '';
        let parent: TFolder | null = null;

        for (const part of pathParts) {
            if (!part) continue;

            currentPath = currentPath ? `${currentPath}/${part}` : part;

            if (!this.folders.has(currentPath)) {
                const folder = new TFolder(part, currentPath, parent);
                this.folders.set(currentPath, folder);
                if (parent) {
                    parent.children.push(folder);
                }
            }

            parent = this.folders.get(currentPath)!;
        }

        return Promise.resolve(parent!);
    }

    createFile(path: string, data = ''): Promise<TFile> {
        const pathParts = path.split('/');
        const fileName = pathParts.pop()!;
        const folderPath = pathParts.join('/');

        let parent: TFolder | null = null;
        if (folderPath) {
            parent = this.folders.get(folderPath) || null;
        }

        const file = new TFile(fileName, path, parent);
        this.files.set(path, file);

        if (parent) {
            parent.children.push(file);
        }

        return Promise.resolve(file);
    }

    getAbstractFileByPath(path: string): TFile | TFolder | null {
        return this.folders.get(path) || this.files.get(path) || null;
    }

    rename(file: TFile | TFolder, newPath: string): Promise<void> {
        if (file instanceof TFolder) {
            this.folders.delete(file.path);
            file.path = newPath;
            file.name = newPath.split('/').pop()!;
            this.folders.set(newPath, file);
        } else {
            this.files.delete(file.path);
            file.path = newPath;
            file.name = newPath.split('/').pop()!;
            this.files.set(newPath, file);
        }
        return Promise.resolve();
    }

    getAllLoadedFiles(): (TFile | TFolder)[] {
        return [...this.folders.values(), ...this.files.values()];
    }
}

export class Workspace {
    containerEl: HTMLElement;
    activeFile: TFile | null = null;

    constructor() {
        this.containerEl = document.createElement('div');
        this.containerEl.innerHTML = `
            <div class="nav-files-container">
                <div class="tree-item nav-folder">
                    <div class="tree-item-self nav-folder-title">
                        <div class="nav-folder-title-content">01_Projects</div>
                    </div>
                </div>
                <div class="tree-item nav-folder">
                    <div class="tree-item-self nav-folder-title">
                        <div class="nav-folder-title-content">02_Resources</div>
                    </div>
                </div>
            </div>
        `;
    }

    getActiveFile(): TFile | null {
        return this.activeFile;
    }

    setActiveFile(file: TFile | null) {
        this.activeFile = file;
    }
}

export class App {
    vault: Vault;
    workspace: Workspace;
    metadataCache: any;

    constructor() {
        this.vault = new Vault();
        this.workspace = new Workspace();
        this.metadataCache = {
            on: vi.fn(),
            off: vi.fn(),
        };
    }
}

export class Plugin {
    app: App;
    manifest: any;
    settings: any;

    constructor(app: App, manifest: any) {
        this.app = app;
        this.manifest = manifest;
    }

    async loadData(): Promise<any> {
        return {};
    }

    async saveData(data: any): Promise<void> {
        return Promise.resolve();
    }

    addStatusBarItem(): HTMLElement {
        return document.createElement('div');
    }

    addSettingTab(settingTab: any): void {
        // Mock implementation
    }

    async onload(): Promise<void> {
        // Override in implementation
    }

    onunload(): void {
        // Override in implementation
    }
}

export class PluginSettingTab {
    app: App;
    plugin: Plugin;
    containerEl: HTMLElement;

    constructor(app: App, plugin: Plugin) {
        this.app = app;
        this.plugin = plugin;
        this.containerEl = document.createElement('div');
    }

    display(): void {
        // Override in implementation
    }
}

export class Setting {
    settingEl: HTMLElement;

    constructor(containerEl: HTMLElement) {
        this.settingEl = document.createElement('div');
        containerEl.appendChild(this.settingEl);
    }

    setName(name: string): Setting {
        return this;
    }

    setDesc(desc: string): Setting {
        return this;
    }

    addText(cb: (text: any) => void): Setting {
        const textComponent = {
            setValue: vi.fn(),
            onChange: vi.fn(),
        };
        cb(textComponent);
        return this;
    }
}

export class Modal {
    app: App;
    titleEl: HTMLElement;
    contentEl: HTMLElement;

    constructor(app: App) {
        this.app = app;
        this.titleEl = document.createElement('div');
        this.contentEl = document.createElement('div');
    }

    open(): void {
        // Mock implementation
    }

    close(): void {
        // Mock implementation
    }
}

// Export for vitest usage
export const mockVi = {
    fn: () => ({
        mockReturnValue: () => ({}),
        mockImplementation: () => ({}),
    }),
};
