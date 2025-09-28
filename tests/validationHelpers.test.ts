import { describe, expect, it } from 'vitest';
import {
    ValidationContext,
    ValidationResult,
    combineValidationResults,
    validateFolderName,
    validateIndexFormat,
    validateIndexMove,
    validatePathSecurity,
} from '../src/helpers/validationHelpers';

describe('validationHelpers', () => {
    describe('validateIndexMove', () => {
        it('should allow valid index moves', () => {
            const context: ValidationContext = {
                folderName: '01. Test Folder',
                targetIndex: 5,
                currentIndex: 1,
                isSpecialCurrent: false,
                isSpecialTarget: false,
            };

            const result = validateIndexMove(context);
            expect(result.isValid).toBe(true);
            expect(result.errorMessage).toBeUndefined();
            expect(result.errorCode).toBeUndefined();
        });

        it('should reject moves from special indices', () => {
            const context: ValidationContext = {
                folderName: '00. Archive',
                targetIndex: 5,
                currentIndex: 0,
                isSpecialCurrent: true,
                isSpecialTarget: false,
            };

            const result = validateIndexMove(context);
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toBe(
                'Cannot move folder with special index: 00. Archive'
            );
            expect(result.errorCode).toBe('SPECIAL_INDEX_SOURCE');
        });

        it('should reject moves to special indices', () => {
            const context: ValidationContext = {
                folderName: '01. Test Folder',
                targetIndex: 0,
                currentIndex: 1,
                isSpecialCurrent: false,
                isSpecialTarget: true,
            };

            const result = validateIndexMove(context);
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toBe(
                'Cannot move to special index position: 0'
            );
            expect(result.errorCode).toBe('SPECIAL_INDEX_TARGET');
        });

        it('should reject moves to same position', () => {
            const context: ValidationContext = {
                folderName: '01. Test Folder',
                targetIndex: 1,
                currentIndex: 1,
                isSpecialCurrent: false,
                isSpecialTarget: false,
            };

            const result = validateIndexMove(context);
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toBe(
                'Folder is already at the target position'
            );
            expect(result.errorCode).toBe('SAME_POSITION');
        });

        it('should reject invalid target indices', () => {
            const context: ValidationContext = {
                folderName: '01. Test Folder',
                targetIndex: 0,
                currentIndex: 1,
                isSpecialCurrent: false,
                isSpecialTarget: false,
            };

            const result = validateIndexMove(context);
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toBe(
                'Target index must be greater than 0'
            );
            expect(result.errorCode).toBe('INVALID_INDEX');
        });

        it('should reject negative target indices', () => {
            const context: ValidationContext = {
                folderName: '01. Test Folder',
                targetIndex: -1,
                currentIndex: 1,
                isSpecialCurrent: false,
                isSpecialTarget: false,
            };

            const result = validateIndexMove(context);
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toBe(
                'Target index must be greater than 0'
            );
            expect(result.errorCode).toBe('INVALID_INDEX');
        });

        it('should handle moves without current index', () => {
            const context: ValidationContext = {
                folderName: 'New Folder',
                targetIndex: 5,
                isSpecialCurrent: false,
                isSpecialTarget: false,
            };

            const result = validateIndexMove(context);
            expect(result.isValid).toBe(true);
        });
    });

    describe('validateFolderName', () => {
        it('should accept valid folder names', () => {
            const validNames = [
                'My Folder',
                'Project 123',
                'folder-with-dashes',
                'folder_with_underscores',
                '01. Numbered Folder',
                'Special Chars !@#$%^&()[]{}',
            ];

            validNames.forEach((name) => {
                const result = validateFolderName(name);
                expect(result.isValid).toBe(true);
            });
        });

        it('should reject empty folder names', () => {
            const result = validateFolderName('');
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toBe('Folder name cannot be empty');
            expect(result.errorCode).toBe('EMPTY_NAME');
        });

        it('should reject whitespace-only folder names', () => {
            const result = validateFolderName('   ');
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toBe('Folder name cannot be empty');
            expect(result.errorCode).toBe('EMPTY_NAME');
        });

        it('should reject names exceeding maximum length', () => {
            const longName = 'a'.repeat(256);
            const result = validateFolderName(longName, 255);
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toBe(
                'Folder name exceeds maximum length of 255 characters'
            );
            expect(result.errorCode).toBe('NAME_TOO_LONG');
        });

        it('should reject names with invalid characters', () => {
            const invalidChars = ['<', '>', ':', '"', '|', '?', '*'];

            invalidChars.forEach((char) => {
                const result = validateFolderName(`Test${char}Folder`);
                expect(result.isValid).toBe(false);
                expect(result.errorMessage).toBe(
                    'Folder name contains invalid characters: < > : " | ? *'
                );
                expect(result.errorCode).toBe('INVALID_CHARACTERS');
            });
        });

        it('should reject reserved Windows names', () => {
            const reservedNames = [
                'CON',
                'PRN',
                'AUX',
                'NUL',
                'COM1',
                'COM9',
                'LPT1',
                'LPT9',
                'con.txt',
                'PRN.doc',
            ];

            reservedNames.forEach((name) => {
                const result = validateFolderName(name);
                expect(result.isValid).toBe(false);
                expect(result.errorMessage).toBe(
                    'Folder name uses a reserved system name'
                );
                expect(result.errorCode).toBe('RESERVED_NAME');
            });
        });

        it('should handle case insensitive reserved names', () => {
            const result = validateFolderName('con');
            expect(result.isValid).toBe(false);
            expect(result.errorCode).toBe('RESERVED_NAME');
        });

        it("should allow names that contain but don't start with reserved names", () => {
            const result = validateFolderName('MyDocument_CON');
            expect(result.isValid).toBe(true);
        });
    });

    describe('validatePathSecurity', () => {
        it('should accept safe path components', () => {
            const safeNames = [
                'MyFolder',
                'folder-name',
                'folder_name',
                '01-numbered',
                'Special Chars !@#$%^&()[]{}',
            ];

            safeNames.forEach((name) => {
                const result = validatePathSecurity(name);
                expect(result.isValid).toBe(true);
            });
        });

        it('should reject path traversal attempts', () => {
            const maliciousNames = [
                '../../../etc/passwd',
                '..\\windows\\system32',
                'folder/../other',
                '..\\',
                '..',
            ];

            maliciousNames.forEach((name) => {
                const result = validatePathSecurity(name);
                expect(result.isValid).toBe(false);
                expect(result.errorMessage).toBe(
                    'Path traversal detected in folder name'
                );
                expect(result.errorCode).toBe('PATH_TRAVERSAL');
            });
        });

        it('should reject absolute paths', () => {
            const absolutePaths = [
                '/usr/bin/folder',
                '/home/user/documents',
                'C:\\Users\\Documents',
                'D:\\Projects',
                '\\\\server\\share',
            ];

            absolutePaths.forEach((name) => {
                const result = validatePathSecurity(name);
                expect(result.isValid).toBe(false);
                expect(result.errorMessage).toBe(
                    'Absolute paths are not allowed in folder names'
                );
                expect(result.errorCode).toBe('ABSOLUTE_PATH');
            });
        });

        it('should reject hidden folder names', () => {
            const hiddenNames = ['.hidden', '.config', '.git', '.vscode'];

            hiddenNames.forEach((name) => {
                const result = validatePathSecurity(name);
                expect(result.isValid).toBe(false);
                expect(result.errorMessage).toBe(
                    'Hidden folder names are not recommended'
                );
                expect(result.errorCode).toBe('HIDDEN_FOLDER');
            });
        });

        it('should allow names with dots in the middle', () => {
            const result = validatePathSecurity('My.Folder.Name');
            expect(result.isValid).toBe(true);
        });
    });

    describe('validateIndexFormat', () => {
        it('should accept valid numeric indices', () => {
            const validIndices = ['1', '01', '001', '123', '999'];

            validIndices.forEach((index) => {
                const result = validateIndexFormat(index);
                expect(result.isValid).toBe(true);
            });
        });

        it('should reject non-numeric indices', () => {
            const invalidIndices = ['abc', '1a', 'a1', '1.5', '-1', ''];

            invalidIndices.forEach((index) => {
                const result = validateIndexFormat(index);
                expect(result.isValid).toBe(false);
                expect(result.errorMessage).toBe('Index must be numeric');
                expect(result.errorCode).toBe('NON_NUMERIC_INDEX');
            });
        });

        it('should reject indices below minimum range', () => {
            const result = validateIndexFormat('0');
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toBe('Index must be greater than 0');
            expect(result.errorCode).toBe('INVALID_INDEX_RANGE');
        });

        it('should reject indices above maximum when specified', () => {
            const result = validateIndexFormat('1001', 1000);
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toBe(
                'Index exceeds maximum value of 1000'
            );
            expect(result.errorCode).toBe('INDEX_TOO_LARGE');
        });

        it('should accept indices within maximum when specified', () => {
            const result = validateIndexFormat('999', 1000);
            expect(result.isValid).toBe(true);
        });

        it('should handle zero-padded indices correctly', () => {
            const result = validateIndexFormat('001', 100);
            expect(result.isValid).toBe(true);
        });
    });

    describe('combineValidationResults', () => {
        it('should return success when all results are valid', () => {
            const results: ValidationResult[] = [
                { isValid: true },
                { isValid: true },
                { isValid: true },
            ];

            const combined = combineValidationResults(results);
            expect(combined.isValid).toBe(true);
            expect(combined.errorMessage).toBeUndefined();
            expect(combined.errorCode).toBeUndefined();
        });

        it('should return first error when any result is invalid', () => {
            const results: ValidationResult[] = [
                { isValid: true },
                {
                    isValid: false,
                    errorMessage: 'First error',
                    errorCode: 'ERROR_1',
                },
                {
                    isValid: false,
                    errorMessage: 'Second error',
                    errorCode: 'ERROR_2',
                },
            ];

            const combined = combineValidationResults(results);
            expect(combined.isValid).toBe(false);
            expect(combined.errorMessage).toBe('First error');
            expect(combined.errorCode).toBe('ERROR_1');
        });

        it('should handle empty results array', () => {
            const combined = combineValidationResults([]);
            expect(combined.isValid).toBe(true);
        });

        it('should handle single result', () => {
            const validResult = combineValidationResults([{ isValid: true }]);
            expect(validResult.isValid).toBe(true);

            const invalidResult = combineValidationResults([
                {
                    isValid: false,
                    errorMessage: 'Single error',
                    errorCode: 'SINGLE_ERROR',
                },
            ]);
            expect(invalidResult.isValid).toBe(false);
            expect(invalidResult.errorMessage).toBe('Single error');
        });
    });

    describe('integration tests', () => {
        it('should validate complete folder move scenario', () => {
            const folderName = '01. My Project';
            const targetIndex = 5;

            // Validate folder name
            const nameValidation = validateFolderName(folderName);
            expect(nameValidation.isValid).toBe(true);

            // Validate path security
            const securityValidation = validatePathSecurity(folderName);
            expect(securityValidation.isValid).toBe(true);

            // Validate index format
            const indexValidation = validateIndexFormat(String(targetIndex));
            expect(indexValidation.isValid).toBe(true);

            // Validate move operation
            const moveContext: ValidationContext = {
                folderName,
                targetIndex,
                currentIndex: 1,
                isSpecialCurrent: false,
                isSpecialTarget: false,
            };
            const moveValidation = validateIndexMove(moveContext);
            expect(moveValidation.isValid).toBe(true);

            // Combine all validations
            const combined = combineValidationResults([
                nameValidation,
                securityValidation,
                indexValidation,
                moveValidation,
            ]);
            expect(combined.isValid).toBe(true);
        });

        it('should detect and report security issues', () => {
            const maliciousFolderName = '../../../etc/passwd';

            const validations = [
                validateFolderName(maliciousFolderName),
                validatePathSecurity(maliciousFolderName),
            ];

            const combined = combineValidationResults(validations);
            expect(combined.isValid).toBe(false);
            expect(combined.errorCode).toBe('PATH_TRAVERSAL');
        });

        it('should handle special index restrictions', () => {
            const context: ValidationContext = {
                folderName: '00. Archive Folder',
                targetIndex: 1,
                currentIndex: 0,
                isSpecialCurrent: true,
                isSpecialTarget: false,
            };

            const moveValidation = validateIndexMove(context);
            expect(moveValidation.isValid).toBe(false);
            expect(moveValidation.errorCode).toBe('SPECIAL_INDEX_SOURCE');

            // Even if other validations pass, the move should fail
            const otherValidations = [
                validateFolderName(context.folderName),
                validatePathSecurity(context.folderName),
                validateIndexFormat(String(context.targetIndex)),
            ];

            const combined = combineValidationResults([
                ...otherValidations,
                moveValidation,
            ]);
            expect(combined.isValid).toBe(false);
        });
    });
});
