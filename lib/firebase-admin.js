import admin from 'firebase-admin';

// Check if we have the required environment variables
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

// Initialize Firebase Admin SDK only if we have credentials
if (!admin.apps.length) {
  try {
    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      console.log('✅ Firebase Admin SDK initialized successfully');
    } else {
      console.log('⚠️ Firebase Admin SDK not initialized - missing environment variables');
      console.log('Missing:', {
        projectId: !projectId,
        clientEmail: !clientEmail,
        privateKey: !privateKey
      });
    }
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error.message);
  }
}

export default admin;
