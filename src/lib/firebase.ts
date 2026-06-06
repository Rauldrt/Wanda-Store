import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "wanda-pro-cloud-raul-123",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:557004412716:web:a34b41d975dfd6d22bbe89",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "wanda-pro-cloud-raul-123.firebasestorage.app",
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCEYIIw0SA2UkHtf2vI90_c9hhFEco6uqk",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "wanda-pro-cloud-raul-123.firebaseapp.com",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "557004412716",
    projectNumber: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_NUMBER || "557004412716"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
