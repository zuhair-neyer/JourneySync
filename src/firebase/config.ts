
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getDatabase, type Database } from "firebase/database";
// import { getFirestore, type Firestore } from 'firebase/firestore'; // Uncomment if you need Firestore

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB8IXvNxMO7Eq1Y9vrZ5LRlUrjo12aS0FI",
  authDomain: "journeysync-94213.firebaseapp.com",
  databaseURL: "https://journeysync-94213-default-rtdb.firebaseio.com",
  projectId: "journeysync-94213",
  storageBucket: "journeysync-94213.firebasestorage.app",
  messagingSenderId: "10311869905",
  appId: "1:10311869905:web:a3e3585e4267e27b922cf0",
  // measurementId: "G-G6Y1LEJXYR" // Removed to prevent ERR_BLOCKED_BY_CLIENT if Analytics is blocked
};

// Initialize Firebase
let app: FirebaseApp;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth: Auth = getAuth(app);
const database: Database = getDatabase(app); // Initialize Realtime Database
// const db: Firestore = getFirestore(app); // Uncomment if you need Firestore

export { app, auth, database };
