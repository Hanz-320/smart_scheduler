// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDVQ-CB39o25KQo1DYEjhctkggyU_Dhqz8",
  authDomain: "smart-scheduler-8be21.firebaseapp.com",
  projectId: "smart-scheduler-8be21",
  storageBucket: "smart-scheduler-8be21.firebasestorage.app",
  messagingSenderId: "989674479653",
  appId: "1:989674479653:web:ee600c768371691930dfcc",
  measurementId: "G-WWGY6898JV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

// Enable offline persistence for instant updates
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('⚠️ Multiple tabs open, persistence only in first tab');
    } else if (err.code === 'unimplemented') {
      console.warn('⚠️ Browser doesn\'t support persistence');
    } else {
      console.error('❌ Persistence error:', err);
    }
  });

export { app, db, auth };