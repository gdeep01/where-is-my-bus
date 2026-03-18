# Where Is My Bus?

Real-time bus tracking built for routes where GPS hardware costs Rs. 15,000–25,000 per bus makes dedicated tracking unaffordable. This runs entirely on the conductor's phone browser — no hardware, no backend, no cost.

**Live:** [where-is-my-bus-beryl.vercel.app/](https://where-is-my-bus-beryl.vercel.app)

---

## What it does

**Conductor** opens the app, fills in the bus number, route, and departure time, and hits Start. The browser's Geolocation API starts polling their GPS every 5 seconds and writes coordinates to Firebase Realtime Database.

**Passenger** opens the same URL on any device, selects their bus from the sidebar, and watches it move on an OpenStreetMap/Leaflet map. Updates arrive in under 5 seconds via Firebase's `onValue` listener — no polling, no page refresh.

When the conductor ends the trip, the record is deleted from Firebase immediately. If the tab crashes or the browser closes, Firebase's `onDisconnect` handler cleans it up automatically.

---

## Why it's built this way

The goal was zero infrastructure cost. No server means no hosting bill, no database to manage, no API to maintain. Firebase Realtime Database on the Spark (free) plan handles the sync. Vercel handles the static hosting. The total monthly cost is ₹0.

The app works as a progressive web app — conductors can add it to their home screen on Android and it behaves like a native app.

---

## Stack

- **React 18** — UI
- **Firebase Realtime Database** — live location sync
- **Leaflet + OpenStreetMap** — maps (no API key needed)
- **Vite** — build tool
- **Vercel** — hosting

No backend. No native app. No GPS hardware.

---

## Running locally
```bash
git clone https://github.com/gdeepg01/where-is-my-bus.git
cd where-is-my-bus
npm install
npm start
```

Opens at `http://localhost:3000`.

The app runs in **demo mode** by default — everything works on a single device using localStorage. To enable cross-device sync, add your Firebase config (see below).

---

## Firebase setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Realtime Database** — choose Asia Southeast (Singapore) region
3. Copy your config from Project Settings → Your Apps → SDK setup

```bash
cp src/firebase.example.js src/firebase.js
# Then fill in your config values
```
4. Paste it into `src/firebase.js` replacing the placeholder values
5. Set these database rules:
```json
{
  "rules": {
    "buses": {
      ".read": true,
      ".write": true
    }
  }
}
```

---

## How location sync works
```
Conductor browser
  → navigator.geolocation (every 5s)
  → Firebase RTDB set (buses/{id})
  → onDisconnect.remove() registered on each write

Passenger browser  
  → Firebase onValue listener
  → React state update
  → Leaflet marker repositioned
```

Latency in practice: 2–4 seconds on a normal mobile connection.

**Cleanup chain:**
- Conductor clicks End Trip → `remove()` called immediately
- Conductor closes tab → `onDisconnect` fires server-side within ~60s
- Record older than 24 hours → filtered out client-side as a safety net

---

## Limitations

- Requires location permission on the conductor's device
- GPS accuracy depends on the device — typically ±3–10 meters
- Speed display is smoothed (ignores movements under 10 meters) to filter GPS drift
- Firebase free tier allows 100 simultaneous connections — sufficient for a single route operator, needs upgrading for a fleet

---

## What's next

- `onDisconnect` + server-side TTL via Cloud Functions for cleaner cleanup
- Conductor authentication so routes can't be spoofed
- Trip history and route replay
- PWA offline support with service workers
- Multi-language support (Kannada, Hindi)

---

## Project context

Built this after noticing that most small bus operators in Karnataka track their fleet through WhatsApp messages. The hardware GPS trackers sold to operators cost Rs. 15,000–25,000 per unit plus a monthly SIM data plan — out of reach for a 3–4 bus operation running on thin margins.

This is an attempt at the same outcome with a smartphone the conductor already carries.

---

## License

MIT
