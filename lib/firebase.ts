import { initializeApp, getApps, FirebaseApp, getApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDYeGaxkcUxfZ7coiePBFQggkIBssP3y14",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "alphapick-a9b9e.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "alphapick-a9b9e",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "alphapick-a9b9e.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "43891582136",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:43891582136:web:0fd9c04ff20659da4e004d",
  measurementId: "G-TJMEC7MWYY"
};

// Firebase 초기화 (Singleton 패턴)
const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);

// NOTE: 에뮬레이터 설정은 필요한 경우 여기서 window 체크와 함께 추가할 수 있습니다.

export { db, auth, app };
