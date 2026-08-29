const fetch = require('node-fetch');
const fs = require('fs');
const API_BASE = 'https://kaszuby24.pl/wp-json/kaszuby24/v1/transport';

async function testApi() {
    console.log('--- TEST: Reda ID Check ---');
    try {
        const stopsRes = await fetch(`${API_BASE}/stops?agency=all`);
        const stops = await stopsRes.json();

        const candidates = stops.filter(s => s.name?.toLowerCase().includes('reda'));
        console.log(`Found ${candidates.length} candidates for 'Reda'`);

        const results = [];
        console.log('--- SCANNING ALL REDA STOPS FOR LIVE DATA ---');

        for (const s of candidates) {
            try {
                const ttRes = await fetch(`${API_BASE}/timetable?agency=${s.agency}&stop_id=${s.id}`);
                const tt = await ttRes.json();

                if (tt.length > 0) {
                    console.log(`SUCCESS: [${s.agency}] ${s.name} (ID: ${s.id}) -> ${tt.length} departures`);
                    console.log(`       First: ${tt[0].time} ${tt[0].line} -> ${tt[0].dest || tt[0].destination}`);
                }
            } catch (e) {
                // ignore errors
            }
        }
    } catch (e) {
        console.error('Fatal:', e);
    }
}

testApi();
