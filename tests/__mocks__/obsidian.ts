/**
 * Mock for Obsidian API
 * This file mocks the core Obsidian classes and types needed for testing.
 *
 * Other shared mocks are also available in this directory:
 * - logger.ts: Mock for the logger utility
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
    parent: TFolder | null;

    constructor(name: string = '', path: string = '') {
        this.name = name;
        this.path = path;
        this.children = [];
        this.parent = null;
    }

    isRoot(): boolean {
        // A folder is root if its path is '/' or if it's explicitly marked as root
        return this.path === '/' || this.name === '';
    }
}

export class TFile {
    name: string;
    path: string;
    extension: string;
    parent: TFolder | null;

    constructor(name: string = '', path: string = '') {
        this.name = name;
        this.path = path;
        this.extension = 'md';
        this.parent = null;
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
        empty(): HTMLElement;
        createEl<K extends keyof HTMLElementTagNameMap>(
            tag: K,
            o?: string | DomElementInfo,
            callback?: (el: HTMLElementTagNameMap[K]) => void
        ): HTMLElementTagNameMap[K];
        createDiv(
            o?: string | DomElementInfo,
            callback?: (el: HTMLDivElement) => void
        ): HTMLDivElement;
        createSpan(
            o?: string | DomElementInfo,
            callback?: (el: HTMLSpanElement) => void
        ): HTMLSpanElement;
    }

    interface DocumentFragment {
        createEl<K extends keyof HTMLElementTagNameMap>(
            tag: K,
            o?: string | DomElementInfo,
            callback?: (el: HTMLElementTagNameMap[K]) => void
        ): HTMLElementTagNameMap[K];
        append(...nodes: (Node | string)[]): void;
    }
}

interface DomElementInfo {
    text?: string;
    cls?: string | string[];
    attr?: Record<string, string>;
    title?: string;
    href?: string;
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

HTMLElement.prototype.empty = function (): HTMLElement {
    this.innerHTML = '';
    return this;
};

HTMLElement.prototype.createEl = function <
    K extends keyof HTMLElementTagNameMap,
>(
    tag: K,
    o?: string | DomElementInfo,
    callback?: (el: HTMLElementTagNameMap[K]) => void
): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);

    if (o) {
        if (typeof o === 'string') {
            el.textContent = o;
        } else {
            if (o.text) el.textContent = o.text;
            if (o.cls) {
                const classes = Array.isArray(o.cls) ? o.cls : [o.cls];
                el.classList.add(...classes);
            }
            if (o.attr) {
                Object.entries(o.attr).forEach(([key, value]) => {
                    el.setAttribute(key, value);
                });
            }
            if (o.title) el.title = o.title;
            if (o.href && el instanceof HTMLAnchorElement) el.href = o.href;
        }
    }

    this.appendChild(el);

    if (callback) {
        callback(el);
    }

    return el;
};

HTMLElement.prototype.createDiv = function (
    o?: string | DomElementInfo,
    callback?: (el: HTMLDivElement) => void
): HTMLDivElement {
    return this.createEl('div', o, callback);
};

HTMLElement.prototype.createSpan = function (
    o?: string | DomElementInfo,
    callback?: (el: HTMLSpanElement) => void
): HTMLSpanElement {
    return this.createEl('span', o, callback);
};

// Add Obsidian helpers to DocumentFragment as well
DocumentFragment.prototype.createEl = function <
    K extends keyof HTMLElementTagNameMap,
>(
    tag: K,
    o?: string | DomElementInfo,
    callback?: (el: HTMLElementTagNameMap[K]) => void
): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);

    if (o) {
        if (typeof o === 'string') {
            el.textContent = o;
        } else {
            if (o.text) el.textContent = o.text;
            if (o.cls) {
                const classes = Array.isArray(o.cls) ? o.cls : [o.cls];
                el.classList.add(...classes);
            }
            if (o.attr) {
                Object.entries(o.attr).forEach(([key, value]) => {
                    el.setAttribute(key, value);
                });
            }
            if (o.title) el.title = o.title;
            if (o.href && el instanceof HTMLAnchorElement) el.href = o.href;
        }
    }

    this.appendChild(el);

    if (callback) {
        callback(el);
    }

    return el;
};
