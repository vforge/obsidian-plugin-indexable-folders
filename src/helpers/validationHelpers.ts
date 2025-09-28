/**
 * Pure helper functions for folder validation logic
 * These functions contain no Obsidian dependencies and can be easily tested
 */

export interface ValidationResult {
    isValid: boolean;
    errorMessage?: string;
    errorCode?: string;
}

export interface ValidationContext {
    folderName: string;
    targetIndex: number;
    currentIndex?: number;
    isSpecialCurrent?: boolean;
    isSpecialTarget?: boolean;
}

/**
 * Validates if a folder can be moved to a specific index
 * @param context - The validation context
 * @returns ValidationResult indicating if the move is allowed
 */
export function validateIndexMove(
    context: ValidationContext
): ValidationResult {
    const {
        folderName,
        targetIndex,
        currentIndex,
        isSpecialCurrent,
        isSpecialTarget,
    } = context;

    // Check if current folder has a special index that shouldn't be moved
    if (isSpecialCurrent) {
        return {
            isValid: false,
            errorMessage: `Cannot move folder with special index: ${folderName}`,
            errorCode: 'SPECIAL_INDEX_SOURCE',
        };
    }

    // Check if target index is special
    if (isSpecialTarget) {
        return {
            isValid: false,
            errorMessage: `Cannot move to special index position: ${targetIndex}`,
            errorCode: 'SPECIAL_INDEX_TARGET',
        };
    }

    // Check if moving to same position
    if (currentIndex !== undefined && targetIndex === currentIndex) {
        return {
            isValid: false,
            errorMessage: 'Folder is already at the target position',
            errorCode: 'SAME_POSITION',
        };
    }

    // Check for invalid target index
    if (targetIndex < 1) {
        return {
            isValid: false,
            errorMessage: 'Target index must be greater than 0',
            errorCode: 'INVALID_INDEX',
        };
    }

    return {
        isValid: true,
    };
}

/**
 * Validates folder name format and constraints
 * @param folderName - The folder name to validate
 * @param maxLength - Maximum allowed folder name length (optional)
 * @returns ValidationResult indicating if the folder name is valid
 */
export function validateFolderName(
    folderName: string,
    maxLength?: number
): ValidationResult {
    // Check if folder name is empty
    if (!folderName || folderName.trim().length === 0) {
        return {
            isValid: false,
            errorMessage: 'Folder name cannot be empty',
            errorCode: 'EMPTY_NAME',
        };
    }

    // Check for maximum length
    if (maxLength && folderName.length > maxLength) {
        return {
            isValid: false,
            errorMessage: `Folder name exceeds maximum length of ${maxLength} characters`,
            errorCode: 'NAME_TOO_LONG',
        };
    }

    // Check for invalid characters (basic validation)
    const invalidChars = /[<>:"|?*]/;
    if (invalidChars.test(folderName)) {
        return {
            isValid: false,
            errorMessage:
                'Folder name contains invalid characters: < > : " | ? *',
            errorCode: 'INVALID_CHARACTERS',
        };
    }

    // Check for reserved names (Windows)
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
    if (reservedNames.test(folderName)) {
        return {
            isValid: false,
            errorMessage: 'Folder name uses a reserved system name',
            errorCode: 'RESERVED_NAME',
        };
    }

    return {
        isValid: true,
    };
}

/**
 * Validates if a path component contains potential security risks
 * @param pathComponent - The path component to validate
 * @returns ValidationResult indicating if the path is safe
 */
export function validatePathSecurity(pathComponent: string): ValidationResult {
    // Check for path traversal attempts
    if (pathComponent.includes('..')) {
        return {
            isValid: false,
            errorMessage: 'Path traversal detected in folder name',
            errorCode: 'PATH_TRAVERSAL',
        };
    }

    // Check for absolute paths
    if (
        pathComponent.startsWith('/') ||
        /^[A-Za-z]:[\\//]/.test(pathComponent) ||
        pathComponent.startsWith('\\\\')
    ) {
        return {
            isValid: false,
            errorMessage: 'Absolute paths are not allowed in folder names',
            errorCode: 'ABSOLUTE_PATH',
        };
    }

    // Check for hidden files/folders (starting with .)
    if (pathComponent.startsWith('.')) {
        return {
            isValid: false,
            errorMessage: 'Hidden folder names are not recommended',
            errorCode: 'HIDDEN_FOLDER',
        };
    }

    return {
        isValid: true,
    };
}

/**
 * Validates index format and constraints
 * @param indexStr - The index string to validate
 * @param maxIndex - Maximum allowed index value (optional)
 * @returns ValidationResult indicating if the index is valid
 */
export function validateIndexFormat(
    indexStr: string,
    maxIndex?: number
): ValidationResult {
    // Check if index is numeric
    if (!/^\d+$/.test(indexStr)) {
        return {
            isValid: false,
            errorMessage: 'Index must be numeric',
            errorCode: 'NON_NUMERIC_INDEX',
        };
    }

    const index = parseInt(indexStr, 10);

    // Check for valid range
    if (index < 1) {
        return {
            isValid: false,
            errorMessage: 'Index must be greater than 0',
            errorCode: 'INVALID_INDEX_RANGE',
        };
    }

    if (maxIndex && index > maxIndex) {
        return {
            isValid: false,
            errorMessage: `Index exceeds maximum value of ${maxIndex}`,
            errorCode: 'INDEX_TOO_LARGE',
        };
    }

    return {
        isValid: true,
    };
}

/**
 * Combines multiple validation results
 * @param results - Array of validation results to combine
 * @returns Combined validation result (fails if any individual result fails)
 */
export function combineValidationResults(
    results: ValidationResult[]
): ValidationResult {
    for (const result of results) {
        if (!result.isValid) {
            return result;
        }
    }

    return {
        isValid: true,
    };
}
