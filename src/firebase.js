import { initializeApp } from 'firebase/app'
import {
  getDatabase,
  ref,
  set,
  onValue,
  off,
  remove,
  onDisconnect,
} from 'firebase/database'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const IS_DEMO =
  firebaseConfig.apiKey === "REPLACE_WITH_YOUR_API_KEY" ||
  !firebaseConfig.databaseURL

export const STALE_MS = 30_000
export const MAX_TRIP_MS = 86_400_000

let db
if (!IS_DEMO) {
  const app = initializeApp(firebaseConfig)
  db = getDatabase(app)
}

// Track registered onDisconnect handlers so we don't double-register
const disconnectHandlers = new Map()

export async function fbSetBus(busId, data) {
  if (IS_DEMO) return
  const busRef = ref(db, `buses/${busId}`)

  // Register onDisconnect only once per busId
  if (!disconnectHandlers.has(busId)) {
    await onDisconnect(busRef).remove()
    disconnectHandlers.set(busId, true)
  }

  return set(busRef, { ...data, updatedAt: Date.now() })
}

export async function fbRemoveBus(busId) {
  if (IS_DEMO) return
  const busRef = ref(db, `buses/${busId}`)
  // Cancel onDisconnect handler and delete immediately
  await onDisconnect(busRef).cancel()
  disconnectHandlers.delete(busId)
  return remove(busRef)
}

export function fbSubscribeBuses(callback) {
  if (IS_DEMO) return () => {}
  const busesRef = ref(db, 'buses')
  const handler = (snapshot) => {
    const val = snapshot.val()
    if (!val) return callback([])
    const now = Date.now()
    const buses = Object.entries(val)
      .map(([id, data]) => ({ id, ...data }))
      .filter((b) => now - (b.updatedAt ?? 0) < MAX_TRIP_MS)
    callback(buses)
  }
  onValue(busesRef, handler)
  return () => off(busesRef, 'value', handler)
}
