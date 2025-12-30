
const fs = require('fs');
const path = require('path');

const SPOOLS_DIR = path.join(__dirname, '..', 'data', 'spools');

console.log(`Cleaning up TEST spools in ${SPOOLS_DIR}...`);

if (fs.existsSync(SPOOLS_DIR)) {
    const files = fs.readdirSync(SPOOLS_DIR);
    let count = 0;

    files.forEach(file => {
        // Check if file contains generated serial pattern 'TEST-'
        // Or check inside the file? Filename usually contains serial.
        // My generator used filename containing serial.
        // Serial was `TEST-${Date.now()...}`.
        if (file.includes('TEST-') && file.endsWith('.json')) {
            fs.unlinkSync(path.join(SPOOLS_DIR, file));
            count++;
        }
    });

    console.log(`Removed ${count} test spools.`);
} else {
    console.log('Spools directory not found.');
}
