const TEST_URLS = [
    "https://www.prusa3d.com/product/prusament-pla-galaxy-black-1kg/",
    "https://us.store.bambulab.com/products/pla-basic-with-spool",
    "https://polymaker.com/product/polyterra-pla/",
    "https://www.matterhackers.com/store/l/mh-build-series-pla-3d-printing-filament/sk/MKD6S7S6",
    "https://www.sunlu.com/collections/pla-collection/products/sunlu-pla-filament-1kg-2-2lbs-1-75mm",
    "https://www.esun3dstore.com/products/esun-pla-1-75mm-3d-filament-1kg",
    "https://fillamentum.com/products/pla-extrafill-wizards-voodoo/"
];

async function runTests() {
    console.log("Starting Scraper Tests...\n");
    for (const url of TEST_URLS) {
        console.log(`Testing: ${url}`);
        try {
            const apiUrl = `http://localhost:3000/api/scrape?url=${encodeURIComponent(url)}`;
            const res = await fetch(apiUrl);
            const data = await res.json();

            if (data.error) {
                console.log(`❌ Failed: ${data.error}`);
            } else {
                console.log(`✅ Brand: ${data.brand}`);
                console.log(`   Type:  ${data.type}`);
                console.log(`   Weight: ${data.weightTotal}g`);
            }
        } catch (err: any) {
            console.log(`❌ Error: ${err.message}`);
        }
        console.log("-------------------\n");
    }
}

runTests();
