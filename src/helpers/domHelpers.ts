/**
 * Pure helper functions for DOM manipulation patterns
 * These functions contain minimal DOM dependencies and focus on algorithmic logic
 */

export interface ElementInfo {
    element: Element;
    textContent: string | null;
    hasPrefix: boolean;
    prefixValue?: string;
    originalName?: string;
}

export interface BatchUpdate {
    element: Element;
    operations: Array<() => void>;
}

export interface PrefixMatch {
    fullMatch: string;
    prefixValue: string;
    remainingText: string;
    isNumeric: boolean;
}

/**
 * Parses text content to extract prefix information
 * @param textContent - The text content to parse
 * @param prefixRegex - The regex pattern for matching prefixes
 * @returns PrefixMatch object or null if no match found
 */
export function parsePrefixFromText(
    textContent: string | null,
    prefixRegex: RegExp
): PrefixMatch | null {
    if (!textContent) {
        return null;
    }

    const match = textContent.match(prefixRegex);
    if (!match) {
        return null;
    }

    const fullMatch = match[0];
    const prefixValue = match[1];
    const remainingText = textContent.substring(fullMatch.length);
    const isNumeric = /^\d+$/.test(prefixValue);

    return {
        fullMatch,
        prefixValue,
        remainingText,
        isNumeric,
    };
}

/**
 * Analyzes a collection of elements to extract prefix information
 * @param elements - Array of DOM elements to analyze
 * @param prefixRegex - The regex pattern for matching prefixes
 * @returns Array of ElementInfo objects
 */
export function analyzeElements(
    elements: Element[],
    prefixRegex: RegExp
): ElementInfo[] {
    return elements.map((element) => {
        const textContent = element.textContent;
        const prefixMatch = parsePrefixFromText(textContent, prefixRegex);

        return {
            element,
            textContent,
            hasPrefix: prefixMatch !== null,
            prefixValue: prefixMatch?.prefixValue,
            originalName: textContent || undefined,
        };
    });
}

/**
 * Groups elements by their processing requirements
 * @param elementInfos - Array of element info objects
 * @param forceRefresh - Whether to force refresh all elements
 * @returns Object with arrays of elements to process and skip
 */
export function groupElementsForProcessing(
    elementInfos: ElementInfo[],
    forceRefresh = false
): {
    toProcess: ElementInfo[];
    toSkip: ElementInfo[];
} {
    const toProcess: ElementInfo[] = [];
    const toSkip: ElementInfo[] = [];

    for (const info of elementInfos) {
        const existingPrefixSpan = info.element.querySelector(
            'span.indexable-folder-prefix'
        );

        if (forceRefresh && existingPrefixSpan) {
            // Force refresh: restore original name first, then process
            const originalName =
                existingPrefixSpan.getAttribute('data-original-name');
            if (originalName) {
                info.element.textContent = originalName;
                info.textContent = originalName;
                info.originalName = originalName;
            }
            toProcess.push(info);
        } else if (existingPrefixSpan) {
            // Skip elements that already have prefix spans
            toSkip.push(info);
        } else if (info.hasPrefix) {
            // Process elements that have prefixes but no spans
            toProcess.push(info);
        } else {
            // Skip elements without prefixes
            toSkip.push(info);
        }
    }

    return { toProcess, toSkip };
}

/**
 * Calculates the DOM operations needed for prefix updates
 * @param elementsToProcess - Array of elements that need processing
 * @param prefixRegex - The regex pattern for matching prefixes
 * @returns Array of batch update objects
 */
export function calculateDOMUpdates(
    elementsToProcess: ElementInfo[],
    prefixRegex: RegExp
): BatchUpdate[] {
    const updates: BatchUpdate[] = [];

    for (const info of elementsToProcess) {
        if (!info.hasPrefix || !info.textContent) {
            continue;
        }

        const prefixMatch = parsePrefixFromText(info.textContent, prefixRegex);
        if (!prefixMatch) {
            continue;
        }

        const operations: Array<() => void> = [];

        // Operation 1: Clear existing content
        operations.push(() => {
            info.element.textContent = '';
        });

        // Operation 2: Create and append prefix span
        operations.push(() => {
            const fragment = document.createDocumentFragment();

            const label = document.createElement('span');
            label.textContent = prefixMatch.prefixValue;
            label.classList.add('indexable-folder-prefix');
            label.setAttribute('data-original-name', info.textContent || '');

            fragment.appendChild(label);
            fragment.appendChild(
                document.createTextNode(prefixMatch.remainingText)
            );

            info.element.appendChild(fragment);
        });

        updates.push({
            element: info.element,
            operations,
        });
    }

    return updates;
}

/**
 * Executes batch DOM updates efficiently
 * @param batchUpdates - Array of batch update objects
 * @param onError - Optional error handler for individual operations
 * @returns Number of successfully processed updates
 */
export function executeBatchUpdates(
    batchUpdates: BatchUpdate[],
    onError?: (error: Error, element: Element) => void
): number {
    let successCount = 0;

    for (const batch of batchUpdates) {
        try {
            // Execute all operations for this element in sequence
            for (const operation of batch.operations) {
                operation();
            }
            successCount++;
        } catch (error) {
            if (onError && error instanceof Error) {
                onError(error, batch.element);
            }
        }
    }

    return successCount;
}

/**
 * Reverts prefix modifications on an element
 * @param element - The element to revert
 * @param prefixSpanSelector - CSS selector for prefix spans (default: 'span.indexable-folder-prefix')
 * @returns True if reversion was successful, false otherwise
 */
export function revertElementPrefix(
    element: Element,
    prefixSpanSelector = 'span.indexable-folder-prefix'
): boolean {
    const prefixSpan = element.querySelector(prefixSpanSelector);
    if (!prefixSpan) {
        return false;
    }

    const originalName = prefixSpan.getAttribute('data-original-name');
    if (!originalName) {
        return false;
    }

    element.textContent = originalName;
    return true;
}

/**
 * Counts elements by their prefix status
 * @param elementInfos - Array of element info objects
 * @returns Object with counts of different element types
 */
export function getElementStatistics(elementInfos: ElementInfo[]): {
    total: number;
    withPrefix: number;
    withoutPrefix: number;
    alreadyProcessed: number;
} {
    const stats = {
        total: elementInfos.length,
        withPrefix: 0,
        withoutPrefix: 0,
        alreadyProcessed: 0,
    };

    for (const info of elementInfos) {
        if (info.hasPrefix) {
            stats.withPrefix++;
        } else {
            stats.withoutPrefix++;
        }

        if (info.element.querySelector('span.indexable-folder-prefix')) {
            stats.alreadyProcessed++;
        }
    }

    return stats;
}
