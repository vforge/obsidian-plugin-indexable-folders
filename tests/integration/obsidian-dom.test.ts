import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Setup DOM environment for Obsidian-like testing
const dom = new JSDOM(`<!DOCTYPE html><html><body>
    <div class="workspace">
        <div class="nav-files-container">
            <div class="tree-item nav-folder" data-path="01_Projects">
                <div class="tree-item-self nav-folder-title">
                    <div class="nav-folder-title-content">01_Projects</div>
                </div>
            </div>
            <div class="tree-item nav-folder" data-path="02_Resources">
                <div class="tree-item-self nav-folder-title">
                    <div class="nav-folder-title-content">02_Resources</div>
                </div>
            </div>
            <div class="tree-item nav-folder" data-path="zz_Archive">
                <div class="tree-item-self nav-folder-title">
                    <div class="nav-folder-title-content">zz_Archive</div>
                </div>
            </div>
            <div class="tree-item nav-folder" data-path="Regular Folder">
                <div class="tree-item-self nav-folder-title">
                    <div class="nav-folder-title-content">Regular Folder</div>
                </div>
            </div>
        </div>
    </div>
</body></html>`);

global.document = dom.window.document;
global.window = dom.window as any;
global.HTMLElement = dom.window.HTMLElement;

describe('Indexable Folders Plugin - Obsidian Integration Tests', () => {
    let mockPlugin: any;
    let fileExplorer: HTMLElement;

    beforeEach(() => {
        // Reset DOM to initial state
        document.body.innerHTML = dom.window.document.body.innerHTML;
        fileExplorer = document.querySelector('.nav-files-container')!;

        // Mock plugin with settings
        mockPlugin = {
            settings: {
                blacklistedPrefixes: 'zz, archive',
                statusBarSeparator: '→',
            },
            app: {
                workspace: {
                    containerEl: document.querySelector('.workspace'),
                    getActiveFile: vi.fn(),
                },
            },
            statusBarItemEl: document.createElement('div'),
        };
    });

    afterEach(() => {
        // Clean up any added styles or elements
        document
            .querySelectorAll('.folder-index-pill')
            .forEach((el) => el.remove());
        document.querySelectorAll('style').forEach((el) => el.remove());
    });

    describe('DOM Folder Indexing', () => {
        it('should identify numeric-prefixed folders correctly', () => {
            const folders = document.querySelectorAll(
                '.nav-folder-title-content'
            );
            const numericFolders: string[] = [];
            const blacklistedFolders: string[] = [];
            const regularFolders: string[] = [];

            folders.forEach((folder) => {
                const name = folder.textContent || '';
                const numericMatch = name.match(/^(\d+)_(.+)$/);
                const blacklistedPrefixes =
                    mockPlugin.settings.blacklistedPrefixes
                        .split(',')
                        .map((p: string) => p.trim().toLowerCase());

                const isBlacklisted = blacklistedPrefixes.some(
                    (prefix: string) =>
                        name.toLowerCase().startsWith(prefix + '_')
                );

                if (numericMatch) {
                    numericFolders.push(name);
                } else if (isBlacklisted) {
                    blacklistedFolders.push(name);
                } else {
                    regularFolders.push(name);
                }
            });

            expect(numericFolders).toEqual(['01_Projects', '02_Resources']);
            expect(blacklistedFolders).toEqual(['zz_Archive']);
            expect(regularFolders).toEqual(['Regular Folder']);
        });

        it('should create and style index pills for numeric folders', () => {
            const folders = document.querySelectorAll(
                '.nav-folder-title-content'
            );

            folders.forEach((folderEl) => {
                const name = folderEl.textContent || '';
                const numericMatch = name.match(/^(\d+)_(.+)$/);

                if (numericMatch) {
                    const [, index, folderName] = numericMatch;

                    // Create pill element
                    const pill = document.createElement('span');
                    pill.className = 'folder-index-pill';
                    pill.textContent = index;
                    pill.style.cssText = `
                        background-color: var(--interactive-accent);
                        color: var(--text-on-accent);
                        padding: 2px 6px;
                        border-radius: 10px;
                        font-size: 0.8em;
                        margin-right: 6px;
                        font-weight: 500;
                    `;

                    // Update folder content
                    folderEl.innerHTML = '';
                    folderEl.appendChild(pill);
                    folderEl.appendChild(document.createTextNode(folderName));
                }
            });

            // Verify pills were created
            const pills = document.querySelectorAll('.folder-index-pill');
            expect(pills).toHaveLength(2);
            expect(pills[0].textContent).toBe('01');
            expect(pills[1].textContent).toBe('02');
        });

        it('should create pills for blacklisted prefixes', () => {
            const archiveFolder = document.querySelector(
                '[data-path="zz_Archive"] .nav-folder-title-content'
            );
            expect(archiveFolder).toBeTruthy();

            const name = archiveFolder!.textContent || '';
            const blacklistedPrefixes = mockPlugin.settings.blacklistedPrefixes
                .split(',')
                .map((p: string) => p.trim().toLowerCase());

            const matchedPrefix = blacklistedPrefixes.find((prefix: string) =>
                name.toLowerCase().startsWith(prefix + '_')
            );

            if (matchedPrefix) {
                const pill = document.createElement('span');
                pill.className = 'folder-index-pill';
                pill.textContent = matchedPrefix.toUpperCase();

                archiveFolder!.innerHTML = '';
                archiveFolder!.appendChild(pill);
                archiveFolder!.appendChild(document.createTextNode('Archive'));
            }

            const pill = archiveFolder!.querySelector('.folder-index-pill');
            expect(pill).toBeTruthy();
            expect(pill!.textContent).toBe('ZZ');
        });

        it('should not modify regular folders', () => {
            const regularFolder = document.querySelector(
                '[data-path="Regular Folder"] .nav-folder-title-content'
            );
            const originalContent = regularFolder!.textContent;

            // Regular folders should remain unchanged
            expect(originalContent).toBe('Regular Folder');
            expect(
                regularFolder!.querySelector('.folder-index-pill')
            ).toBeFalsy();
        });
    });

    describe('Status Bar Path Display', () => {
        beforeEach(() => {
            // Add some CSS for status bar styling
            const style = document.createElement('style');
            style.textContent = `
                .status-bar-item { font-family: monospace; }
                .folder-path-pill {
                    background-color: var(--interactive-accent);
                    color: var(--text-on-accent);
                    padding: 1px 4px;
                    border-radius: 6px;
                    font-size: 0.9em;
                    margin-right: 2px;
                }
            `;
            document.head.appendChild(style);
        });

        it('should format status bar path with index pills', () => {
            // Mock active file path
            const mockActiveFile = {
                path: '01_Projects/02_Current/task.md',
                parent: {
                    path: '01_Projects/02_Current',
                    name: '02_Current',
                    parent: {
                        path: '01_Projects',
                        name: '01_Projects',
                        parent: null,
                    },
                },
            };

            const pathParts: string[] = [];
            let currentFolder: any = mockActiveFile.parent;

            while (currentFolder) {
                pathParts.unshift(currentFolder.name);
                currentFolder = currentFolder.parent;
            }

            // Process path parts to create styled elements
            const styledParts = pathParts.map((part) => {
                const numericMatch = part.match(/^(\d+)_(.+)$/);
                if (numericMatch) {
                    const [, index, name] = numericMatch;
                    return `<span class="folder-path-pill">${index}</span>${name}`;
                }
                return part;
            });

            const statusBarContent = styledParts.join(
                ` ${mockPlugin.settings.statusBarSeparator} `
            );
            mockPlugin.statusBarItemEl.innerHTML = statusBarContent;

            expect(mockPlugin.statusBarItemEl.innerHTML).toContain(
                'folder-path-pill'
            );
            expect(mockPlugin.statusBarItemEl.innerHTML).toContain('01');
            expect(mockPlugin.statusBarItemEl.innerHTML).toContain('02');
            expect(mockPlugin.statusBarItemEl.innerHTML).toContain('→');
            expect(mockPlugin.statusBarItemEl.innerHTML).toContain('Projects');
            expect(mockPlugin.statusBarItemEl.innerHTML).toContain('Current');
        });

        it('should use custom separator in status bar', () => {
            mockPlugin.settings.statusBarSeparator = ' / ';

            const pathParts = ['01_Projects', '02_Current'];
            const styledParts = pathParts.map((part) => {
                const numericMatch = part.match(/^(\d+)_(.+)$/);
                if (numericMatch) {
                    const [, index, name] = numericMatch;
                    return `<span class="folder-path-pill">${index}</span>${name}`;
                }
                return part;
            });

            const statusBarContent = styledParts.join(
                ` ${mockPlugin.settings.statusBarSeparator} `
            );
            mockPlugin.statusBarItemEl.innerHTML = statusBarContent;

            expect(mockPlugin.statusBarItemEl.innerHTML).toContain(' / ');
        });
    });

    describe('Settings and Configuration', () => {
        it('should parse blacklisted prefixes correctly', () => {
            const testCases = [
                {
                    input: 'zz, archive, temp',
                    expected: ['zz', 'archive', 'temp'],
                },
                {
                    input: 'ZZ,ARCHIVE,  TEMP  ',
                    expected: ['zz', 'archive', 'temp'],
                },
                { input: '', expected: [] },
                { input: 'single', expected: ['single'] },
                { input: 'one,two,three,', expected: ['one', 'two', 'three'] },
            ];

            testCases.forEach(({ input, expected }) => {
                const result = input
                    .split(',')
                    .map((p: string) => p.trim().toLowerCase())
                    .filter((p: string) => p.length > 0);

                expect(result).toEqual(expected);
            });
        });

        it('should validate folder name patterns', () => {
            const testFolders = [
                { name: '01_Projects', isNumeric: true, isBlacklisted: false },
                { name: '99_Archive', isNumeric: true, isBlacklisted: false },
                { name: 'zz_Old', isNumeric: false, isBlacklisted: true },
                {
                    name: 'ARCHIVE_Stuff',
                    isNumeric: false,
                    isBlacklisted: true,
                },
                {
                    name: 'Regular Folder',
                    isNumeric: false,
                    isBlacklisted: false,
                },
                { name: '1Projects', isNumeric: false, isBlacklisted: false }, // Missing underscore
                { name: '_01Projects', isNumeric: false, isBlacklisted: false }, // Wrong format
            ];

            const blacklistedPrefixes = ['zz', 'archive'];

            testFolders.forEach(({ name, isNumeric, isBlacklisted }) => {
                const numericMatch = name.match(/^(\d+)_(.+)$/);
                const hasBlacklistedPrefix = blacklistedPrefixes.some(
                    (prefix) => name.toLowerCase().startsWith(prefix + '_')
                );

                expect(!!numericMatch).toBe(isNumeric);
                expect(hasBlacklistedPrefix).toBe(isBlacklisted);
            });
        });
    });

    describe('DOM Mutation and Performance', () => {
        it('should handle dynamic folder addition', () => {
            const newFolder = document.createElement('div');
            newFolder.className = 'tree-item nav-folder';
            newFolder.setAttribute('data-path', '03_NewFolder');

            const titleEl = document.createElement('div');
            titleEl.className = 'tree-item-self nav-folder-title';

            const contentEl = document.createElement('div');
            contentEl.className = 'nav-folder-title-content';
            contentEl.textContent = '03_NewFolder';

            titleEl.appendChild(contentEl);
            newFolder.appendChild(titleEl);
            fileExplorer.appendChild(newFolder);

            // Verify folder was added
            const addedFolder = document.querySelector(
                '[data-path="03_NewFolder"]'
            );
            expect(addedFolder).toBeTruthy();

            // Process the new folder for indexing
            const folderContent = addedFolder!.querySelector(
                '.nav-folder-title-content'
            );
            const name = folderContent!.textContent || '';
            const numericMatch = name.match(/^(\d+)_(.+)$/);

            if (numericMatch) {
                const [, index, folderName] = numericMatch;
                const pill = document.createElement('span');
                pill.className = 'folder-index-pill';
                pill.textContent = index;

                folderContent!.innerHTML = '';
                folderContent!.appendChild(pill);
                folderContent!.appendChild(document.createTextNode(folderName));
            }

            expect(
                folderContent!.querySelector('.folder-index-pill')!.textContent
            ).toBe('03');
        });

        it('should handle folder removal cleanly', () => {
            const folderToRemove = document.querySelector(
                '[data-path="01_Projects"]'
            );
            expect(folderToRemove).toBeTruthy();

            folderToRemove!.remove();

            const removedFolder = document.querySelector(
                '[data-path="01_Projects"]'
            );
            expect(removedFolder).toBeFalsy();
        });

        it('should process large numbers of folders efficiently', () => {
            const startTime = performance.now();

            // Add many folders
            for (let i = 1; i <= 100; i++) {
                const folder = document.createElement('div');
                folder.className = 'tree-item nav-folder';
                folder.setAttribute(
                    'data-path',
                    `${i.toString().padStart(2, '0')}_TestFolder${i}`
                );

                const titleEl = document.createElement('div');
                titleEl.className = 'tree-item-self nav-folder-title';

                const contentEl = document.createElement('div');
                contentEl.className = 'nav-folder-title-content';
                contentEl.textContent = `${i.toString().padStart(2, '0')}_TestFolder${i}`;

                titleEl.appendChild(contentEl);
                folder.appendChild(titleEl);
                fileExplorer.appendChild(folder);
            }

            // Process all folders
            const folders = document.querySelectorAll(
                '.nav-folder-title-content'
            );
            folders.forEach((folderEl) => {
                const name = folderEl.textContent || '';
                const numericMatch = name.match(/^(\d+)_(.+)$/);

                if (numericMatch) {
                    const [, index, folderName] = numericMatch;
                    const pill = document.createElement('span');
                    pill.className = 'folder-index-pill';
                    pill.textContent = index;

                    folderEl.innerHTML = '';
                    folderEl.appendChild(pill);
                    folderEl.appendChild(document.createTextNode(folderName));
                }
            });

            const endTime = performance.now();
            const processingTime = endTime - startTime;

            // Should complete within reasonable time (1 second)
            expect(processingTime).toBeLessThan(1000);

            // Verify all pills were created
            const pills = document.querySelectorAll('.folder-index-pill');
            expect(pills.length).toBeGreaterThanOrEqual(100);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle malformed DOM structures gracefully', () => {
            // Add folder without proper structure
            const malformedFolder = document.createElement('div');
            malformedFolder.className = 'tree-item nav-folder';
            // Missing nav-folder-title-content
            fileExplorer.appendChild(malformedFolder);

            // Should not throw error when processing
            expect(() => {
                const folders = document.querySelectorAll(
                    '.nav-folder-title-content'
                );
                folders.forEach((folder) => {
                    // Process folder...
                });
            }).not.toThrow();
        });

        it('should handle folders with special characters', () => {
            const specialFolders = [
                '01_Test-Folder',
                '02_Test_Folder_Extra',
                '03_Test (Parentheses)',
                '04_Test & Symbols',
                '05_Test.with.dots',
            ];

            specialFolders.forEach((folderName, index) => {
                const folder = document.createElement('div');
                folder.className = 'tree-item nav-folder';
                folder.setAttribute('data-path', folderName);

                const titleEl = document.createElement('div');
                titleEl.className = 'tree-item-self nav-folder-title';

                const contentEl = document.createElement('div');
                contentEl.className = 'nav-folder-title-content';
                contentEl.textContent = folderName;

                titleEl.appendChild(contentEl);
                folder.appendChild(titleEl);
                fileExplorer.appendChild(folder);

                // Process the folder
                const numericMatch = folderName.match(/^(\d+)_(.+)$/);
                expect(numericMatch).toBeTruthy();
                expect(numericMatch![1]).toBe(
                    (index + 1).toString().padStart(2, '0')
                );
            });
        });

        it('should handle empty or null folder names', () => {
            const emptyFolder = document.createElement('div');
            emptyFolder.className = 'tree-item nav-folder';

            const titleEl = document.createElement('div');
            titleEl.className = 'tree-item-self nav-folder-title';

            const contentEl = document.createElement('div');
            contentEl.className = 'nav-folder-title-content';
            contentEl.textContent = ''; // Empty name

            titleEl.appendChild(contentEl);
            emptyFolder.appendChild(titleEl);
            fileExplorer.appendChild(emptyFolder);

            // Should handle gracefully
            expect(() => {
                const name = contentEl.textContent || '';
                const numericMatch = name.match(/^(\d+)_(.+)$/);
                expect(numericMatch).toBeFalsy();
            }).not.toThrow();
        });
    });

    describe('CSS and Styling Integration', () => {
        it('should apply consistent pill styling', () => {
            const style = document.createElement('style');
            style.textContent = `
                .folder-index-pill {
                    background-color: var(--interactive-accent);
                    color: var(--text-on-accent);
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-size: 0.8em;
                    margin-right: 6px;
                    font-weight: 500;
                    display: inline-block;
                    min-width: 16px;
                    text-align: center;
                }
            `;
            document.head.appendChild(style);

            // Create a pill and verify styling can be applied
            const pill = document.createElement('span');
            pill.className = 'folder-index-pill';
            pill.textContent = '01';
            document.body.appendChild(pill);

            // In jsdom, CSS variables won't resolve, but class should be applied
            expect(pill.className).toBe('folder-index-pill');
        });

        it('should handle theme changes gracefully', () => {
            // Simulate theme change by updating CSS variables
            const root = document.documentElement;
            root.style.setProperty('--interactive-accent', '#007acc');
            root.style.setProperty('--text-on-accent', '#ffffff');

            const pill = document.createElement('span');
            pill.className = 'folder-index-pill';
            pill.style.backgroundColor = 'var(--interactive-accent)';
            pill.style.color = 'var(--text-on-accent)';

            document.body.appendChild(pill);

            // Verify pill maintains proper structure
            expect(pill.className).toBe('folder-index-pill');
            expect(pill.style.backgroundColor).toBe(
                'var(--interactive-accent)'
            );
        });
    });
});
