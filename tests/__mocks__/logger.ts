import { vi } from 'vitest';

/**
 * Shared mock for logger utility
 * Import this in test files that need to mock the logger module
 */
export const log = vi.fn();
