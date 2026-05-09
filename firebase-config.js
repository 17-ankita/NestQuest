// ========================================
// FIREBASE IMPORTS
// ========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";


// ========================================
// FIREBASE CONFIG
// ========================================

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCzVdnVHdOuGbPzM6-X3k_ZI7I28ya2FEQ",
  authDomain: "nestquest-61f5a.firebaseapp.com",
  projectId: "nestquest-61f5a",
  storageBucket: "nestquest-61f5a.firebasestorage.app",
  messagingSenderId: "317742150692",
  appId: "1:317742150692:web:b22dcd943227e56c5b14b1",
  measurementId: "G-2LXNT9W97D"
};


// ========================================
// INITIALIZE FIREBASE
// ========================================

const app = initializeApp(firebaseConfig);


// ========================================
// SERVICES
// ========================================

const auth = getAuth(app);

const db = getFirestore(app);

const storage = getStorage(app);


// ========================================
// EXPORTS
// ========================================

export { auth, db, storage };