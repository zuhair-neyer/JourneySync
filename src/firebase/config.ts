
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
// import { getAnalytics, type Analytics } from "firebase/analytics"; // Removed Analytics import
import { getDatabase, type Database } from "firebase/database";
// import { getFirestore, type Firestore } from 'firebase/firestore'; // Uncomment if you need Firestore

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB8IXvNxMO7Eq1Y9vrZ5LRlUrjo12aS0FI",
  authDomain: "journeysync-94213.firebaseapp.com",
  databaseURL: "https://journeysync-94213-default-rtdb.firebaseio.com",
  projectId: "journeysync-94213",
  storageBucket: "journeysync-94213.firebasestorage.app",
  messagingSenderId: "10311869905",
  appId: "1:10311869905:web:a3e3585e4267e27b922cf0",
  measurementId: "G-G6Y1LEJXYR" // This ID is for Google Analytics, but we are removing explicit initialization
};

// Initialize Firebase
let app: FirebaseApp;
// let analytics: Analytics | undefined; // Removed analytics variable

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  // Analytics would typically be initialized here if used, e.g.:
  // if (typeof window !== "undefined") {
  //   analytics = getAnalytics(app);
  // }
} else {
  app = getApp();
  // if (typeof window !== "undefined" && app) { // Ensure app is defined
  //   analytics = getAnalytics(app);
  // }
}

const auth: Auth = getAuth(app);
const database: Database = getDatabase(app); // Initialize Realtime Database
// const db: Firestore = getFirestore(app); // Uncomment if you need Firestore

export { app, auth, database /*, analytics */ }; // Removed analytics from exports
