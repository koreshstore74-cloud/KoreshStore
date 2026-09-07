/* ============================================================
   Koresh Store — تهيئة Firebase (Firestore + Authentication)
   ============================================================
   الملف ده بيتحمّل كـ ES module في كل صفحة، وبيحط أدوات Firebase
   على window.firestoreAPI عشان باقي ملفات JS العادية (storage.js,
   admin.js, ...) تقدر تستخدمها من غير ما تبقى هي نفسها modules.
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs,
  setDoc, addDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyD3B0yXZwsukysrQhkl5iE_nAQTxU9c2L4",
  authDomain: "koreshstore-b9206.firebaseapp.com",
  projectId: "koreshstore-b9206",
  storageBucket: "koreshstore-b9206.firebasestorage.app",
  messagingSenderId: "721207539002",
  appId: "1:721207539002:web:3335a2ccdbe87708524c03"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

window.firestoreAPI = {
  db, auth, storage,
  collection, doc, getDoc, getDocs, setDoc, addDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy,
  signInWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword,
  storageRef, uploadBytesResumable, getDownloadURL, deleteObject
};

// إشارة لباقي السكريبتات إن Firebase بقى جاهز للاستخدام
window.dispatchEvent(new Event("firebase-ready"));
