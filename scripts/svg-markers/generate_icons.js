const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DEST_DIR = path.join(__dirname, '../../assets/images/markers');

if (!fs.existsSync(DEST_DIR)) {
    fs.mkdirSync(DEST_DIR, { recursive: true });
}

// Helper to generate a generic circle with some SVG content inside
const generateSvg = (color, svgContent) => `
<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="46" fill="${color}" stroke="#ffffff" stroke-width="7" />
  ${svgContent}
</svg>
`.trim();

const icons = [
    // Essentials: Added slightly more shrinkage (scale 1.9 instead of 2.1) to make them "ciut mniejsze"
    {
        name: 'marker_aed_red.png',
        color: '#ef4444',
        content: '<g transform="translate(27, 27) scale(1.9)" fill="#ffffff"><path d="M12.1 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12.1 21.35zM13 10V5l-6 7h4v5l6-7h-4z"/></g>'
    },
    {
        name: 'marker_aed_blue.png',
        color: '#3b82f6',
        content: '<g transform="translate(27, 27) scale(1.9)" fill="#ffffff"><path d="M12.1 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12.1 21.35zM13 10V5l-6 7h4v5l6-7h-4z"/></g>'
    },
    {
        name: 'marker_aed_orange.png',
        color: '#f97316',
        content: '<g transform="translate(27, 27) scale(1.9)" fill="#ffffff"><path d="M12.1 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12.1 21.35zM13 10V5l-6 7h4v5l6-7h-4z"/></g>'
    },
    {
        name: 'marker_aed_green.png',
        color: '#10b981',
        content: '<g transform="translate(27, 27) scale(1.9)" fill="#ffffff"><path d="M12.1 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12.1 21.35zM13 10V5l-6 7h4v5l6-7h-4z"/></g>'
    },
    {
        name: 'marker_pharmacy.png',
        color: '#8b5cf6',
        content: '<g transform="translate(27, 27) scale(1.9)" fill="#ffffff"><path d="M10 2v6H4v8h6v6h8v-6h6V8h-6V2h-8z"/></g>'
    },
    {
        name: 'marker_pharmacy_24h.png',
        color: '#1e293b',
        content: `
          <g transform="translate(23, 13) scale(1.5)" fill="#facc15">
            <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>
          </g>
          <text x="50" y="82" font-family="sans-serif" font-weight="900" font-size="26" fill="#facc15" text-anchor="middle">24h</text>
        `
    },
    {
        name: 'marker_sor.png',
        color: '#ef4444',
        content: '<g transform="translate(27, 27) scale(1.9)" fill="#ffffff"><path d="M10 2v6H4v8h6v6h8v-6h6V8h-6V2h-8z"/></g>'
    },
    {
        name: 'marker_hospital.png',
        color: '#3b82f6',
        content: '<g transform="translate(26, 26) scale(2.0)" fill="#ffffff"><path d="M12 3L2 12h3v8h14v-8h3L12 3zm3 10h-2v2h-2v-2H9v-2h2V9h2v2h2v2z"/></g>'
    },
    // Mevo Bike (Cleaner path)
    {
        name: 'marker_mevo_bike.png',
        color: '#dc2626',
        content: '<g transform="translate(25, 25) scale(2.1)" fill="#ffffff"><path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10l2.4-2.4-.8-.8c-.3-.3-.4-.8-.1-1.1l2.5-3.5c.2-.3.7-.4 1-.2.3.2.4.7.2 1l-2.2 3.1 1.7 1.7L19 7v5h-1.5V8.5L15 11l-2 5h-4.3c-.7 0-1.4-.4-1.7-1l-1.5-3V9.5h1.5v1.8l1.3 2.7 2.5-2zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z"/></g>'
    },
    // Air Quality (AQI) - 6 categories
    {
        name: 'marker_aqi_1.png', // Bardzo dobry
        color: '#50f0e6',
        content: '<g transform="translate(25, 25) scale(2.1)" fill="#ffffff"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></g>'
    },
    {
        name: 'marker_aqi_2.png', // Dobry
        color: '#50ccaa',
        content: '<g transform="translate(25, 25) scale(2.1)" fill="#ffffff"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></g>'
    },
    {
        name: 'marker_aqi_3.png', // Umiarkowany
        color: '#f0e641',
        content: '<g transform="translate(25, 25) scale(2.1)" fill="#ffffff"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></g>'
    },
    {
        name: 'marker_aqi_4.png', // Dostateczny
        color: '#ff5050',
        content: '<g transform="translate(25, 25) scale(2.1)" fill="#ffffff"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></g>'
    },
    {
        name: 'marker_aqi_5.png', // Zły
        color: '#960032',
        content: '<g transform="translate(25, 25) scale(2.1)" fill="#ffffff"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></g>'
    },
    {
        name: 'marker_aqi_6.png', // Bardzo zły
        color: '#7d2181',
        content: '<g transform="translate(25, 25) scale(2.1)" fill="#ffffff"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></g>'
    }
];

// Mevo Stations
for (let i = 0; i <= 30; i++) {
    const color = i > 5 ? '#10b981' : (i > 0 ? '#f59e0b' : '#ef4444');
    icons.push({
        name: `marker_mevo_station_${i}.png`,
        color: color,
        content: `
<g transform="translate(22, 22) scale(2.3)" fill="#ffffff"><path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10l2.4-2.4-.8-.8c-.3-.3-.4-.8-.1-1.1l2.5-3.5c.2-.3.7-.4 1-.2.3.2.4.7.2 1l-2.2 3.1 1.7 1.7L19 7v5h-1.5V8.5L15 11l-2 5h-4.3c-.7 0-1.4-.4-1.7-1l-1.5-3V9.5h1.5v1.8l1.3 2.7 2.5-2zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z"/></g>
<circle cx="80" cy="20" r="20" fill="#1f2937" stroke="#ffffff" stroke-width="3" />
<text x="80" y="28" font-family="sans-serif" font-weight="bold" font-size="${i > 9 ? 18 : 22}" fill="#ffffff" text-anchor="middle">${i}</text>
        `
    });
}
icons.push({
    name: `marker_mevo_station_30p.png`,
    color: '#10b981',
    content: `
<g transform="translate(22, 22) scale(2.3)" fill="#ffffff"><path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10l2.4-2.4-.8-.8c-.3-.3-.4-.8-.1-1.1l2.5-3.5c.2-.3.7-.4 1-.2.3.2.4.7.2 1l-2.2 3.1 1.7 1.7L19 7v5h-1.5V8.5L15 11l-2 5h-4.3c-.7 0-1.4-.4-1.7-1l-1.5-3V9.5h1.5v1.8l1.3 2.7 2.5-2zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z"/></g>
<circle cx="80" cy="20" r="20" fill="#1f2937" stroke="#ffffff" stroke-width="3" />
<text x="80" y="28" font-family="sans-serif" font-weight="bold" font-size="16" fill="#ffffff" text-anchor="middle">30+</text>
`
});

async function generate() {
    for (const icon of icons) {
        const svg = generateSvg(icon.color, icon.content);
        const outPath = path.join(DEST_DIR, icon.name);
        await sharp(Buffer.from(svg))
            .resize(100, 100)
            .png()
            .toFile(outPath);
        console.log(`Generated ${icon.name}`);
    }
}

generate().catch(console.error);
