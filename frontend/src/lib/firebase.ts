import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    projectId: "wanda-store-raul-2026",
    appId: "1:1068696357909:web:6eeabfec2e35954105121c",
    storageBucket: "wanda-store-raul-2026.firebasestorage.app",
    apiKey: "AIzaSyDbBU3AtliOxTZKVoYbf7x5Oqf0TuAcKe4",
    authDomain: "wanda-store-raul-2026.firebaseapp.com",
    messagingSenderId: "1068696357909",
    projectNumber: "1068696357909"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
