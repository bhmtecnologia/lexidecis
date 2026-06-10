import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import { firebaseConfig } from "../../../config/firebase.config.js";

const appFirebase = initializeApp(firebaseConfig);
const auth = getAuth(appFirebase);
const analytics = getAnalytics(appFirebase);
const db = getFirestore(appFirebase);

export { appFirebase, auth, analytics, db };