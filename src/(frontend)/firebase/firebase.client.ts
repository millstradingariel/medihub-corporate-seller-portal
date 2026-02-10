// Import the functions you need from the SDKs you need
// firebase.client.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBfz1a4LkEIeJGAQORQxb5-a1MtAmfMx4g",
  authDomain: "medihub-seller-portal-5221b.firebaseapp.com",
  projectId: "medihub-seller-portal-5221b",
  storageBucket: "medihub-seller-portal-5221b.firebasestorage.app",
  messagingSenderId: "912803543209",
  appId: "1:912803543209:web:dd6938e4bff5bb8cc511b8",
  measurementId: "G-363P8CQZ3Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Export in CommonJS style
export { app, auth };
export const FIREBASE_API_KEY = firebaseConfig.apiKey;