/**
 * Pure helper functions for regex pattern generation and matching
 * These functions contain no Obsidian dependencies and can be easily tested
 */

export interface RegexSettings {
    separator: string;
    specialPrefixes: string;
}

/**
 * Escapes special regex characters in a string
 * @param input - The string to escape
 * @returns Escaped string safe for regex use
 */
export function escapeRegexChars(input: string): string {
    return input.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
}

/**
 * Generates a regex pattern for matching folder prefixes (numeric and special)
 * @param settings - The regex settings containing separator and special prefixes
 * @returns RegExp for matching prefixes
 */
export function generatePrefixRegex(settings: RegexSettings): RegExp {
    const special = settings.specialPrefixes
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => escapeRegexChars(p));

    const escapedSeparator = escapeRegexChars(settings.separator);
    const pattern = `^((?:\\d+)|(?:${special.join('|')}))${escapedSeparator}`;
    return new RegExp(pattern, 'i');
}

/**
 * Generates a regex pattern for matching numeric folder prefixes only
 * @param settings - The regex settings containing separator
 * @returns RegExp for matching numeric prefixes
 */
export function generateNumericPrefixRegex(settings: RegexSettings): RegExp {
    const escapedSeparator = escapeRegexChars(settings.separator);
    const pattern = `^(\\d+)${escapedSeparator}`;
    return new RegExp(pattern);
}

/**
 * Extracts the prefix from a folder name using the provided regex
 * @param folderName - The folder name to parse
 * @param regex - The regex pattern to match against
 * @returns The matched prefix or null if no match
 */
export function extractPrefix(
    folderName: string,
    regex: RegExp
): string | null {
    const match = folderName.match(regex);
    return match ? match[1] : null;
}

/**
 * Checks if a folder name matches the prefix pattern
 * @param folderName - The folder name to test
 * @param regex - The regex pattern to test against
 * @returns True if the folder name has a matching prefix
 */
export function hasPrefix(folderName: string, regex: RegExp): boolean {
    return regex.test(folderName);
}
