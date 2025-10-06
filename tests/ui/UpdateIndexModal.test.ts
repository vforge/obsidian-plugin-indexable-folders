import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UpdateIndexModal } from '../../src/ui/UpdateIndexModal';
import { TFolder } from 'obsidian';
import type IndexableFoldersPlugin from '../../src/main';

describe('UpdateIndexModal', () => {
    let modal: UpdateIndexModal;
    let mockApp: any;
    let mockPlugin: any;
    let mockFolder: TFolder;
    let onSubmitSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        // Create mock app
        mockApp = {};

        // Create mock plugin with settings and methods
        mockPlugin = {
            settings: {
                separator: ' - ',
            },
            getNumericPrefixRegex: vi.fn(() => /^(\d+)\s-\s/),
        } as unknown as IndexableFoldersPlugin;

        // Create mock folder
        mockFolder = new TFolder();
        mockFolder.name = '01 - Test Folder';
        mockFolder.path = 'path/to/01 - Test Folder';

        // Create onSubmit spy
        onSubmitSpy = vi.fn().mockResolvedValue(undefined);

        // Create modal instance
        modal = new UpdateIndexModal(
            mockApp,
            mockPlugin,
            mockFolder,
            onSubmitSpy
        );
    });

    describe('constructor', () => {
        it('should initialize with correct properties', () => {
            expect(modal.app).toBe(mockApp);
            expect(modal.plugin).toBe(mockPlugin);
            expect(modal.folder).toBe(mockFolder);
            expect(modal.onSubmit).toBe(onSubmitSpy);
        });
    });

    describe('checkForConflicts', () => {
        it('should return empty array if folder has no parent', () => {
            const conflicts = modal['checkForConflicts']('01', 2);
            expect(conflicts).toEqual([]);
        });

        it('should detect conflicts with same padded index', () => {
            const parent = new TFolder();
            parent.name = 'parent';
            parent.path = 'path/to/parent';
            mockFolder.parent = parent;

            const conflictFolder = new TFolder();
            conflictFolder.name = '01 - Conflict';
            conflictFolder.path = 'path/to/01 - Conflict';
            parent.children = [mockFolder, conflictFolder];

            const conflicts = modal['checkForConflicts']('01', 2);
            expect(conflicts).toContain('01 - Conflict');
        });

        it('should not include the folder itself in conflicts', () => {
            const parent = new TFolder();
            parent.name = 'parent';
            parent.path = 'path/to/parent';
            mockFolder.parent = parent;
            parent.children = [mockFolder];

            const conflicts = modal['checkForConflicts']('01', 2);
            expect(conflicts).toEqual([]);
        });

        it('should pad index when checking conflicts', () => {
            const parent = new TFolder();
            parent.name = 'parent';
            parent.path = 'path/to/parent';
            mockFolder.parent = parent;

            const conflictFolder = new TFolder();
            conflictFolder.name = '01 - Conflict';
            conflictFolder.path = 'path/to/01 - Conflict';
            parent.children = [mockFolder, conflictFolder];

            // Check with unpadded index '1', should still find '01 - Conflict'
            const conflicts = modal['checkForConflicts']('1', 2);
            expect(conflicts).toContain('01 - Conflict');
        });

        it('should escape special characters in separator', () => {
            mockPlugin.settings.separator = '.';
            const parent = new TFolder();
            parent.name = 'parent';
            parent.path = 'path/to/parent';
            mockFolder.parent = parent;

            const conflictFolder = new TFolder();
            conflictFolder.name = '01.Conflict';
            conflictFolder.path = 'path/to/01.Conflict';
            parent.children = [mockFolder, conflictFolder];

            const conflicts = modal['checkForConflicts']('01', 2);
            expect(conflicts).toContain('01.Conflict');
        });

        it('should handle complex separators with multiple special chars', () => {
            mockPlugin.settings.separator = ' -> ';
            mockPlugin.getNumericPrefixRegex = vi.fn(() => /^(\d+)\s->\s/);

            const parent = new TFolder();
            parent.name = 'parent';
            parent.path = 'path/to/parent';
            mockFolder.parent = parent;

            const conflictFolder = new TFolder();
            conflictFolder.name = '01 -> Conflict';
            conflictFolder.path = 'path/to/01 -> Conflict';
            parent.children = [mockFolder, conflictFolder];

            const conflicts = modal['checkForConflicts']('01', 2);
            expect(conflicts).toContain('01 -> Conflict');
        });
    });

    describe('validateInput', () => {
        it('should return error for empty input', () => {
            const error = modal['validateInput']('', 2);
            expect(error).toBe('Index cannot be empty');
        });

        it('should return error for non-digit input', () => {
            const error = modal['validateInput']('ab', 2);
            expect(error).toBe('Index must contain only digits');
        });

        it('should return error for incorrect length', () => {
            const error = modal['validateInput']('1', 2);
            expect(error).toBe('Index must be exactly 2 digits long');
        });

        it('should return error for input longer than required', () => {
            const error = modal['validateInput']('123', 2);
            expect(error).toBe('Index must be exactly 2 digits long');
        });

        it('should return null for valid input', () => {
            const error = modal['validateInput']('01', 2);
            expect(error).toBeNull();
        });

        it('should handle different prefix lengths', () => {
            expect(modal['validateInput']('001', 3)).toBeNull();
            expect(modal['validateInput']('0001', 4)).toBeNull();
            expect(modal['validateInput']('12', 3)).toBe(
                'Index must be exactly 3 digits long'
            );
        });

        it('should validate range based on prefix length', () => {
            const error = modal['validateInput']('99', 2);
            expect(error).toBeNull();

            const error2 = modal['validateInput']('999', 3);
            expect(error2).toBeNull();
        });

        it('should handle edge case of all zeros', () => {
            const error = modal['validateInput']('00', 2);
            expect(error).toBeNull();
        });

        it('should handle edge case of all nines', () => {
            const error = modal['validateInput']('99', 2);
            expect(error).toBeNull();
        });
    });

    describe('updateConflictDisplay', () => {
        beforeEach(() => {
            modal.conflictEl = document.createElement('div');
        });

        it('should hide display when no conflicts', () => {
            modal['updateConflictDisplay']([]);
            expect(modal.conflictEl.style.display).toBe('none');
            expect(modal.conflictEl.innerHTML).toBe('');
        });

        it('should show conflicts with header and list', () => {
            modal['updateConflictDisplay']([
                '01 - Conflict1',
                '01 - Conflict2',
            ]);

            expect(modal.conflictEl.style.display).toBe('block');
            expect(modal.conflictEl.textContent).toContain(
                'Files with this index:'
            );
            expect(modal.conflictEl.textContent).toContain('01 - Conflict1');
            expect(modal.conflictEl.textContent).toContain('01 - Conflict2');
        });

        it('should create list items with correct class', () => {
            modal['updateConflictDisplay'](['01 - Conflict']);

            const list = modal.conflictEl.querySelector('ul');
            expect(list).toBeTruthy();
            expect(
                list?.classList.contains('indexable-folder-conflict-list')
            ).toBe(true);

            const item = list?.querySelector('li');
            expect(
                item?.classList.contains('indexable-folder-conflict-item')
            ).toBe(true);
        });

        it('should clear previous conflicts before showing new ones', () => {
            modal['updateConflictDisplay'](['Conflict1']);
            modal['updateConflictDisplay'](['Conflict2']);

            const items = modal.conflictEl.querySelectorAll('li');
            expect(items.length).toBe(1);
            expect(items[0].textContent).toBe('Conflict2');
        });
    });

    describe('updateErrorDisplay', () => {
        beforeEach(() => {
            modal.errorEl = document.createElement('div');
        });

        it('should hide display when no error', () => {
            modal['updateErrorDisplay'](null);
            expect(modal.errorEl.style.display).toBe('none');
            expect(modal.errorEl.innerHTML).toBe('');
        });

        it('should show error message with header', () => {
            modal['updateErrorDisplay']('Test error message');

            expect(modal.errorEl.style.display).toBe('block');
            expect(modal.errorEl.textContent).toContain('Error:');
            expect(modal.errorEl.textContent).toContain('Test error message');
        });

        it('should apply correct CSS classes', () => {
            modal['updateErrorDisplay']('Error');

            const header = modal.errorEl.querySelector(
                '.indexable-folder-error-header'
            );
            const message = modal.errorEl.querySelector(
                '.indexable-folder-error-message'
            );

            expect(header).toBeTruthy();
            expect(message).toBeTruthy();
        });

        it('should clear previous error before showing new one', () => {
            modal['updateErrorDisplay']('Error 1');
            modal['updateErrorDisplay']('Error 2');

            const messages = modal.errorEl.querySelectorAll(
                '.indexable-folder-error-message'
            );
            expect(messages.length).toBe(1);
            expect(messages[0].textContent).toBe('Error 2');
        });
    });

    describe('updateSuccessDisplay', () => {
        beforeEach(() => {
            modal.successEl = document.createElement('div');
        });

        it('should hide when input is invalid', () => {
            modal['updateSuccessDisplay'](false, false, '01');
            expect(modal.successEl.style.display).toBe('none');
        });

        it('should hide when there are conflicts', () => {
            modal['updateSuccessDisplay'](true, true, '01');
            expect(modal.successEl.style.display).toBe('none');
        });

        it('should show success message when valid and no conflicts', () => {
            modal['updateSuccessDisplay'](true, false, '02');

            expect(modal.successEl.style.display).toBe('block');
            expect(modal.successEl.textContent).toContain('Ready to update:');
        });

        it('should show folder rename preview', () => {
            modal['updateSuccessDisplay'](true, false, '05');

            expect(modal.successEl.textContent).toContain(
                '01 - Test Folder → 05 - Test Folder'
            );
        });

        it('should apply correct CSS classes', () => {
            modal['updateSuccessDisplay'](true, false, '02');

            const header = modal.successEl.querySelector(
                '.indexable-folder-success-header'
            );
            const message = modal.successEl.querySelector(
                '.indexable-folder-success-message'
            );

            expect(header).toBeTruthy();
            expect(message).toBeTruthy();
        });

        it('should use plugin regex to replace prefix', () => {
            mockPlugin.getNumericPrefixRegex = vi.fn(() => /^(\d+)\s-\s/);
            modal['updateSuccessDisplay'](true, false, '10');

            expect(modal.successEl.textContent).toContain(
                '01 - Test Folder → 10 - Test Folder'
            );
            expect(mockPlugin.getNumericPrefixRegex).toHaveBeenCalled();
        });
    });

    describe('onOpen', () => {
        it('should close modal if folder has no numeric prefix', () => {
            const folderWithoutPrefix = new TFolder();
            folderWithoutPrefix.name = 'No Prefix Folder';
            folderWithoutPrefix.path = 'path/to/folder';
            const modalWithoutPrefix = new UpdateIndexModal(
                mockApp,
                mockPlugin,
                folderWithoutPrefix,
                onSubmitSpy
            );

            const closeSpy = vi.spyOn(modalWithoutPrefix, 'close');
            modalWithoutPrefix.onOpen();

            expect(closeSpy).toHaveBeenCalled();
        });

        it('should create modal UI elements', () => {
            modal.onOpen();

            expect(modal.contentEl.querySelector('h2')).toBeTruthy();
            expect(modal.contentEl.querySelector('h2')?.textContent).toContain(
                'Update index for "01 - Test Folder"'
            );
            expect(
                modal.contentEl.classList.contains('indexable-folder-modal')
            ).toBe(true);
        });

        it('should create form with text input', () => {
            modal.onOpen();

            const form = modal.contentEl.querySelector('form');
            expect(form).toBeTruthy();
        });

        it('should initialize display elements', () => {
            modal.onOpen();

            expect(modal.errorEl).toBeTruthy();
            expect(modal.conflictEl).toBeTruthy();
            expect(modal.successEl).toBeTruthy();
        });

        it('should set initial value from folder prefix', () => {
            modal.onOpen();

            const input = modal.contentEl.querySelector('input[type="text"]');
            expect(input).toBeTruthy();
            expect((input as HTMLInputElement)?.value).toBe('01');
        });

        it('should set correct input constraints', () => {
            modal.onOpen();

            const input = modal.contentEl.querySelector(
                'input[type="text"]'
            ) as HTMLInputElement;
            expect(input.maxLength).toBe(2);
            expect(input.pattern).toBe('\\d{2}');
        });
    });

    describe('input event handling', () => {
        it('should filter non-digit characters on input', () => {
            modal.onOpen();

            const input = modal.contentEl.querySelector(
                'input[type="text"]'
            ) as HTMLInputElement;

            // Simulate typing non-digits
            input.value = 'abc123xyz';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            // Should have filtered to only digits
            expect(input.value).toBe('12');
        });

        it('should enforce max length on input', () => {
            modal.onOpen();

            const input = modal.contentEl.querySelector(
                'input[type="text"]'
            ) as HTMLInputElement;

            // Simulate typing more digits than allowed
            input.value = '12345';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            expect(input.value).toBe('12');
        });

        it('should show error for invalid input', () => {
            modal.onOpen();

            const input = modal.contentEl.querySelector(
                'input[type="text"]'
            ) as HTMLInputElement;

            input.value = '1'; // Too short
            input.dispatchEvent(new Event('input', { bubbles: true }));

            expect(modal.errorEl.style.display).toBe('block');
            expect(modal.errorEl.textContent).toContain(
                'Index must be exactly 2 digits long'
            );
        });

        it('should check for conflicts on valid input', () => {
            const parent = new TFolder();
            parent.name = 'parent';
            parent.path = 'path/to/parent';
            mockFolder.parent = parent;

            const conflictFolder = new TFolder();
            conflictFolder.name = '05 - Conflict';
            conflictFolder.path = 'path/to/05 - Conflict';
            parent.children = [mockFolder, conflictFolder];

            modal.onOpen();

            const input = modal.contentEl.querySelector(
                'input[type="text"]'
            ) as HTMLInputElement;

            input.value = '05';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            expect(modal.conflictEl.style.display).toBe('block');
            expect(modal.conflictEl.textContent).toContain('05 - Conflict');
        });

        it('should show success when input is valid and no conflicts', () => {
            modal.onOpen();

            const input = modal.contentEl.querySelector(
                'input[type="text"]'
            ) as HTMLInputElement;

            input.value = '99';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            expect(modal.successEl.style.display).toBe('block');
            expect(modal.successEl.textContent).toContain('Ready to update:');
        });
    });

    describe('keypress event handling', () => {
        it('should prevent non-digit characters on keypress', () => {
            modal.onOpen();

            const input = modal.contentEl.querySelector(
                'input[type="text"]'
            ) as HTMLInputElement;

            const event = new KeyboardEvent('keypress', {
                key: 'a',
                bubbles: true,
            });
            const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

            input.dispatchEvent(event);

            expect(preventDefaultSpy).toHaveBeenCalled();
        });

        it('should allow digit characters on keypress', () => {
            modal.onOpen();

            const input = modal.contentEl.querySelector(
                'input[type="text"]'
            ) as HTMLInputElement;

            const event = new KeyboardEvent('keypress', {
                key: '5',
                bubbles: true,
            });
            const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

            input.dispatchEvent(event);

            expect(preventDefaultSpy).not.toHaveBeenCalled();
        });

        it('should allow navigation keys on keypress', () => {
            modal.onOpen();

            const input = modal.contentEl.querySelector(
                'input[type="text"]'
            ) as HTMLInputElement;

            const keys = [
                'Backspace',
                'Delete',
                'Tab',
                'ArrowLeft',
                'ArrowRight',
            ];

            keys.forEach((key) => {
                const event = new KeyboardEvent('keypress', {
                    key,
                    bubbles: true,
                });
                const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

                input.dispatchEvent(event);

                expect(preventDefaultSpy).not.toHaveBeenCalled();
            });
        });

        it('should submit on Enter key with valid input', async () => {
            modal.onOpen();

            const input = modal.contentEl.querySelector(
                'input[type="text"]'
            ) as HTMLInputElement;
            const closeSpy = vi.spyOn(modal, 'close');

            input.value = '05';

            const event = new KeyboardEvent('keypress', {
                key: 'Enter',
                bubbles: true,
            });
            const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

            input.dispatchEvent(event);

            expect(preventDefaultSpy).toHaveBeenCalled();
            expect(closeSpy).toHaveBeenCalled();
            expect(onSubmitSpy).toHaveBeenCalledWith(5);
        });

        it('should show notice on Enter with invalid input', () => {
            modal.onOpen();

            const input = modal.contentEl.querySelector(
                'input[type="text"]'
            ) as HTMLInputElement;

            input.value = '1'; // Invalid - too short

            const event = new KeyboardEvent('keypress', {
                key: 'Enter',
                bubbles: true,
            });
            input.dispatchEvent(event);

            // Notice should be created but we can't easily test the Notice constructor in this setup
            expect(onSubmitSpy).not.toHaveBeenCalled();
        });
    });

    describe('button click handling', () => {
        it('should submit on button click with valid input', async () => {
            modal.onOpen();

            const input = modal.contentEl.querySelector(
                'input[type="text"]'
            ) as HTMLInputElement;
            const button = modal.contentEl.querySelector(
                'button'
            ) as HTMLButtonElement;
            const closeSpy = vi.spyOn(modal, 'close');

            input.value = '10';

            await button.click();

            expect(closeSpy).toHaveBeenCalled();
            expect(onSubmitSpy).toHaveBeenCalledWith(10);
        });

        it('should show notice on button click with invalid input', async () => {
            modal.onOpen();

            const input = modal.contentEl.querySelector(
                'input[type="text"]'
            ) as HTMLInputElement;
            const button = modal.contentEl.querySelector(
                'button'
            ) as HTMLButtonElement;
            const closeSpy = vi.spyOn(modal, 'close');

            input.value = ''; // Invalid - empty

            await button.click();

            expect(closeSpy).not.toHaveBeenCalled();
            expect(onSubmitSpy).not.toHaveBeenCalled();
        });
    });

    describe('onClose', () => {
        it('should clear content element', () => {
            modal.onOpen();

            // Add some content
            expect(modal.contentEl.children.length).toBeGreaterThan(0);

            modal.onClose();

            expect(modal.contentEl.children.length).toBe(0);
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete flow: open, edit, submit', async () => {
            modal.onOpen();

            const input = modal.contentEl.querySelector(
                'input[type="text"]'
            ) as HTMLInputElement;
            const button = modal.contentEl.querySelector(
                'button'
            ) as HTMLButtonElement;

            // Initial state check
            expect(input.value).toBe('01');

            // Change to valid new index
            input.value = '15';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            // Verify success display
            expect(modal.successEl.style.display).toBe('block');

            // Submit
            const closeSpy = vi.spyOn(modal, 'close');
            await button.click();

            expect(closeSpy).toHaveBeenCalled();
            expect(onSubmitSpy).toHaveBeenCalledWith(15);
        });

        it('should handle conflict detection and resolution', () => {
            const parent = new TFolder();
            parent.name = 'parent';
            parent.path = 'path/to/parent';
            mockFolder.parent = parent;

            const conflictFolder = new TFolder();
            conflictFolder.name = '10 - Conflict';
            conflictFolder.path = 'path/to/10 - Conflict';
            parent.children = [mockFolder, conflictFolder];

            modal.onOpen();

            const input = modal.contentEl.querySelector(
                'input[type="text"]'
            ) as HTMLInputElement;

            // Type conflicting index
            input.value = '10';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            expect(modal.conflictEl.style.display).toBe('block');
            expect(modal.successEl.style.display).toBe('none');

            // Change to non-conflicting
            input.value = '11';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            expect(modal.conflictEl.style.display).toBe('none');
            expect(modal.successEl.style.display).toBe('block');
        });

        it('should handle validation errors and corrections', () => {
            modal.onOpen();

            const input = modal.contentEl.querySelector(
                'input[type="text"]'
            ) as HTMLInputElement;

            // Type invalid (too short)
            input.value = '1';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            expect(modal.errorEl.style.display).toBe('block');
            expect(modal.successEl.style.display).toBe('none');

            // Complete to valid
            input.value = '15';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            expect(modal.errorEl.style.display).toBe('none');
            expect(modal.successEl.style.display).toBe('block');
        });

        it('should work with different prefix lengths', () => {
            const folderWithLongerPrefix = new TFolder();
            folderWithLongerPrefix.name = '001 - Longer';
            folderWithLongerPrefix.path = 'path/to/001 - Longer';
            mockPlugin.getNumericPrefixRegex = vi.fn(() => /^(\d+)\s-\s/);

            const modalWithLonger = new UpdateIndexModal(
                mockApp,
                mockPlugin,
                folderWithLongerPrefix,
                onSubmitSpy
            );

            modalWithLonger.onOpen();

            const input = modalWithLonger.contentEl.querySelector(
                'input[type="text"]'
            ) as HTMLInputElement;

            expect(input.value).toBe('001');
            expect(input.maxLength).toBe(3);
            expect(input.pattern).toBe('\\d{3}');

            // Validate with 3-digit requirement
            input.value = '12'; // Too short
            input.dispatchEvent(new Event('input', { bubbles: true }));

            expect(modalWithLonger.errorEl.textContent).toContain(
                'Index must be exactly 3 digits long'
            );
        });
    });
});
