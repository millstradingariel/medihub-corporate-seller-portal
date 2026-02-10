// backend/middlewares/verifyToken.js
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK with service account
if (!admin.apps.length) {
  const serviceAccount = require('../firebase/medihub-seller-portal-5221b-firebase-adminsdk-fbsvc-6d7f1b599e.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

/**
 * Verify Firebase ID token
 * @param {string} idToken - Firebase ID token from client
 * @returns {Promise<admin.auth.DecodedIdToken>} Decoded token with user info
 */
async function verifyToken(idToken) {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new Error('Invalid or expired token');
  }
}

module.exports = { verifyToken, admin };