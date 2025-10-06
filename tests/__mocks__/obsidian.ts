/**
 * Mock for Obsidian API
 * This file mocks the core Obsidian classes and types needed for testing
 */

export class Plugin {
    app: any;
    manifest: any;

    constructor(app: any, manifest: any) {
        this.app = app;
        this.manifest = manifest;
    }

    addStatusBarItem(): HTMLElement {
        return document.createElement('div');
    }

    addSettingTab(settingTab: any): void {
        // Mock implementation
    }

    async loadData(): Promise<any> {
        return null;
    }

    async saveData(data: any): Promise<void> {
        // Mock implementation
    }

    registerEvent(eventRef: any): void {
        // Mock implementation
    }

    registerDomEvent(
        el: HTMLElement,
        type: string,
        callback: any,
        options?: any
    ): void {
        // Mock implementation
    }

    registerInterval(id: number): number {
        return id;
    }

    async onload(): Promise<void> {
        // To be implemented by subclass
    }

    onunload(): void {
        // To be implemented by subclass
    }
}

export class TFolder {
    name: string;
    path: string;
    children: any[];

    constructor(name: string, path: string) {
        this.name = name;
        this.path = path;
        this.children = [];
    }
}

export class TFile {
    name: string;
    path: string;
    extension: string;

    constructor(name: string, path: string) {
        this.name = name;
        this.path = path;
        this.extension = 'md';
    }
}

export class PluginSettingTab {
    app: any;
    plugin: any;
    containerEl: HTMLElement;

    constructor(app: any, plugin: any) {
        this.app = app;
        this.plugin = plugin;
        this.containerEl = document.createElement('div');
    }

    display(): void {
        // To be implemented by subclass
    }

    hide(): void {
        // Mock implementation
    }
}

export class Setting {
    settingEl: HTMLElement;

    constructor(containerEl: HTMLElement) {
        this.settingEl = document.createElement('div');
        containerEl.appendChild(this.settingEl);
    }

    setName(name: string): this {
        return this;
    }

    setDesc(desc: string): this {
        return this;
    }

    setHeading(): this {
        return this;
    }

    addText(cb: (text: any) => void): this {
        const textComponent = {
            setValue: (value: string) => textComponent,
            setPlaceholder: (placeholder: string) => textComponent,
            onChange: (cb: (value: string) => void) => textComponent,
        };
        cb(textComponent);
        return this;
    }

    addToggle(cb: (toggle: any) => void): this {
        const toggleComponent = {
            setValue: (value: boolean) => toggleComponent,
            onChange: (cb: (value: boolean) => void) => toggleComponent,
        };
        cb(toggleComponent);
        return this;
    }

    addDropdown(cb: (dropdown: any) => void): this {
        const dropdownComponent = {
            addOption: (value: string, display: string) => dropdownComponent,
            setValue: (value: string) => dropdownComponent,
            onChange: (cb: (value: string) => void) => dropdownComponent,
        };
        cb(dropdownComponent);
        return this;
    }
}

export class Notice {
    constructor(message: string, timeout?: number) {
        // Mock implementation
    }
}

export class Modal {
    app: any;
    containerEl: HTMLElement;
    titleEl: HTMLElement;
    contentEl: HTMLElement;

    constructor(app: any) {
        this.app = app;
        this.containerEl = document.createElement('div');
        this.titleEl = document.createElement('div');
        this.contentEl = document.createElement('div');
    }

    open(): void {
        // Mock implementation
    }

    close(): void {
        // Mock implementation
    }

    onOpen(): void {
        // To be implemented by subclass
    }

    onClose(): void {
        // To be implemented by subclass
    }
}

/**
 * Extend HTMLElement prototype with Obsidian's helper methods
 * These are used in the actual plugin code but don't exist in standard DOM
 */
declare global {
    interface HTMLElement {
        setText(text: string): HTMLElement;
        addClass(...classNames: string[]): HTMLElement;
        removeClass(...classNames: string[]): HTMLElement;
        toggleClass(className: string, force?: boolean): HTMLElement;
    }
}

HTMLElement.prototype.setText = function (text: string): HTMLElement {
    this.textContent = text;
    return this;
};

HTMLElement.prototype.addClass = function (
    ...classNames: string[]
): HTMLElement {
    this.classList.add(...classNames);
    return this;
};

HTMLElement.prototype.removeClass = function (
    ...classNames: string[]
): HTMLElement {
    this.classList.remove(...classNames);
    return this;
};

HTMLElement.prototype.toggleClass = function (
    className: string,
    force?: boolean
): HTMLElement {
    this.classList.toggle(className, force);
    return this;
};
