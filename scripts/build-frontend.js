const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const outputDirectory = path.join(root, 'dist');
const configuredApiBaseUrl = process.env.ROSTERIQ_API_BASE_URL;

if (process.env.VERCEL && !configuredApiBaseUrl) {
  throw new Error('Set ROSTERIQ_API_BASE_URL in the Vercel project environment.');
}

const apiBaseUrl = configuredApiBaseUrl || 'http://localhost:5000/api';
let parsedApiUrl;
try {
  parsedApiUrl = new URL(apiBaseUrl);
} catch (error) {
  throw new Error('ROSTERIQ_API_BASE_URL must be an absolute HTTP or HTTPS URL.');
}

if (parsedApiUrl.protocol !== 'http:' && parsedApiUrl.protocol !== 'https:') {
  throw new Error('ROSTERIQ_API_BASE_URL must use HTTP or HTTPS.');
}

const normalizedApiBaseUrl =
  `${parsedApiUrl.origin}${parsedApiUrl.pathname.replace(/\/+$/, '')}`;
fs.mkdirSync(outputDirectory, { recursive: true });

['index.html', 'app.js', 'styles.css'].forEach((file) => {
  fs.copyFileSync(path.join(root, file), path.join(outputDirectory, file));
});

fs.writeFileSync(
  path.join(outputDirectory, 'config.js'),
  `window.ROSTERIQ_API_BASE_URL = ${JSON.stringify(normalizedApiBaseUrl)};\n`,
);

console.log(`Built static frontend in dist/ using ${normalizedApiBaseUrl}`);
