import { describe, it, expect } from 'vitest';

describe('Hello World', () => {
    it('should pass a simple test', () => {
        expect(true).toBe(true);
    });

    it('should perform basic arithmetic', () => {
        expect(1 + 1).toBe(2);
    });

    it('should handle string operations', () => {
        const greeting = 'Hello, World!';
        expect(greeting).toContain('World');
        expect(greeting.length).toBe(13);
    });
});
