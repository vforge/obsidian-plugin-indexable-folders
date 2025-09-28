/**
 * Pure helper functions for the Obsidian Indexable Folders plugin
 *
 * These modules contain algorithms and logic extracted from the main plugin code
 * to enable easy unit testing without Obsidian dependencies.
 *
 * Each helper module focuses on a specific domain:
 * - regexHelpers: Pattern matching and regex generation
 * - indexingHelpers: Folder indexing algorithms and operations
 * - validationHelpers: Input validation and security checks
 * - domHelpers: DOM manipulation patterns and analysis
 */

export * from './domHelpers';
export * from './indexingHelpers';
export * from './regexHelpers';
export * from './validationHelpers';
