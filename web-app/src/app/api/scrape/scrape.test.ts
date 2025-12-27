import { extractMetadata } from './route';
import { describe, it, expect } from 'vitest';

describe('extractMetadata', () => {
    it('should extract metadata from LD+JSON', () => {
        const html = `
            <html>
                <body>
                    <script type="application/ld+json">
                    {
                        "@type": "Product",
                        "name": "Prusament PLA Prusa Orange 1kg",
                        "brand": { "name": "Prusament" },
                        "description": "High quality PLA filament"
                    }
                    </script>
                </body>
            </html>
        `;
        const result = extractMetadata(html, 'https://example.com');
        expect(result.brand).toBe('Prusament');
        expect(result.type).toBe('PLA');
        expect(result.weightTotal).toBe(1000);
    });

    it('should extract metadata from OpenGraph tags', () => {
        const html = `
            <html>
                <head>
                    <meta property="og:site_name" content="Bambu Lab" />
                    <meta property="og:title" content="Bambu PLA Basic Black" />
                </head>
                <body></body>
            </html>
        `;
        const result = extractMetadata(html, 'https://example.com');
        expect(result.brand).toBe('Bambu Lab');
        expect(result.type).toBe('PLA');
        expect(result.color).toBe('Black');
    });

    it('should fallback to heuristics if no structured data', () => {
        const html = `
            <html>
                <title>Sunlu PETG Red 1kg Filament</title>
                <body></body>
            </html>
        `;
        const result = extractMetadata(html, 'https://sunlu.com/product/123');
        expect(result.brand).toBe('Sunlu');
        expect(result.type).toBe('PETG');
        expect(result.color).toBe('Red');
        expect(result.weightTotal).toBe(1000);
    });

    it('should detect weight correctly with different units', () => {
        const html1 = '<title>Test Filament 800g</title>';
        expect(extractMetadata(html1, '').weightTotal).toBe(800);

        const html2 = '<title>Test Filament 2.2lbs</title>';
        // 2.2 lbs * 453.592 = ~998g -> rounded to 998
        // Wait, logic is val * 453.592. 2.2 * 453.592 = 997.9, rounded is 998. 
        // Typically 1kg is 2.2lbs, maybe the logic should round to nearest 100 or something? 
        // But for now, let's just check the approximate value or exact logic.
        expect(extractMetadata(html2, '').weightTotal).toBeCloseTo(998, 0);
    });
});
