// src/backend/firebase/admin.js
const admin = require("firebase-admin");

let firebaseApp;

// Only initialize if it hasn't been initialized yet
if (!admin.apps.length) {
  firebaseApp = admin.initializeApp({
    credential: admin.credential.applicationDefault(), // or your service account
  });
} else {
  firebaseApp = admin.app(); // reuse the existing app
}

module.exports = firebaseApp;
