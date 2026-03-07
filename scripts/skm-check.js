const https = require('https');

const API_V2 = 'https://kaszuby24.pl/wp-json/kaszuby24/v2';

function fetch(url) {
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`Failed to parse JSON: ${data.substring(0, 100)}`));
                }
            });
        }).on('error', reject);
    });
}

async function run() {
    try {
        console.log('--- TESTING API V2 (New Handler) ---');

        // Check V2 Stops
        const v2Stops = await fetch(`${API_V2}/stops?agency=skm`);
        const skmStops = v2Stops.features || [];
        console.log(`V2 SKM Stops found: ${skmStops.length}`);

        if (skmStops.length > 0) {
            const stop = skmStops.find(s => s.properties.name.includes('Reda')) || skmStops[0];
            const stopId = stop.properties.id;
            const stopName = stop.properties.name;

            console.log(`Checking departures for: ${stopName} (ID: ${stopId})`);
            const tt = await fetch(`${API_V2}/timetable?agency=skm&stop_id=${stopId}`);

            if (Array.isArray(tt)) {
                console.log(`   -> SUCCESS! Departures: ${tt.length}`);
                if (tt.length > 0) {
                    console.log(`   -> Sample: ${JSON.stringify(tt[0])}`);
                }
            } else {
                console.log('   -> RESPONSE:', tt);
            }
        } else {
            console.log('   -> No SKM stops found. Attempting to trigger sync...');
            const sync = await fetch(`${API_V2}/sync?key=k24_secret_sync_key`);
            console.log('   -> Sync Response:', JSON.stringify(sync));
        }

    } catch (e) {
        console.error('Test failed:', e.message);
    }
}

run();
