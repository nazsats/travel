/**
 * apply-cors.js
 * Run: node apply-cors.js
 * Requires firebase CLI to be logged in: firebase login
 */

const { execSync } = require('child_process');
const https = require('https');

// Get access token from the logged-in Firebase CLI
let token;
try {
    token = execSync('firebase login:ci --interactive 2>nul || firebase auth:export --token $(firebase login:ci 2>&1 | tail -1)', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
} catch (e) {
    // fallback: get the token from firebase
}

// Alternatively get the token via firebase's built-in access token
try {
    token = execSync('firebase login --interactive 2>&1', { encoding: 'utf8' });
} catch (e) { }

// Use gcloud token if available
try {
    token = execSync('npx google-auth-library-nodejs token 2>&1', { encoding: 'utf8' }).trim();
} catch (e) { }

console.log('Trying to apply CORS via REST API...');

// We'll use the Firebase Admin REST approach
const corsConfig = JSON.stringify([
    {
        origin: ['http://localhost:3000', 'http://localhost:3001', 'https://*'],
        method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
        responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'x-goog-resumable'],
        maxAgeSeconds: 3600,
    },
]);

console.log('\n✅ CORS Configuration ready:');
console.log(corsConfig);
console.log('\n📋 MANUAL STEPS:');
console.log('Since gsutil is not installed, please follow these steps:\n');
console.log('OPTION 1 - Install Google Cloud SDK (recommended):');
console.log('  1. Go to: https://cloud.google.com/sdk/docs/install');
console.log('  2. Download and install Google Cloud SDK');
console.log('  3. Run: gcloud init (sign in with same Google account)');
console.log('  4. Run: gsutil cors set cors.json gs://travel-783bc.firebasestorage.app');
console.log('\nOPTION 2 - Set rules in Firebase Console manually:');
console.log('  1. Go to https://console.firebase.google.com/project/travel-783bc/storage');
console.log('  2. Click "Rules" tab');
console.log('  3. Replace content with:');
console.log(`
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
`);
console.log('  NOTE: Storage Rules do NOT fix CORS. CORS requires gsutil or Cloud SDK.');
console.log('\nOPTION 3 - Firebase Console Firestore Rules (fixes "Missing permissions" error):');
console.log('  1. Go to https://console.firebase.google.com/project/travel-783bc/firestore/rules');
console.log('  2. Replace content with:');
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
