import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase's browser configuration is public by design. Environment variables
// can override these values per deployment, while the checked-in project
// configuration keeps the trade portal operational in standard Vite builds.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB5t5wykq2B0zd_YeHUHql4ZgqbpjcUy8g",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "hornandharvest.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "hornandharvest",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "hornandharvest.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "489442230815",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:489442230815:web:852078e1c0fcbb8d3b0b2a",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-2KB23YVDLG"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
