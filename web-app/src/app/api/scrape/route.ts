import { NextRequest, NextResponse } from 'next/server';

// Must be static for Next.js to parse at build time
// Docker builds use force-dynamic (server mode)
export const dynamic = 'force-dynamic';
export const revalidate = false;

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
        return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
    }

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand)";v="24", "Google Chrome";v="122"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1'
            },
            next: { revalidate: 3600 }
        });

        if (!response.ok) {
            console.error(`[Scraper API] Fetch failed for ${targetUrl}: ${response.status} ${response.statusText}`);
            return NextResponse.json({
                error: `Site responded with ${response.status}: ${response.statusText}`,
                status: response.status
            }, { status: 200 }); // Return 200 to show error in UI terminal
        }

        const html = await response.text();
        const finalUrl = response.url || targetUrl; // Use final URL after redirects
        const metadata = extractMetadata(html, finalUrl);
        metadata.detailUrl = finalUrl; // Ensure we store the resolved URL

        // Add more info to metadata for debugging
        metadata.logs.unshift(`[${new Date().toLocaleTimeString()}] HTTP Status: ${response.status}`);

        return NextResponse.json(metadata);
    } catch (error: any) {
        console.error('[Scraper API Error]:', error);
        return NextResponse.json({ error: `Scraper error: ${error.message}` }, { status: 200 });
    }
}

export function extractMetadata(html: string, url: string) {
    const lowerUrl = url.toLowerCase();

    // Default structure matching Spool interface
    const result: any = {
        brand: 'Generic',
        type: 'PLA',
        color: 'Unknown',
        colorHex: '#888888',
        weightTotal: 1000,
        diameter: 1.75,
        logs: []
    };

    const log = (msg: string) => result.logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    const materials = ['PLA', 'PETG', 'ASA', 'TPU', 'ABS', 'PC', 'Nylon', 'Flex'];

    // Tier 1: Structured Data (LD+JSON)
    try {
        let startIdx = 0;
        while ((startIdx = html.indexOf('<script type="application/ld+json">', startIdx)) !== -1) {
            const endIdx = html.indexOf('</script>', startIdx);
            if (endIdx === -1) break;

            const jsonText = html.substring(startIdx + 35, endIdx).trim();
            startIdx = endIdx + 9;

            if (!jsonText) continue;
            const data = JSON.parse(jsonText);

            const items = Array.isArray(data) ? data : [data];
            for (const item of items) {
                if (item['@type'] === 'Product' || item['@type']?.includes('Product')) {
                    if (item.brand?.name) {
                        result.brand = item.brand.name;
                        log(`Found Brand in LD+JSON: ${result.brand}`);
                    }
                    if (item.name) log(`Found Product Name in LD+JSON: ${item.name}`);

                    // GTIN Extraction
                    if (item.gtin) result.gtin = item.gtin;
                    else if (item.gtin13) result.gtin = item.gtin13;
                    else if (item.gtin12) result.gtin = item.gtin12;
                    else if (item.ean) result.gtin = item.ean;

                    if (result.gtin) log(`Found GTIN: ${result.gtin}`);

                    // Country Extraction
                    if (item.countryOfOrigin) {
                        const coo = item.countryOfOrigin;
                        if (typeof coo === 'string') {
                            result.countryOfOrigin = coo.substring(0, 2).toUpperCase();
                        } else if (coo.name) {
                            // Map common names to ISO? Too complex for now, just log/store text if 2 chars
                            if (coo.name.length === 2) result.countryOfOrigin = coo.name.toUpperCase();
                        }
                        if (result.countryOfOrigin) log(`Found Country: ${result.countryOfOrigin}`);
                    }

                    const searchable = (item.name + ' ' + (item.description || '')).toUpperCase();
                    for (const m of materials) {
                        if (searchable.includes(m)) {
                            result.type = m;
                            log(`Material from structured data: ${m}`);
                            break;
                        }
                    }
                }
            }
        }
    } catch (e) {
        log('Failed to parse LD+JSON');
    }

    // Tier 2: OpenGraph / Meta tags
    const ogBrand = html.match(/<meta property="og:site_name" content="(.*?)"/i);
    if (ogBrand && result.brand === 'Generic') {
        result.brand = ogBrand[1];
        log(`Found Brand in OpenGraph: ${result.brand}`);
    }

    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    let h1 = '';
    if (h1Match && h1Match[1]) {
        h1 = String(h1Match[1]).trim().replace(/<[^>]+>/g, '');
    }
    const ogTitle = html.match(/<meta property="og:title" content="(.*?)"/i);
    let titleText = '';
    if (h1) {
        titleText = h1;
    } else if (ogTitle) {
        titleText = ogTitle[1];
    } else {
        const titleMatch = html.match(/<title>(.*?)<\/title>/i);
        titleText = titleMatch ? titleMatch[1] : '';
    }
    log(`Best Title (H1/OG/Tag): ${titleText}`);

    // Tier 3: Heuristics on Title & URL
    if (result.brand === 'Generic') {
        const brands = [
            { name: 'Prusament', keys: ['prusament', 'prusa'] },
            { name: 'Polymaker', keys: ['polymaker'] },
            { name: 'Bambu Lab', keys: ['bambulab', 'bambu lab'] },
            { name: 'MatterHackers', keys: ['matterhackers'] },
            { name: 'Sunlu', keys: ['sunlu'] },
            { name: 'eSUN', keys: ['esun'] },
            { name: 'Fillamentum', keys: ['fillamentum'] },
            { name: 'Anycubic', keys: ['anycubic'] },
            { name: 'Elegoo', keys: ['elegoo'] },
            { name: 'Creality', keys: ['creality'] }
        ];

        for (const b of brands) {
            if (b.keys.some(k => lowerUrl.includes(k) || titleText.toLowerCase().includes(k))) {
                result.brand = b.name;
                log(`Brand from heuristic: ${result.brand}`);
                break;
            }
        }
    }

    // Specific Prusament Parsing
    if (result.brand === 'Prusament') {
        // Expected Title: "Prusament PETG Carbon Fiber Black" or similar
        let cleanTitle = titleText.replace(/\| Prusament/i, '').trim();
        cleanTitle = cleanTitle.replace(/^Prusament\s+/i, ''); // Remove leading brand

        // Materials to look for (longer match first)
        const prusaMaterials = ['PLA', 'PETG', 'PVB', 'ASA', 'PC', 'PA11', 'Flex', 'PCCF', 'PETG-CF', 'PLA+'];
        prusaMaterials.sort((a, b) => b.length - a.length);

        const foundMat = prusaMaterials.find(m => cleanTitle.toUpperCase().includes(m.toUpperCase()));
        if (foundMat) {
            result.type = foundMat;
            // The rest is likely the color
            // e.g. "PETG Carbon Fiber Black" -> remove "PETG" -> "Carbon Fiber Black"
            result.color = cleanTitle.replace(new RegExp(foundMat, 'i'), '').trim();
            log(`Prusament Parsing: Type=${result.type}, Color=${result.color}`);
        } else {
            // Fallback: First word is type?
            const parts = cleanTitle.split(' ');
            if (parts.length > 0) result.type = parts[0];
            if (parts.length > 1) result.color = parts.slice(1).join(' ');
        }
    }

    for (const m of materials) {
        if (titleText.toUpperCase().includes(m)) {
            result.type = m;
            log(`Material from title heuristic: ${m}`);
            break;
        }
    }

    // Weight detection - Improved to handle "1KG", "800g", "2.2lbs", "1 kg"
    const weightMatch = titleText.match(/(\d+\.?\d*)\s*(kg|g|lbs?|pounds?)/i);
    if (weightMatch) {
        let val = parseFloat(weightMatch[1]);
        const unit = weightMatch[2].toLowerCase();
        if (unit === 'kg') val *= 1000;
        else if (unit.startsWith('lb') || unit.startsWith('pound')) val *= 453.592;
        result.weightTotal = Math.round(val);
        log(`Detected Total Weight: ${result.weightTotal}g (from ${weightMatch[0]})`);
    }

    // Color detection from title
    const commonColors = [
        'Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple', 'Pink',
        'Gray', 'Grey', 'Silver', 'Gold', 'Bronze', 'Brown', 'Beige', 'Tan',
        'Cyan', 'Magenta', 'Teal', 'Navy', 'Maroon', 'Olive', 'Lime',
        'Transparent', 'Clear', 'Natural', 'Ivory',
        'Galaxy Black', 'Jet Black', 'Matte Black', 'Glossy Black',
        'Snow White', 'Pearl White', 'Silk White',
        'True Red', 'Fire Red', 'Dark Red',
        'True Blue', 'Sky Blue', 'Dark Blue', 'Royal Blue', 'Light Blue',
        'True Green', 'Dark Green', 'Light Green', 'Forest Green',
        'Charcoal', 'Slate', 'Graphite', 'Ash',
        'Crimson', 'Scarlet', 'Ruby', 'Cherry',
        'Sapphire', 'Cobalt', 'Azure', 'Indigo',
        'Emerald', 'Jade', 'Mint', 'Seafoam',
        'Coral', 'Salmon', 'Peach', 'Apricot',
        'Lavender', 'Violet', 'Plum', 'Grape',
        'Turquoise', 'Aqua', 'Ocean',
        'Copper', 'Rose Gold', 'Champagne'
    ];

    // Sort by length (longest first) to match "Galaxy Black" before "Black"
    const sortedColors = commonColors.sort((a, b) => b.length - a.length);

    for (const color of sortedColors) {
        // Case-insensitive match in title
        const regex = new RegExp(`\\b${color}\\b`, 'i');
        if (regex.test(titleText)) {
            result.color = color;
            log(`Detected Color from title: ${color}`);
            break;
        }
    }

    // Generate Color Hex if missing
    if (!result.colorHex && result.color) {
        result.colorHex = getColorHex(result.color);
        log(`Generated Hex for '${result.color}': ${result.colorHex}`);
    }

    return result;
}

function getColorHex(colorName: string): string {
    const c = colorName.toLowerCase();

    // Prusament Specifics & Common Colors
    if (c.includes('prusa orange') || c.includes('orange')) return '#FF8800';
    if (c.includes('galaxy black') || c.includes('jet black')) return '#1a1a1a';
    if (c.includes('black')) return '#000000';
    if (c.includes('white')) return '#FFFFFF';
    if (c.includes('red') || c.includes('lipstick')) return '#FF0000';
    if (c.includes('blue') || c.includes('azure')) return '#0000FF';
    if (c.includes('green') || c.includes('lime')) return '#00FF00';
    if (c.includes('yellow')) return '#FFFF00';
    if (c.includes('purple') || c.includes('violet')) return '#800080';
    if (c.includes('silver') || c.includes('galaxy silver')) return '#C0C0C0';
    if (c.includes('gold')) return '#FFD700';
    if (c.includes('grey') || c.includes('gray')) return '#808080';
    if (c.includes('pink')) return '#FFC0CB';
    if (c.includes('vanilla')) return '#F3E5AB';
    if (c.includes('brown')) return '#A52A2A';
    if (c.includes('natural') || c.includes('clear')) return '#F0F0F0';
    if (c.includes('carmine') || c.includes('ruby')) return '#960018';

    // Default to a neutral grey if unknown
    return '#808080';
}
