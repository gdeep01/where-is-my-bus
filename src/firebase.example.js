import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set, onValue, off, remove, onDisconnect } from 'firebase/database'

const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_AUTH_DOMAIN",
  databaseURL: "REPLACE_WITH_YOUR_DATABASE_URL",
  projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket: "REPLACE_WITH_YOUR_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_YOUR_SENDER_ID",
  appId: "REPLACE_WITH_YOUR_APP_ID"
}

// Copy this file to firebase.js and fill in your values
// Never commit firebase.js to git
