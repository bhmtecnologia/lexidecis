import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD7Gh-UfV-LyueKtlUcY9nny_o-UWmlmJM",
  authDomain: "lexidecis.firebaseapp.com",
  projectId: "lexidecis",
  storageBucket: "lexidecis.firebasestorage.app",
  messagingSenderId: "267899611161",
  appId: "1:267899611161:web:6d1160f5ade72515ee6288",
  measurementId: "G-0QSNF8MKR1"
};

const appFirebase = initializeApp(firebaseConfig);
const auth = getAuth(appFirebase);
const analytics = getAnalytics(appFirebase);
const db = getFirestore(appFirebase);

export { appFirebase, auth, analytics, db };