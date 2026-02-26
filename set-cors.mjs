/**
 * set-cors.mjs — Applies CORS to Firebase Storage bucket
 * Run: node set-cors.mjs
 * Requires: firebase CLI to already be logged in (firebase login)
 */
import { execSync } from 'child_process';
import https from 'https';

// Step 1: Get an access token via Firebase CLI
let token;
try {
    token = execSync('firebase --token "" auth:print-access-token 2>&1', { encoding: 'utf8' }).trim();
} catch (_) { }

if (!token || token.includes('error') || token.includes('Error')) {
    try {
        // Alternative: use auth token from CLI cache
        const output = execSync('firebase auth:export /tmp/x.json --project travel-783bc 2>&1 || echo ""', {
            encoding: 'utf8',
        });
        console.log(output);
    } catch (_) { }
}

// Fallback: Get token using firebase login command
try {
    token = execSync('firebase login:ci 2>&1', { encoding: 'utf8', timeout: 5000 })
        .split('\n')
        .find((l) => l.length === 72 && !l.includes(' '))?.trim();
} catch (_) { }

const corsConfig = [
    {
        origin: ['http://localhost:3000', 'https://*'],
        method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
        responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'x-goog-resumable'],
        maxAgeSeconds: 3600,
    },
];

if (!token) {
    console.error('❌ Could not get access token from firebase CLI.');
    console.log('\nManual fix: Run this in Google Cloud Shell at https://shell.cloud.google.com');
    console.log('Or install Google Cloud SDK: https://cloud.google.com/sdk/docs/install\n');
    console.log('Then run:');
    console.log("  gsutil cors set cors.json gs://travel-783bc.firebasestorage.app\n");
    process.exit(1);
}

// Patch the bucket CORS via GCS JSON API
const body = JSON.stringify({ cors: corsConfig });
const options = {
    hostname: 'storage.googleapis.com',
    path: '/storage/v1/b/travel-783bc.firebasestorage.app?fields=cors',
    method: 'PATCH',
    headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
    },
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log('✅ CORS rules applied successfully!');
        } else {
            console.error(`❌ Failed (${res.statusCode}):`, data);
        }
    });
});
req.on('error', (err) => console.error('Request error:', err));
req.write(body);
req.end();
