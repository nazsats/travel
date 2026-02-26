/**
 * set-cors-ft.cjs
 * Uses firebase-tools Node.js API to get access token
 * and applies CORS config to Firebase Storage bucket.
 * Run: node set-cors-ft.cjs
 */
const https = require('https');

const BUCKET_NAME = 'travel-783bc.firebasestorage.app';

const CORS_CONFIG = {
    cors: [
        {
            origin: ['http://localhost:3000', 'http://localhost:3001', 'https://*'],
            method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
            responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'x-goog-resumable'],
            maxAgeSeconds: 3600,
        },
    ],
};

function applyCors(token) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(CORS_CONFIG);
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
                if (res.statusCode === 200) resolve(JSON.parse(data));
                else reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

(async () => {
    let accessToken;
    try {
        // Use firebase-tools programmatic API
        const api = require('firebase-tools/lib/api');
        console.log('🔑 Getting access token via firebase-tools...');
        accessToken = await api.getAccessToken({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
        console.log('Got token type:', typeof accessToken, Object.keys(accessToken || {}));
        if (accessToken?.access_token) accessToken = accessToken.access_token;
    } catch (e) {
        console.error('firebase-tools api error:', e.message);
    }

    if (!accessToken) {
        try {
            const auth = require('firebase-tools/lib/auth');
            console.log('Trying auth module...');
            const t = await auth.getAccessToken({});
            accessToken = t?.access_token || t;
        } catch (e) {
            console.log('auth error:', e.message);
        }
    }

    if (!accessToken || typeof accessToken !== 'string') {
        console.error('\n❌ Could not get access token automatically.');
        console.log('\n=== SIMPLEST FIX: Firebase Console Firestore Rules ===');
        console.log('1. Open: https://console.firebase.google.com/project/travel-783bc/firestore/rules');
        console.log('2. Paste this and click "Publish":');
        console.log(`
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
`);
        console.log('\n=== For Storage CORS (Fix photo uploads) ===');
        console.log('Go to: https://shell.cloud.google.com');
        console.log('(Uses your Google account - no install needed)');
        console.log('Run this in Cloud Shell:');
        console.log(`
cat > /tmp/cors.json << 'EOF'
[{"origin":["http://localhost:3000","https://*"],"method":["GET","POST","PUT","DELETE","HEAD","OPTIONS"],"responseHeader":["Content-Type","Authorization","Content-Length","x-goog-resumable"],"maxAgeSeconds":3600}]
EOF
gsutil cors set /tmp/cors.json gs://travel-783bc.firebasestorage.app
echo "Done!"
`);
        process.exit(0);
    }

    console.log('✅ Got access token.');
    try {
        const result = await applyCors(accessToken);
        console.log('✅ CORS applied successfully!', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('❌ CORS API error:', e.message);
    }
})();
