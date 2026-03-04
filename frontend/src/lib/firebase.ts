import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCEYIIw0SA2UkHtf2vI90_c9hhFEco6uqk",
    authDomain: "wanda-pro-cloud-raul-123.firebaseapp.com",
    projectId: "wanda-pro-cloud-raul-123",
    storageBucket: "wanda-pro-cloud-raul-123.firebasestorage.app",
    messagingSenderId: "557004412716",
    appId: "1:557004412716:web:a34b41d975dfd6d22bbe89"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
