import { describe, test, expect } from 'vitest';

describe('Test Infrastructure', () => {
    test('hello world - vitest is working', () => {
        // Simple hello world test to verify the testing infrastructure works
        const greeting = 'Hello, World!';
        expect(greeting).toBe('Hello, World!');
        expect(typeof greeting).toBe('string');
        expect(greeting.length).toBeGreaterThan(0);
    });

    test('basic math operations work', () => {
        // Basic arithmetic test
        expect(2 + 2).toBe(4);
        expect(5 * 3).toBe(15);
        expect(10 / 2).toBe(5);
    });

    test('array operations work', () => {
        // Basic array operations test
        const arr = [1, 2, 3];
        expect(arr.length).toBe(3);
        expect(arr).toContain(2);
        expect(arr.map((x) => x * 2)).toEqual([2, 4, 6]);
    });
});
