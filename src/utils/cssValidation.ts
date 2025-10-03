/**
 * CSS validation utilities to prevent CSS injection attacks
 */

/**
 * Validates if a string is a safe CSS color value
 * @param colorValue The color value to validate
 * @returns true if the color is valid and safe, false otherwise
 */
export function isValidCSSColor(colorValue: string): boolean {
    if (!colorValue || typeof colorValue !== 'string') {
        return false;
    }

    // Trim whitespace
    const trimmed = colorValue.trim();

    // Empty string is not valid
    if (trimmed === '') {
        return false;
    }

    // Check for potentially dangerous patterns
    if (containsDangerousPatterns(trimmed)) {
        return false;
    }

    // Test if it's a valid CSS color by trying to apply it to a test element
    return testCSSColorValue(trimmed);
}

/**
 * Sanitizes a CSS color value by removing dangerous patterns
 * @param colorValue The color value to sanitize
 * @returns The sanitized color value, or empty string if invalid
 */
export function sanitizeCSSColor(colorValue: string): string {
    if (!isValidCSSColor(colorValue)) {
        return '';
    }
    return colorValue.trim();
}

/**
 * Checks for potentially dangerous patterns in CSS values
 * @param value The CSS value to check
 * @returns true if dangerous patterns are found
 */
function containsDangerousPatterns(value: string): boolean {
    // Convert to lowercase for case-insensitive checks
    const lowerValue = value.toLowerCase();

    // Dangerous patterns that could be used for CSS injection
    const dangerousPatterns = [
        // JavaScript execution
        'javascript:',
        'expression(',
        'eval(',
        'url(javascript:',

        // CSS injection attempts
        'behavior:',
        'binding:',
        '@import',
        '@media',
        '@keyframes',
        '@-moz-document',

        // HTML injection attempts
        '<script',
        '</script',
        'onload=',
        'onerror=',
        'onclick=',

        // Data URIs with potential scripts
        'data:text/html',
        'data:image/svg+xml',

        // CSS property injection attempts
        ';',
        '}',
        '{',
        '/*',
        '*/',

        // Backslash escapes that might bypass filters
        '\\',
    ];

    return dangerousPatterns.some((pattern) => lowerValue.includes(pattern));
}

/**
 * Tests if a CSS color value is valid by applying it to a test element
 * @param colorValue The color value to test
 * @returns true if the color is valid
 */
function testCSSColorValue(colorValue: string): boolean {
    try {
        // Create a temporary element to test the color
        const testElement = document.createElement('div');
        // eslint-disable-next-line obsidianmd/no-static-styles-assignment
        testElement.style.display = 'none';

        // Store original color
        const originalColor = testElement.style.color;

        // Try to set the color
        testElement.style.color = colorValue;

        // Check if the color was actually set (browser validates CSS)
        const wasSet = testElement.style.color !== originalColor;

        // Additional validation: check if it's a recognized color format
        const isRecognizedFormat = isRecognizedColorFormat(colorValue);

        return wasSet && isRecognizedFormat;
    } catch {
        // If any error occurs during testing, consider it invalid
        return false;
    }
}

/**
 * Checks if the color value matches recognized CSS color formats
 * @param colorValue The color value to check
 * @returns true if it matches a recognized format
 */
function isRecognizedColorFormat(colorValue: string): boolean {
    const trimmed = colorValue.trim();

    // CSS color patterns
    const colorPatterns = [
        // Named colors (basic validation - allows letters, hyphens)
        /^[a-zA-Z][a-zA-Z0-9-]*$/,

        // Hex colors (#RGB, #RRGGBB, #RGBA, #RRGGBBAA)
        /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{8})$/,

        // RGB/RGBA functions
        /^rgba?\(\s*(\d+(?:\.\d+)?%?)\s*,\s*(\d+(?:\.\d+)?%?)\s*,\s*(\d+(?:\.\d+)?%?)\s*(?:,\s*(\d+(?:\.\d+)?|\d*\.\d+))?\s*\)$/,

        // HSL/HSLA functions
        /^hsla?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*(?:,\s*(\d+(?:\.\d+)?|\d*\.\d+))?\s*\)$/,

        // CSS custom properties (CSS variables)
        /^var\(\s*--[a-zA-Z0-9-_]+\s*(?:,\s*.+)?\s*\)$/,

        // Keywords
        /^(transparent|inherit|initial|unset|currentColor)$/i,
    ];

    return colorPatterns.some((pattern) => pattern.test(trimmed));
}

/**
 * Gets a user-friendly error message for invalid color values
 * @param colorValue The invalid color value
 * @returns A descriptive error message
 */
export function getCSSColorErrorMessage(colorValue: string): string {
    if (!colorValue || typeof colorValue !== 'string') {
        return 'Color value must be a non-empty string.';
    }

    const trimmed = colorValue.trim();

    if (trimmed === '') {
        return 'Color value cannot be empty.';
    }

    if (containsDangerousPatterns(trimmed)) {
        return 'Color value contains potentially unsafe characters or patterns.';
    }

    if (!isRecognizedColorFormat(trimmed)) {
        return 'Color value must be a valid CSS color (hex, rgb, hsl, named color, or CSS variable).';
    }

    return 'Invalid color value. Please use a valid CSS color format.';
}
