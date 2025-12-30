
const fs = require('fs');
const path = require('path');

const SPOOLS_DIR = path.join(__dirname, '..', 'data', 'spools');

const brands = ['Prusament', 'eSun', 'Bambu Lab', 'PolyMaker', 'Overture', 'Sunlu', 'Hatchbox'];
const types = ['PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'PC', 'Nylon'];
const colors = ['Red', 'Blue', 'Green', 'Black', 'White', 'Orange', 'Yellow', 'Galaxy Black', 'Mystic Green', 'Transparent', 'Purple', 'Grey'];

function sanitizeForFilename(str) {
    if (!str) return 'Unknown';
    return str
        .replace(/[/\\:*?"<>|]/g, '')
        .replace(/[™®©]/g, '')
        .replace(/\s+/g, '')
        .replace(/[^a-zA-Z0-9-]/g, '')
        .substring(0, 100) || 'Unknown';
}

function getSpoolFileName(spool) {
    const type = sanitizeForFilename(spool.type);
    const brand = sanitizeForFilename(spool.brand || 'Unknown');
    const color = sanitizeForFilename(spool.color || 'NoColor');
    const serial = sanitizeForFilename(spool.serial);
    return `${type}-${brand}-${color}-${serial}.json`;
}

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function generateSpools(count) {
    console.log(`Generating ${count} spools in ${SPOOLS_DIR}...`);

    if (!fs.existsSync(SPOOLS_DIR)) {
        fs.mkdirSync(SPOOLS_DIR, { recursive: true });
    }

    const startTime = Date.now();

    for (let i = 0; i < count; i++) {
        const brand = getRandomItem(brands);
        const type = getRandomItem(types);
        const color = getRandomItem(colors);
        const serial = `TEST-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        const spool = {
            serial,
            brand,
            type,
            color,
            colorHex: '#000000', // Mock hex
            weightRemaining: Math.floor(Math.random() * 1000),
            weightTotal: 1000,
            weightSpool: 200,
            diameter: 1.75,
            lastScanned: Date.now(),
            lastUpdated: Date.now(),
            createdAt: Date.now(),
            notes: 'Performance Test Spool'
        };

        const filename = getSpoolFileName(spool);
        const filePath = path.join(SPOOLS_DIR, filename);

        fs.writeFileSync(filePath, JSON.stringify(spool, null, 2));

        if (i % 50 === 0) {
            process.stdout.write('.');
        }
    }

    const duration = Date.now() - startTime;
    console.log(`\nDone! Generated ${count} spools in ${duration}ms.`);
}

const args = process.argv.slice(2);
const count = args[0] ? parseInt(args[0]) : 300;

generateSpools(count);
