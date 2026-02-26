/**
 * set-cors.cjs — Applies CORS to Firebase Storage bucket
 * Uses global firebase-tools to get an access token
 * Run: node set-cors.cjs
 */
const https = require('https');
const { execSync } = require('child_process');

let token;
try {
    // firebase-tools exposes this command
    token = execSync('npx firebase-admin --project travel-783bc token 2>&1', { encoding: 'utf8' }).trim();
} catch (_) { }

// Use firebase-tools programmatic API
try {
    const firebaseTools = require('firebase-tools');
    firebaseTools.login.list().then((list) => {
        console.log('Logged in accounts:', list);
    }).catch((e) => console.log(e.message));
} catch (_) { }

// Try to get CI token or access token via firebase
try {
    const output = execSync('firebase --non-interactive login:ci 2>&1', { encoding: 'utf8', timeout: 5000 });
    // Look for a token (long alphanumeric string)
    const match = output.match(/1\/\/[A-Za-z0-9_\-]{30,}/);
    if (match) token = match[0];
} catch (_) { }

if (!token) {
    // Try getting the token the nodejs way from firebase-tools
    try {
        const { default: api } = require('firebase-tools/lib/api');
        token = api.getAccessToken?.();
        console.log('Got token via api:', !!token);
    } catch (_) { }
}

if (!token) {
    console.log('\n======================================================');
    console.log('MANUAL CORS FIX REQUIRED');
    console.log('======================================================');
    console.log('\nOption A — Google Cloud Shell (easiest, no install needed):');
    console.log('1. Go to: https://shell.cloud.google.com');
    console.log('2. Run these commands:');
    console.log("   cat > cors.json << 'EOF'");
    console.log(JSON.stringify([{
        origin: ['http://localhost:3000', 'https://*'],
        method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
        responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'x-goog-resumable'],
        maxAgeSeconds: 3600
    }], null, 2));
    console.log('EOF');
    console.log('   gsutil cors set cors.json gs://travel-783bc.firebasestorage.app');
    console.log('\nOption B — Install Google Cloud SDK:');
    console.log('   https://cloud.google.com/sdk/docs/install-sdk');
    console.log('   (Then log in and run the gsutil command above)');
    process.exit(0);
}

// Apply CORS using GCS JSON API
const body = JSON.stringify({
    cors: [{
        origin: ['http://localhost:3000', 'https://*'],
        method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
        responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'x-goog-resumable'],
        maxAgeSeconds: 3600
    }]
});

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
            console.error(`❌ Failed (HTTP ${res.statusCode}):`, data);
        }
    });
});
req.on('error', (err) => console.error('Request error:', err.message));
req.write(body);
req.end();
