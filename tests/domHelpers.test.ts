import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    ElementInfo,
    BatchUpdate,
    parsePrefixFromText,
    analyzeElements,
    groupElementsForProcessing,
    calculateDOMUpdates,
    executeBatchUpdates,
    revertElementPrefix,
    getElementStatistics,
} from '../src/helpers/domHelpers';

// Mock DOM environment for testing
const createMockElement = (textContent: string): Element => {
    const element = document.createElement('div');
    element.textContent = textContent;
    return element;
};

const createMockElementWithPrefix = (
    textContent: string,
    originalName: string
): Element => {
    const element = document.createElement('div');
    const span = document.createElement('span');
    span.classList.add('indexable-folder-prefix');
    span.setAttribute('data-original-name', originalName);
    span.textContent = textContent.split('. ')[0];
    element.appendChild(span);
    element.appendChild(
        document.createTextNode('. ' + textContent.split('. ')[1])
    );
    return element;
};

describe('domHelpers', () => {
    const numericRegex = /^(\d+)\. /;

    describe('parsePrefixFromText', () => {
        it('should parse text with numeric prefixes', () => {
            const result = parsePrefixFromText('01. My Folder', numericRegex);
            expect(result).toEqual({
                fullMatch: '01. ',
                prefixValue: '01',
                remainingText: 'My Folder',
                isNumeric: true,
            });
        });

        it('should handle different prefix patterns', () => {
            const result = parsePrefixFromText(
                '123. Another Folder',
                numericRegex
            );
            expect(result).toEqual({
                fullMatch: '123. ',
                prefixValue: '123',
                remainingText: 'Another Folder',
                isNumeric: true,
            });
        });

        it('should return null for non-matching text', () => {
            expect(
                parsePrefixFromText('No Prefix Here', numericRegex)
            ).toBeNull();
            expect(
                parsePrefixFromText('TODO. Special', numericRegex)
            ).toBeNull();
            expect(parsePrefixFromText('', numericRegex)).toBeNull();
        });

        it('should return null for null text content', () => {
            expect(parsePrefixFromText(null, numericRegex)).toBeNull();
        });

        it('should handle special prefix patterns', () => {
            const specialRegex = /^(TODO|DRAFT|ARCHIVE)\. /i;
            const result = parsePrefixFromText(
                'TODO. Important Task',
                specialRegex
            );
            expect(result).toEqual({
                fullMatch: 'TODO. ',
                prefixValue: 'TODO',
                remainingText: 'Important Task',
                isNumeric: false,
            });
        });

        it('should handle empty remaining text', () => {
            const result = parsePrefixFromText('01. ', numericRegex);
            expect(result).toEqual({
                fullMatch: '01. ',
                prefixValue: '01',
                remainingText: '',
                isNumeric: true,
            });
        });
    });

    describe('analyzeElements', () => {
        let elements: Element[];

        beforeEach(() => {
            elements = [
                createMockElement('01. First Folder'),
                createMockElement('02. Second Folder'),
                createMockElement('No Prefix Folder'),
                createMockElement('123. Long Index'),
                createMockElement(''),
            ];
        });

        it('should analyze elements and extract prefix information', () => {
            const results = analyzeElements(elements, numericRegex);

            expect(results).toHaveLength(5);
            expect(results[0]).toEqual({
                element: elements[0],
                textContent: '01. First Folder',
                hasPrefix: true,
                prefixValue: '01',
                originalName: '01. First Folder',
            });
            expect(results[2]).toEqual({
                element: elements[2],
                textContent: 'No Prefix Folder',
                hasPrefix: false,
                prefixValue: undefined,
                originalName: 'No Prefix Folder',
            });
        });

        it('should handle empty text content', () => {
            const results = analyzeElements(elements, numericRegex);
            const emptyElement = results[4];

            expect(emptyElement.hasPrefix).toBe(false);
            expect(emptyElement.textContent).toBe('');
            expect(emptyElement.originalName).toBe('');
        });

        it('should handle empty elements array', () => {
            const results = analyzeElements([], numericRegex);
            expect(results).toHaveLength(0);
        });
    });

    describe('groupElementsForProcessing', () => {
        let elementInfos: ElementInfo[];

        beforeEach(() => {
            const elements = [
                createMockElement('01. New Folder'),
                createMockElementWithPrefix(
                    '02. Processed Folder',
                    '02. Processed Folder'
                ),
                createMockElement('No Prefix'),
                createMockElement('03. Another New'),
            ];

            elementInfos = analyzeElements(elements, numericRegex);
        });

        it('should group elements correctly without force refresh', () => {
            const groups = groupElementsForProcessing(elementInfos, false);

            expect(groups.toProcess).toHaveLength(2); // New folders with prefixes
            expect(groups.toSkip).toHaveLength(2); // Already processed + no prefix

            // Should process new folders with prefixes
            expect(groups.toProcess[0].textContent).toBe('01. New Folder');
            expect(groups.toProcess[1].textContent).toBe('03. Another New');
        });

        it('should force refresh all elements when requested', () => {
            const groups = groupElementsForProcessing(elementInfos, true);

            // When force refresh is true, should process elements that have prefixes
            expect(groups.toProcess.length).toBeGreaterThan(0);

            // Check if elements with existing prefix spans are included for processing
            const processedElements = groups.toProcess.filter((info) =>
                info.element.querySelector('span.indexable-folder-prefix')
            );
            expect(processedElements.length).toBeGreaterThan(0);
        });

        it('should handle elements without prefixes correctly', () => {
            const groups = groupElementsForProcessing(elementInfos, false);

            const skippedNoPrefixElements = groups.toSkip.filter(
                (info) => !info.hasPrefix
            );
            expect(skippedNoPrefixElements).toHaveLength(1);
            expect(skippedNoPrefixElements[0].textContent).toBe('No Prefix');
        });

        it('should handle empty element array', () => {
            const groups = groupElementsForProcessing([], false);
            expect(groups.toProcess).toHaveLength(0);
            expect(groups.toSkip).toHaveLength(0);
        });
    });

    describe('calculateDOMUpdates', () => {
        let elementsToProcess: ElementInfo[];

        beforeEach(() => {
            const elements = [
                createMockElement('01. First Folder'),
                createMockElement('02. Second Folder'),
                createMockElement('No Prefix'),
            ];

            const analyzed = analyzeElements(elements, numericRegex);
            elementsToProcess = analyzed.filter((info) => info.hasPrefix);
        });

        it('should calculate DOM updates for elements with prefixes', () => {
            const updates = calculateDOMUpdates(
                elementsToProcess,
                numericRegex
            );

            expect(updates).toHaveLength(2);
            expect(updates[0].element).toBe(elementsToProcess[0].element);
            expect(updates[0].operations).toHaveLength(2); // Clear + Create/Append
        });

        it('should skip elements without prefixes', () => {
            const allElements = analyzeElements(
                [createMockElement('No Prefix Folder')],
                numericRegex
            );
            const updates = calculateDOMUpdates(allElements, numericRegex);

            expect(updates).toHaveLength(0);
        });

        it('should handle empty elements array', () => {
            const updates = calculateDOMUpdates([], numericRegex);
            expect(updates).toHaveLength(0);
        });

        it('should create proper operations for DOM manipulation', () => {
            const updates = calculateDOMUpdates(
                elementsToProcess,
                numericRegex
            );
            const firstUpdate = updates[0];

            expect(firstUpdate.operations).toHaveLength(2);

            // Operations should be functions
            firstUpdate.operations.forEach((operation) => {
                expect(typeof operation).toBe('function');
            });
        });
    });

    describe('executeBatchUpdates', () => {
        let batchUpdates: BatchUpdate[];
        let elements: Element[];

        beforeEach(() => {
            elements = [
                createMockElement('01. Test Folder'),
                createMockElement('02. Another Folder'),
            ];

            // Create mock batch updates
            batchUpdates = elements.map((element) => ({
                element,
                operations: [
                    () => {
                        element.textContent = '';
                    },
                    () => {
                        const span = document.createElement('span');
                        span.classList.add('indexable-folder-prefix');
                        span.textContent = '01';
                        element.appendChild(span);
                        element.appendChild(document.createTextNode('. Test'));
                    },
                ],
            }));
        });

        it('should execute all operations successfully', () => {
            const successCount = executeBatchUpdates(batchUpdates);

            expect(successCount).toBe(2);

            // Verify DOM was modified
            elements.forEach((element) => {
                expect(
                    element.querySelector('span.indexable-folder-prefix')
                ).toBeTruthy();
            });
        });

        it('should handle errors in operations gracefully', () => {
            const errorBatch: BatchUpdate = {
                element: elements[0],
                operations: [
                    () => {
                        throw new Error('Test error');
                    },
                ],
            };

            const errorHandler = vi.fn();
            const successCount = executeBatchUpdates(
                [errorBatch],
                errorHandler
            );

            expect(successCount).toBe(0);
            expect(errorHandler).toHaveBeenCalledWith(
                expect.any(Error),
                elements[0]
            );
        });

        it('should continue processing after individual failures', () => {
            const mixedBatch: BatchUpdate[] = [
                {
                    element: elements[0],
                    operations: [
                        () => {
                            throw new Error('This will fail');
                        },
                    ],
                },
                batchUpdates[1], // This should succeed
            ];

            const successCount = executeBatchUpdates(mixedBatch);
            expect(successCount).toBe(1);
        });

        it('should handle empty batch updates', () => {
            const successCount = executeBatchUpdates([]);
            expect(successCount).toBe(0);
        });
    });

    describe('revertElementPrefix', () => {
        let processedElement: Element;
        let originalName: string;

        beforeEach(() => {
            originalName = '01. Original Name';
            processedElement = createMockElementWithPrefix(
                '01. Modified Name',
                originalName
            );
        });

        it('should revert element to original name', () => {
            const success = revertElementPrefix(processedElement);

            expect(success).toBe(true);
            expect(processedElement.textContent).toBe(originalName);
        });

        it('should return false for elements without prefix spans', () => {
            const plainElement = createMockElement('Plain Text');
            const success = revertElementPrefix(plainElement);

            expect(success).toBe(false);
        });

        it('should return false for elements without original name data', () => {
            const element = document.createElement('div');
            const span = document.createElement('span');
            span.classList.add('indexable-folder-prefix');
            // No data-original-name attribute
            element.appendChild(span);

            const success = revertElementPrefix(element);
            expect(success).toBe(false);
        });

        it('should handle custom prefix span selectors', () => {
            const element = document.createElement('div');
            const span = document.createElement('span');
            span.classList.add('custom-prefix-class');
            span.setAttribute('data-original-name', 'Custom Original');
            element.appendChild(span);

            const success = revertElementPrefix(
                element,
                'span.custom-prefix-class'
            );

            expect(success).toBe(true);
            expect(element.textContent).toBe('Custom Original');
        });
    });

    describe('getElementStatistics', () => {
        let elementInfos: ElementInfo[];

        beforeEach(() => {
            const elements = [
                createMockElement('01. With Prefix'),
                createMockElement('02. Another Prefix'),
                createMockElement('No Prefix Here'),
                createMockElementWithPrefix(
                    '03. Already Processed',
                    '03. Original'
                ),
                createMockElement('Also No Prefix'),
            ];

            elementInfos = analyzeElements(elements, numericRegex);
        });

        it('should calculate correct statistics', () => {
            const stats = getElementStatistics(elementInfos);

            expect(stats.total).toBe(5);
            expect(stats.withPrefix).toBe(3); // Including already processed
            expect(stats.withoutPrefix).toBe(2);
            expect(stats.alreadyProcessed).toBe(1); // Only the one with span
        });

        it('should handle empty array', () => {
            const stats = getElementStatistics([]);

            expect(stats).toEqual({
                total: 0,
                withPrefix: 0,
                withoutPrefix: 0,
                alreadyProcessed: 0,
            });
        });

        it('should handle array with only prefix elements', () => {
            const elements = [
                createMockElement('01. First'),
                createMockElement('02. Second'),
                createMockElement('03. Third'),
            ];
            const analyzed = analyzeElements(elements, numericRegex);
            const stats = getElementStatistics(analyzed);

            expect(stats.total).toBe(3);
            expect(stats.withPrefix).toBe(3);
            expect(stats.withoutPrefix).toBe(0);
            expect(stats.alreadyProcessed).toBe(0);
        });

        it('should handle array with only non-prefix elements', () => {
            const elements = [
                createMockElement('No Prefix 1'),
                createMockElement('No Prefix 2'),
                createMockElement('No Prefix 3'),
            ];
            const analyzed = analyzeElements(elements, numericRegex);
            const stats = getElementStatistics(analyzed);

            expect(stats.total).toBe(3);
            expect(stats.withPrefix).toBe(0);
            expect(stats.withoutPrefix).toBe(3);
            expect(stats.alreadyProcessed).toBe(0);
        });
    });

    describe('integration tests', () => {
        it('should handle complete DOM processing workflow', () => {
            // Setup elements
            const elements = [
                createMockElement('01. New Folder'),
                createMockElement('02. Another New'),
                createMockElementWithPrefix('03. Already Done', '03. Original'),
                createMockElement('No Prefix'),
            ];

            // Analyze elements
            const analyzed = analyzeElements(elements, numericRegex);
            expect(analyzed).toHaveLength(4);

            // Group for processing
            const groups = groupElementsForProcessing(analyzed, false);
            expect(groups.toProcess).toHaveLength(2); // Two new folders

            // Calculate updates
            const updates = calculateDOMUpdates(groups.toProcess, numericRegex);
            expect(updates).toHaveLength(2);

            // Execute updates
            const successCount = executeBatchUpdates(updates);
            expect(successCount).toBe(2);

            // Verify results
            elements.forEach((element, index) => {
                if (index < 2) {
                    // First two should now have prefix spans
                    expect(
                        element.querySelector('span.indexable-folder-prefix')
                    ).toBeTruthy();
                }
            });

            // Check statistics after processing
            const finalAnalyzed = analyzeElements(elements, numericRegex);
            const stats = getElementStatistics(finalAnalyzed);
            expect(stats.alreadyProcessed).toBe(3); // Now 3 are processed
        });

        it('should handle force refresh workflow', () => {
            const originalName = '01. Original Name';
            const elements = [
                createMockElementWithPrefix('01. Modified', originalName),
            ];

            // Force refresh workflow
            const analyzed = analyzeElements(elements, numericRegex);
            const groups = groupElementsForProcessing(analyzed, true);

            expect(groups.toProcess).toHaveLength(1);
            expect(groups.toProcess[0].originalName).toBe(originalName);

            // Verify reversion capability
            const reverted = revertElementPrefix(elements[0]);
            expect(reverted).toBe(true);
            expect(elements[0].textContent).toBe(originalName);
        });

        it('should maintain data integrity through processing cycles', () => {
            const element = createMockElement('01. Test Folder');
            const originalText = element.textContent;

            // Process -> Revert -> Process cycle
            const analyzed = analyzeElements([element], numericRegex);
            const updates = calculateDOMUpdates(analyzed, numericRegex);
            executeBatchUpdates(updates);

            // Should have prefix span now
            expect(
                element.querySelector('span.indexable-folder-prefix')
            ).toBeTruthy();

            // Revert
            const reverted = revertElementPrefix(element);
            expect(reverted).toBe(true);
            expect(element.textContent).toBe(originalText);

            // Should be able to process again
            const reAnalyzed = analyzeElements([element], numericRegex);
            expect(reAnalyzed[0].hasPrefix).toBe(true);
        });
    });
});
