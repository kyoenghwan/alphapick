const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require('./serviceAccountKey.json');

console.log('Attempting to initialize Firebase Admin...');
try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized.');

    const db = admin.firestore();
    db.listCollections().then(collections => {
        console.log('Collections:', collections.map(c => c.id));
        process.exit(0);
    }).catch(err => {
        console.error('Firestore Error:', err);
        process.exit(1);
    });
} catch (err) {
    console.error('Initialization Error:', err);
    process.exit(1);
}
