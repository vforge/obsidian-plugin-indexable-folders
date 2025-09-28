import { describe, it, expect } from 'vitest';
import {
    RegexSettings,
    escapeRegexChars,
    generatePrefixRegex,
    generateNumericPrefixRegex,
    extractPrefix,
    hasPrefix,
} from '../src/helpers/regexHelpers';

describe('regexHelpers', () => {
    const mockSettings: RegexSettings = {
        separator: '. ',
        specialPrefixes: 'TODO, DRAFT, ARCHIVE',
    };

    describe('escapeRegexChars', () => {
        it('should escape special regex characters', () => {
            expect(escapeRegexChars('test')).toBe('test');
            expect(escapeRegexChars('.')).toBe('\\.');
            expect(escapeRegexChars('*')).toBe('\\*');
            expect(escapeRegexChars('+')).toBe('\\+');
            expect(escapeRegexChars('?')).toBe('\\?');
            expect(escapeRegexChars('^')).toBe('\\^');
            expect(escapeRegexChars('$')).toBe('\\$');
            expect(escapeRegexChars('|')).toBe('\\|');
            expect(escapeRegexChars('()')).toBe('\\(\\)');
            expect(escapeRegexChars('[]')).toBe('\\[\\]');
            expect(escapeRegexChars('{}')).toBe('\\{\\}');
            expect(escapeRegexChars('\\')).toBe('\\\\');
            expect(escapeRegexChars('-')).toBe('\\-');
        });

        it('should handle empty strings', () => {
            expect(escapeRegexChars('')).toBe('');
        });

        it('should escape complex patterns', () => {
            expect(escapeRegexChars('test.file[1-2]')).toBe(
                'test\\.file\\[1\\-2\\]'
            );
            expect(escapeRegexChars('($*+?^{|})')).toBe(
                '\\(\\$\\*\\+\\?\\^\\{\\|\\}\\)'
            );
        });
    });

    describe('generatePrefixRegex', () => {
        it('should generate regex for numeric and special prefixes', () => {
            const regex = generatePrefixRegex(mockSettings);
            expect(regex.test('01. My Folder')).toBe(true);
            expect(regex.test('123. Another Folder')).toBe(true);
            expect(regex.test('TODO. Task Folder')).toBe(true);
            expect(regex.test('DRAFT. Work in Progress')).toBe(true);
            expect(regex.test('ARCHIVE. Old Files')).toBe(true);
        });

        it('should be case insensitive for special prefixes', () => {
            const regex = generatePrefixRegex(mockSettings);
            expect(regex.test('todo. Task Folder')).toBe(true);
            expect(regex.test('Draft. Work in Progress')).toBe(true);
            expect(regex.test('archive. Old Files')).toBe(true);
        });

        it('should not match invalid prefixes', () => {
            const regex = generatePrefixRegex(mockSettings);
            expect(regex.test('abc. Text Folder')).toBe(false);
            expect(regex.test('Random Text')).toBe(false);
            expect(regex.test('. No prefix')).toBe(false);
        });

        it('should handle different separators', () => {
            const settings: RegexSettings = {
                separator: '-',
                specialPrefixes: 'TEST',
            };
            const regex = generatePrefixRegex(settings);
            expect(regex.test('01-Folder')).toBe(true);
            expect(regex.test('TEST-Folder')).toBe(true);
            expect(regex.test('01. Folder')).toBe(false);
        });

        it('should handle special characters in separators', () => {
            const settings: RegexSettings = {
                separator: '.*',
                specialPrefixes: 'TEST',
            };
            const regex = generatePrefixRegex(settings);
            expect(regex.test('01.*Folder')).toBe(true);
            expect(regex.test('TEST.*Folder')).toBe(true);
        });

        it('should handle empty special prefixes', () => {
            const settings: RegexSettings = {
                separator: '. ',
                specialPrefixes: '',
            };
            const regex = generatePrefixRegex(settings);
            expect(regex.test('01. Folder')).toBe(true);
            expect(regex.test('TODO. Folder')).toBe(false);
        });

        it('should handle special prefixes with special regex characters', () => {
            const settings: RegexSettings = {
                separator: '. ',
                specialPrefixes: 'TEST.*, DRAFT[1]',
            };
            const regex = generatePrefixRegex(settings);
            expect(regex.test('TEST.*. Folder')).toBe(true);
            expect(regex.test('DRAFT[1]. Folder')).toBe(true);
        });
    });

    describe('generateNumericPrefixRegex', () => {
        it('should generate regex for numeric prefixes only', () => {
            const regex = generateNumericPrefixRegex(mockSettings);
            expect(regex.test('01. My Folder')).toBe(true);
            expect(regex.test('123. Another Folder')).toBe(true);
            expect(regex.test('0. Zero Index')).toBe(true);
        });

        it('should not match special prefixes', () => {
            const regex = generateNumericPrefixRegex(mockSettings);
            expect(regex.test('TODO. Task Folder')).toBe(false);
            expect(regex.test('DRAFT. Work in Progress')).toBe(false);
            expect(regex.test('abc. Text Folder')).toBe(false);
        });

        it('should handle different separators', () => {
            const settings: RegexSettings = {
                separator: '-',
                specialPrefixes: '',
            };
            const regex = generateNumericPrefixRegex(settings);
            expect(regex.test('01-Folder')).toBe(true);
            expect(regex.test('01. Folder')).toBe(false);
        });
    });

    describe('extractPrefix', () => {
        it('should extract numeric prefixes', () => {
            const regex = generateNumericPrefixRegex(mockSettings);
            expect(extractPrefix('01. My Folder', regex)).toBe('01');
            expect(extractPrefix('123. Another Folder', regex)).toBe('123');
            expect(extractPrefix('0. Zero Index', regex)).toBe('0');
        });

        it('should extract special prefixes', () => {
            const regex = generatePrefixRegex(mockSettings);
            expect(extractPrefix('TODO. Task Folder', regex)).toBe('TODO');
            expect(extractPrefix('DRAFT. Work in Progress', regex)).toBe(
                'DRAFT'
            );
            expect(extractPrefix('archive. Old Files', regex)).toBe('archive');
        });

        it('should return null for non-matching strings', () => {
            const regex = generateNumericPrefixRegex(mockSettings);
            expect(extractPrefix('No Prefix Here', regex)).toBeNull();
            expect(extractPrefix('TODO. Task Folder', regex)).toBeNull();
            expect(extractPrefix('', regex)).toBeNull();
        });
    });

    describe('hasPrefix', () => {
        it('should return true for matching prefixes', () => {
            const numericRegex = generateNumericPrefixRegex(mockSettings);
            const prefixRegex = generatePrefixRegex(mockSettings);

            expect(hasPrefix('01. My Folder', numericRegex)).toBe(true);
            expect(hasPrefix('123. Another Folder', numericRegex)).toBe(true);
            expect(hasPrefix('TODO. Task Folder', prefixRegex)).toBe(true);
            expect(hasPrefix('DRAFT. Work in Progress', prefixRegex)).toBe(
                true
            );
        });

        it('should return false for non-matching strings', () => {
            const numericRegex = generateNumericPrefixRegex(mockSettings);
            const prefixRegex = generatePrefixRegex(mockSettings);

            expect(hasPrefix('No Prefix Here', numericRegex)).toBe(false);
            expect(hasPrefix('TODO. Task Folder', numericRegex)).toBe(false);
            expect(hasPrefix('Random Text', prefixRegex)).toBe(false);
            expect(hasPrefix('', prefixRegex)).toBe(false);
        });
    });

    describe('integration tests', () => {
        it('should work with complex folder structures', () => {
            const settings: RegexSettings = {
                separator: ') ',
                specialPrefixes: 'IMPORTANT, REVIEW, COMPLETED',
            };

            const regex = generatePrefixRegex(settings);
            const folders = [
                '001) Project Alpha',
                '002) Project Beta',
                'IMPORTANT) Critical Tasks',
                'REVIEW) Items to Check',
                '099) Archive',
                'COMPLETED) Finished Work',
            ];

            folders.forEach((folder) => {
                expect(hasPrefix(folder, regex)).toBe(true);
                const prefix = extractPrefix(folder, regex);
                expect(prefix).toBeTruthy();
            });
        });

        it('should handle edge cases with whitespace', () => {
            const settings: RegexSettings = {
                separator: ' - ',
                specialPrefixes: 'WIP',
            };

            const regex = generatePrefixRegex(settings);
            expect(hasPrefix('01 - Folder Name', regex)).toBe(true);
            expect(hasPrefix('WIP - Work in Progress', regex)).toBe(true);
            expect(extractPrefix('01 - Folder Name', regex)).toBe('01');
            expect(extractPrefix('WIP - Work in Progress', regex)).toBe('WIP');
        });
    });
});
