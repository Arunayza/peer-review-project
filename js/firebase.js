import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue, remove, push, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBK30y8X82rtcs5JLVqmbqjT8ELO-HudLY",
  authDomain: "peer-review-app-9db2f.firebaseapp.com",
  databaseURL: "https://peer-review-app-9db2f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "peer-review-app-9db2f",
  storageBucket: "peer-review-app-9db2f.firebasestorage.app",
  messagingSenderId: "334246599661",
  appId: "1:334246599661:web:7ef747a3d71515e1d2a5e4",
  measurementId: "G-RL0KLYQ1MX"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export { ref, set, get, onValue, remove, push, update };