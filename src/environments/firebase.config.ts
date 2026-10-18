// src/environments/firebase.config.ts

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// Note: We removed getAnalytics to avoid the unused variable warning

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCnRHiuxvIVRxBlDoAog9Ag0eJoYCZd6q4",
  authDomain: "session1-mobile.firebaseapp.com",
  projectId: "session1-mobile",
  storageBucket: "session1-mobile.firebasestorage.app",
  messagingSenderId: "97666607546",
  appId: "1:97666607546:web:4794139e62cf57d10e1583",
  measurementId: "G-KHCPRN1RBZ",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services so other files can use them
export const auth = getAuth(app);
export const db = getFirestore(app);
