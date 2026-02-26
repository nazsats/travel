/**
 * set-cors-auto.cjs
 * Uses the Firebase CLI token cache to get an access token 
 * and applies CORS config to the Firebase Storage bucket.
 * Run: node set-cors-auto.cjs
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BUCKET_NAME = 'travel-783bc.firebasestorage.app';

// Read refresh token from firebase-tools config
const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');

let refreshToken;
try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    refreshToken = config?.tokens?.refresh_token;
} catch (e) {
    console.error('Could not read Firebase CLI credentials:', e.message);
    process.exit(1);
}

if (!refreshToken) {
    console.error('No refresh token found. Please run: firebase login');
    process.exit(1);
}

// Exchange refresh token for an access token using Google OAuth2
function getAccessToken(refreshToken) {
    return new Promise((resolve, reject) => {
        const body = new URLSearchParams({
            client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
            client_secret: 'j9iVZfS8ystkEuhdqDMJ',
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }).toString();

        const options = {
            hostname: 'oauth2.googleapis.com',
            path: '/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(body),
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.access_token) resolve(parsed.access_token);
                    else reject(new Error(`Token exchange failed: ${data}`));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// Apply CORS to the GCS bucket via REST API
function applyCors(token) {
    return new Promise((resolve, reject) => {
        const corsData = {
            cors: [
                {
                    origin: ['http://localhost:3000', 'http://localhost:3001', 'https://*'],
                    method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
                    responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'x-goog-resumable'],
                    maxAgeSeconds: 3600,
                },
            ],
        };
        const body = JSON.stringify(corsData);
        const bucketEncoded = encodeURIComponent(BUCKET_NAME);

        const options = {
            hostname: 'storage.googleapis.com',
            path: `/storage/v1/b/${bucketEncoded}?fields=cors`,
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
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`GCS API error (${res.statusCode}): ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// Main
(async () => {
    console.log('🔑 Getting access token from Firebase CLI credentials...');
    try {
        const accessToken = await getAccessToken(refreshToken);
        console.log('✅ Access token obtained.');

        console.log(`🚀 Applying CORS rules to gs://${BUCKET_NAME}...`);
        const result = await applyCors(accessToken);
        console.log('✅ CORS rules applied successfully!');
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('❌ Error:', e.message);
        console.log('\n=== Manual fix via Google Cloud Shell ===');
        console.log('Go to: https://shell.cloud.google.com');
        console.log('Run:');
        console.log(`cat > /tmp/cors.json << 'CORSEOF'`);
        console.log(JSON.stringify([{
            origin: ['http://localhost:3000', 'https://*'],
            method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
            responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'x-goog-resumable'],
            maxAgeSeconds: 3600
        }], null, 2));
        console.log('CORSEOF');
        console.log(`gsutil cors set /tmp/cors.json gs://${BUCKET_NAME}`);
    }
})();
