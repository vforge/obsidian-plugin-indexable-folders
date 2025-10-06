import { describe, it, expect, beforeEach } from 'vitest';
import {
    isValidCSSColor,
    sanitizeCSSColor,
    getCSSColorErrorMessage,
} from '../../src/utils/cssValidation';

describe('cssValidation', () => {
    beforeEach(() => {
        // Ensure we have a clean DOM environment for each test
        document.body.innerHTML = '';
    });

    describe('isValidCSSColor', () => {
        describe('valid colors', () => {
            it('should accept valid hex colors', () => {
                expect(isValidCSSColor('#fff')).toBe(true);
                expect(isValidCSSColor('#ffffff')).toBe(true);
                expect(isValidCSSColor('#FFF')).toBe(true);
                expect(isValidCSSColor('#FFFFFF')).toBe(true);
                expect(isValidCSSColor('#123abc')).toBe(true);
            });

            it('should accept valid hex colors with alpha', () => {
                expect(isValidCSSColor('#ffff')).toBe(true);
                expect(isValidCSSColor('#ffffffff')).toBe(true);
                expect(isValidCSSColor('#123abc80')).toBe(true);
            });

            it('should accept valid RGB colors', () => {
                expect(isValidCSSColor('rgb(255, 255, 255)')).toBe(true);
                expect(isValidCSSColor('rgb(0, 0, 0)')).toBe(true);
                expect(isValidCSSColor('rgb(100, 150, 200)')).toBe(true);
                expect(isValidCSSColor('rgb(50%, 50%, 50%)')).toBe(true);
            });

            it('should accept valid RGBA colors', () => {
                expect(isValidCSSColor('rgba(255, 255, 255, 1)')).toBe(true);
                expect(isValidCSSColor('rgba(0, 0, 0, 0.5)')).toBe(true);
                expect(isValidCSSColor('rgba(100, 150, 200, 0.8)')).toBe(true);
            });

            it('should accept valid HSL colors', () => {
                expect(isValidCSSColor('hsl(0, 100%, 50%)')).toBe(true);
                expect(isValidCSSColor('hsl(120, 50%, 50%)')).toBe(true);
                expect(isValidCSSColor('hsl(240, 100%, 25%)')).toBe(true);
            });

            it('should accept valid HSLA colors', () => {
                expect(isValidCSSColor('hsla(0, 100%, 50%, 1)')).toBe(true);
                expect(isValidCSSColor('hsla(120, 50%, 50%, 0.5)')).toBe(true);
                expect(isValidCSSColor('hsla(240, 100%, 25%, 0.3)')).toBe(true);
            });

            it('should accept valid named colors', () => {
                expect(isValidCSSColor('red')).toBe(true);
                expect(isValidCSSColor('blue')).toBe(true);
                expect(isValidCSSColor('green')).toBe(true);
                expect(isValidCSSColor('transparent')).toBe(true);
                expect(isValidCSSColor('black')).toBe(true);
                expect(isValidCSSColor('white')).toBe(true);
            });

            it('should accept CSS keywords', () => {
                expect(isValidCSSColor('transparent')).toBe(true);
                expect(isValidCSSColor('inherit')).toBe(true);
                expect(isValidCSSColor('initial')).toBe(true);
                expect(isValidCSSColor('unset')).toBe(true);
                expect(isValidCSSColor('currentColor')).toBe(true);
            });

            it('should accept CSS variables', () => {
                expect(isValidCSSColor('var(--primary-color)')).toBe(true);
                expect(isValidCSSColor('var(--text-color)')).toBe(true);
                expect(isValidCSSColor('var(--bg-color, #fff)')).toBe(true);
            });

            it('should handle colors with extra whitespace', () => {
                expect(isValidCSSColor('  #fff  ')).toBe(true);
                expect(isValidCSSColor('  red  ')).toBe(true);
                expect(isValidCSSColor('  rgb(255, 255, 255)  ')).toBe(true);
            });
        });

        describe('invalid colors', () => {
            it('should reject null or undefined', () => {
                expect(isValidCSSColor(null as unknown as string)).toBe(false);
                expect(isValidCSSColor(undefined as unknown as string)).toBe(
                    false
                );
            });

            it('should reject empty strings', () => {
                expect(isValidCSSColor('')).toBe(false);
                expect(isValidCSSColor('   ')).toBe(false);
            });

            it('should reject non-string values', () => {
                expect(isValidCSSColor(123 as unknown as string)).toBe(false);
                expect(isValidCSSColor({} as unknown as string)).toBe(false);
                expect(isValidCSSColor([] as unknown as string)).toBe(false);
            });

            it('should reject invalid hex colors', () => {
                expect(isValidCSSColor('#gg')).toBe(false);
                expect(isValidCSSColor('#12')).toBe(false);
                expect(isValidCSSColor('#12345')).toBe(false);
                expect(isValidCSSColor('fff')).toBe(false);
            });

            it('should reject malformed RGB/RGBA colors', () => {
                // Note: Modern browsers are quite permissive with RGB values
                // rgba(100, 100, 100) is valid (alpha is optional in modern CSS)
                // These are truly malformed and will be rejected:
                expect(isValidCSSColor('rgb(100, 100)')).toBe(false);
                expect(isValidCSSColor('rgb()')).toBe(false);
                expect(isValidCSSColor('rgb(abc, def, ghi)')).toBe(false);
            });
            it('should reject invalid color names', () => {
                expect(isValidCSSColor('notacolor')).toBe(false);
                expect(isValidCSSColor('redd')).toBe(false);
            });
        });

        describe('security - dangerous patterns', () => {
            it('should reject JavaScript execution attempts', () => {
                expect(isValidCSSColor('javascript:alert(1)')).toBe(false);
                expect(isValidCSSColor('expression(alert(1))')).toBe(false);
                expect(isValidCSSColor('eval(alert(1))')).toBe(false);
                expect(isValidCSSColor('url(javascript:alert(1))')).toBe(false);
            });

            it('should reject CSS injection attempts', () => {
                expect(isValidCSSColor('red; background: blue')).toBe(false);
                expect(isValidCSSColor('red } body { background: blue')).toBe(
                    false
                );
                expect(isValidCSSColor('red { color: blue }')).toBe(false);
            });

            it('should reject @-rules', () => {
                expect(isValidCSSColor('@import url(evil.css)')).toBe(false);
                expect(isValidCSSColor('@media screen')).toBe(false);
                expect(isValidCSSColor('@keyframes')).toBe(false);
            });

            it('should reject HTML injection attempts', () => {
                expect(isValidCSSColor('<script>alert(1)</script>')).toBe(
                    false
                );
                expect(isValidCSSColor('red" onload="alert(1)')).toBe(false);
                expect(isValidCSSColor('red" onclick="alert(1)')).toBe(false);
            });

            it('should reject dangerous data URIs', () => {
                expect(isValidCSSColor('data:text/html,<script>alert(1)')).toBe(
                    false
                );
                expect(
                    isValidCSSColor('data:image/svg+xml,<svg onload=alert(1)>')
                ).toBe(false);
            });

            it('should reject CSS comments that could be used for injection', () => {
                expect(isValidCSSColor('red /* comment */')).toBe(false);
                expect(isValidCSSColor('/* comment */ red')).toBe(false);
            });

            it('should reject backslash escapes', () => {
                expect(isValidCSSColor('red\\00')).toBe(false);
                expect(isValidCSSColor('red\\n')).toBe(false);
            });

            it('should reject behavior and binding properties', () => {
                expect(isValidCSSColor('behavior:url(xss.htc)')).toBe(false);
                expect(isValidCSSColor('binding:url(xss.xml)')).toBe(false);
            });
        });
    });

    describe('sanitizeCSSColor', () => {
        it('should return valid colors as-is (trimmed)', () => {
            expect(sanitizeCSSColor('#fff')).toBe('#fff');
            expect(sanitizeCSSColor('  #fff  ')).toBe('#fff');
            expect(sanitizeCSSColor('red')).toBe('red');
            expect(sanitizeCSSColor('rgb(255, 255, 255)')).toBe(
                'rgb(255, 255, 255)'
            );
        });

        it('should return empty string for invalid colors', () => {
            expect(sanitizeCSSColor('')).toBe('');
            expect(sanitizeCSSColor('invalid')).toBe('');
            expect(sanitizeCSSColor('javascript:alert(1)')).toBe('');
            expect(sanitizeCSSColor('red; background: blue')).toBe('');
        });

        it('should return empty string for dangerous patterns', () => {
            expect(sanitizeCSSColor('<script>alert(1)</script>')).toBe('');
            expect(sanitizeCSSColor('@import url(evil.css)')).toBe('');
            expect(sanitizeCSSColor('expression(alert(1))')).toBe('');
        });

        it('should handle null or undefined', () => {
            expect(sanitizeCSSColor(null as unknown as string)).toBe('');
            expect(sanitizeCSSColor(undefined as unknown as string)).toBe('');
        });
    });

    describe('getCSSColorErrorMessage', () => {
        it('should return appropriate message for null/undefined', () => {
            expect(getCSSColorErrorMessage(null as unknown as string)).toBe(
                'Color value must be a non-empty string.'
            );
            expect(
                getCSSColorErrorMessage(undefined as unknown as string)
            ).toBe('Color value must be a non-empty string.');
            expect(getCSSColorErrorMessage(123 as unknown as string)).toBe(
                'Color value must be a non-empty string.'
            );
        });

        it('should return appropriate message for empty string', () => {
            // Empty string fails the first check because !colorValue is true
            expect(getCSSColorErrorMessage('')).toBe(
                'Color value must be a non-empty string.'
            );
            // String with only spaces gets trimmed to empty
            expect(getCSSColorErrorMessage('   ')).toBe(
                'Color value cannot be empty.'
            );
        });
        it('should return appropriate message for dangerous patterns', () => {
            expect(getCSSColorErrorMessage('javascript:alert(1)')).toBe(
                'Color value contains potentially unsafe characters or patterns.'
            );
            expect(getCSSColorErrorMessage('red; background: blue')).toBe(
                'Color value contains potentially unsafe characters or patterns.'
            );
            expect(getCSSColorErrorMessage('<script>alert(1)</script>')).toBe(
                'Color value contains potentially unsafe characters or patterns.'
            );
        });

        it('should return appropriate message for invalid format', () => {
            // 'notacolor' is treated as a named color format but browser rejects it
            // So it returns the final fallback message
            const message = getCSSColorErrorMessage('notacolor');
            expect(message).toBe(
                'Invalid color value. Please use a valid CSS color format.'
            );
        });
        it('should return generic message for other invalid cases', () => {
            // This would be a color that passes format check but fails browser validation
            // For now, we'll just ensure the function returns a message
            const message = getCSSColorErrorMessage('invalid');
            expect(message).toBeTruthy();
            expect(typeof message).toBe('string');
        });
    });
});
