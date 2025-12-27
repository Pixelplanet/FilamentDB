
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
        return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
    }

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status}`);
        }

        const html = await response.text();

        // Basic Scraping Logic (Regex based to avoid heavy DOM libraries)
        const getMeta = (name: string) => {
            // Match meta name="foo" content="bar" or content="bar" name="foo"
            const regex = new RegExp(`<meta\\s+(?:name|property)=["']${name}["']\\s+content=["'](.*?)["']`, 'i');
            const match = html.match(regex);

            if (match) return match[1];

            // Try reverse order: meta content="bar" name="foo"
            const regexRev = new RegExp(`<meta\\s+content=["'](.*?)["']\\s+(?:name|property)=["']${name}["']`, 'i');
            const matchRev = html.match(regexRev);
            return matchRev ? matchRev[1] : null;
        };

        const getTagContent = (tag: string) => {
            const match = html.match(new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, 'is'));
            return match ? match[1].trim() : null;
        };

        const h1 = getTagContent('h1');
        const ogTitle = getMeta('og:title') || getTagContent('title') || '';

        // Priority: H1 > Meta Title > Title Tag
        let titleToUse = h1 || ogTitle;

        if (!titleToUse) {
            console.warn("No title found for", targetUrl);
        }

        // Clean HTML tags from title if any
        if (titleToUse) {
            titleToUse = titleToUse.replace(/<[^>]*>/g, '');
            // Decode entities if simple ones exist (basic fallback)
            titleToUse = titleToUse.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        }

        // Clean useless generic titles
        if (titleToUse && titleToUse.includes('Spool detail page')) {
            // Prusament specific fallback
            // If H1 was the generic one, we are stuck, but H1 is usually specific.
            // If we used og:title and it was generic, try H1 specifically if different.
        }

        let brand = 'Unknown';
        let type = 'PLA';
        let color = 'Unknown';
        let weight = 1000;

        // Detector for Prusament
        if (targetUrl.includes('prusament.com')) {
            brand = 'Prusament';

            // Expected Title: "Prusament PETG Carbon Fiber Black"
            let cleanTitle = (titleToUse || '').replace('| Prusament', '').trim();
            cleanTitle = cleanTitle.replace(/^Prusament\s+/i, '');

            // Now: "PETG Carbon Fiber Black"

            // Simple heuristics for common materials
            const materials = ['PLA', 'PETG', 'PVB', 'ASA', 'PC', 'PA11', 'Flex', 'PCCF', 'PETG-CF'];
            // Sort by length desc to match "PETG-CF" before "PETG"
            materials.sort((a, b) => b.length - a.length);

            const foundMat = materials.find(m => cleanTitle.toUpperCase().includes(m.toUpperCase()));

            if (foundMat) {
                type = foundMat;
                // Remove Material from title to get color
                color = cleanTitle.replace(new RegExp(foundMat, 'i'), '').trim();
                // Remove leading/trailing punctuation or "Prusament" repeats?
            } else {
                // formatting fallback
                const parts = cleanTitle.split(' ');
                if (parts.length > 0) type = parts[0];
                if (parts.length > 1) color = parts.slice(1).join(' ');
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                brand,
                type,
                color,
                weight,
                detailUrl: targetUrl,
                serial: targetUrl
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
