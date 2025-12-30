
const fs = require('fs').promises;
const path = require('path');

const SPOOLS_DIR = path.join(__dirname, '..', 'data', 'spools');

async function testPerformance() {
    console.log(`Reading spools from ${SPOOLS_DIR}...`);

    // Test 1: List files
    const startList = process.hrtime();
    const files = await fs.readdir(SPOOLS_DIR);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    const endList = process.hrtime(startList);
    const listTime = (endList[0] * 1000 + endList[1] / 1e6).toFixed(2);
    console.log(`[List] Found ${jsonFiles.length} files in ${listTime}ms`);

    // Test 2: Read All Files (Sequential)
    const startRead = process.hrtime();
    const spools = [];
    for (const file of jsonFiles) {
        const filePath = path.join(SPOOLS_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        spools.push(JSON.parse(content));
    }
    const endRead = process.hrtime(startRead);
    const readTime = (endRead[0] * 1000 + endRead[1] / 1e6).toFixed(2);
    console.log(`[Read Sequential] Parsed ${spools.length} files in ${readTime}ms`);

    // Test 3: Read All Files (Parallel)
    const startReadParallel = process.hrtime();
    const spoolsParallel = await Promise.all(jsonFiles.map(async file => {
        const filePath = path.join(SPOOLS_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    }));
    const endReadParallel = process.hrtime(startReadParallel);
    const readParallelTime = (endReadParallel[0] * 1000 + endReadParallel[1] / 1e6).toFixed(2);
    console.log(`[Read Parallel] Parsed ${spoolsParallel.length} files in ${readParallelTime}ms`);

}

testPerformance().catch(console.error);
