/**
 * Simple logger helper for Indexable Folders Plugin
 * Adds colored prefix to console output
 */

const PREFIX = 'Indexable Folders Plugin:';
const PREFIX_COLOR = '#4CAF50'; // Green color

/**
 * Log a message with colored prefix
 */
export function log(...args: any[]) {
    console.log(
        `%c${PREFIX}`,
        `color: ${PREFIX_COLOR}; font-weight: bold;`,
        ...args
    );
}
