/**
 * Simple logger helper for Indexable Folders Plugin
 * Adds colored prefix to console output
 */

const PREFIX = 'Indexable Folders Plugin:';
const PREFIX_COLOR = '#4CAF50'; // Green color

/**
 * Log a message with colored prefix (only if debugging is enabled)
 */
export function log(debugEnabled: boolean, ...args: any[]) {
    if (!debugEnabled) {
        return;
    }

    console.log(
        `%c${PREFIX}`,
        `color: ${PREFIX_COLOR}; font-weight: bold;`,
        ...args
    );
}
