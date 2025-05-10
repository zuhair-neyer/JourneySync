import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getAnalytics, Analytics } from "firebase/analytics";
import { getDatabase, Database } from "firebase/database";
// import { getFirestore, Firestore } from 'firebase/firestore'; // Uncomment if you need Firestore

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB8IXvNxMO7Eq1Y9vrZ5LRlUrjo12aS0FI",
  authDomain: "journeysync-94213.firebaseapp.com",
  databaseURL: "https://journeysync-94213-default-rtdb.firebaseio.com", // Removed trailing slash
  projectId: "journeysync-94213",
  storageBucket: "journeysync-94213.firebasestorage.app",
  messagingSenderId: "10311869905",
  appId: "1:10311869905:web:a3e3585e4267e27b922cf0",
  measurementId: "G-G6Y1LEJXYR"
};

// Initialize Firebase
let app: FirebaseApp;
let analytics: Analytics | undefined;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  if (typeof window !== "undefined") {
    analytics = getAnalytics(app);
  }
} else {
  app = getApp();
  if (typeof window !== "undefined") {
    // getAnalytics will return existing instance or initialize if not present for the app
    analytics = getAnalytics(app);
  }
}

const auth: Auth = getAuth(app);
const database: Database = getDatabase(app); // Initialize Realtime Database
// const db: Firestore = getFirestore(app); // Uncomment if you need Firestore

export { app, auth, database, analytics /*, db */ };
