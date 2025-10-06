import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { log } from '../src/utils/logger';

describe('logger', () => {
    describe('log', () => {
        // Store original console.log
        let consoleLogSpy: ReturnType<typeof vi.spyOn>;

        beforeEach(() => {
            // Spy on console.log before each test
            consoleLogSpy = vi
                .spyOn(console, 'log')
                .mockImplementation(() => {});
        });

        afterEach(() => {
            // Restore console.log after each test
            consoleLogSpy.mockRestore();
        });

        it('should log message when debug is enabled', () => {
            const message = 'Test message';
            log(true, message);

            expect(consoleLogSpy).toHaveBeenCalledTimes(1);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                '%cIndexable Folders Plugin:',
                'color: #4CAF50; font-weight: bold;',
                message
            );
        });

        it('should not log message when debug is disabled', () => {
            const message = 'Test message';
            log(false, message);

            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        it('should handle multiple arguments', () => {
            const arg1 = 'First';
            const arg2 = 'Second';
            const arg3 = 123;
            log(true, arg1, arg2, arg3);

            expect(consoleLogSpy).toHaveBeenCalledTimes(1);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                '%cIndexable Folders Plugin:',
                'color: #4CAF50; font-weight: bold;',
                arg1,
                arg2,
                arg3
            );
        });

        it('should handle objects and arrays', () => {
            const obj = { key: 'value', nested: { data: 'test' } };
            const arr = [1, 2, 3];
            log(true, obj, arr);

            expect(consoleLogSpy).toHaveBeenCalledTimes(1);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                '%cIndexable Folders Plugin:',
                'color: #4CAF50; font-weight: bold;',
                obj,
                arr
            );
        });

        it('should handle undefined and null values', () => {
            log(true, undefined, null);

            expect(consoleLogSpy).toHaveBeenCalledTimes(1);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                '%cIndexable Folders Plugin:',
                'color: #4CAF50; font-weight: bold;',
                undefined,
                null
            );
        });

        it('should handle no arguments besides debug flag', () => {
            log(true);

            expect(consoleLogSpy).toHaveBeenCalledTimes(1);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                '%cIndexable Folders Plugin:',
                'color: #4CAF50; font-weight: bold;'
            );
        });

        it('should handle error objects', () => {
            const error = new Error('Test error');
            log(true, 'Error occurred:', error);

            expect(consoleLogSpy).toHaveBeenCalledTimes(1);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                '%cIndexable Folders Plugin:',
                'color: #4CAF50; font-weight: bold;',
                'Error occurred:',
                error
            );
        });

        it('should use correct color code in prefix', () => {
            log(true, 'test');

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining('#4CAF50'),
                expect.anything()
            );
        });

        it('should use bold font weight in prefix', () => {
            log(true, 'test');

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining('font-weight: bold'),
                expect.anything()
            );
        });

        it('should include plugin name in prefix', () => {
            log(true, 'test');

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('Indexable Folders Plugin:'),
                expect.any(String),
                expect.anything()
            );
        });

        it('should handle boolean debug flag correctly - true', () => {
            log(true, 'message');
            expect(consoleLogSpy).toHaveBeenCalled();
        });

        it('should handle boolean debug flag correctly - false', () => {
            log(false, 'message');
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        it('should not call console.log multiple times for single invocation', () => {
            log(true, 'single call');
            expect(consoleLogSpy).toHaveBeenCalledTimes(1);
        });

        it('should handle multiple sequential calls when debug enabled', () => {
            log(true, 'First call');
            log(true, 'Second call');
            log(true, 'Third call');

            expect(consoleLogSpy).toHaveBeenCalledTimes(3);
        });

        it('should not accumulate calls when debug disabled', () => {
            log(false, 'First call');
            log(false, 'Second call');
            log(false, 'Third call');

            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        it('should handle mixed debug enabled/disabled calls', () => {
            log(true, 'Logged');
            log(false, 'Not logged');
            log(true, 'Logged again');

            expect(consoleLogSpy).toHaveBeenCalledTimes(2);
        });
    });
});
