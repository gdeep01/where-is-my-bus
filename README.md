# 🚌 Where Is My Bus
 
A simple yet powerful **real-time bus tracking app** built for **rural and small-town routes** in India.
This project aims to help daily passengers easily track bus locations, timings, and route availability — starting with **Yadur ↔ Thirthahalli** KSRTC route.

---

## 🌟 What It Does

* Shows **available buses** only when the selected route exists.
* Lets passengers **view live bus location** on the map.
* Uses **Supabase** for real-time data updates and secure backend.
* Built with **React / React Native** and **Leaflet / Mapbox** for smooth performance.
* Future-ready for integration with **KSRTC APIs** and **private bus operators**.

---

## ⚙️ Tech Stack

* **Frontend:** React / React Native
* **Backend:** Supabase (PostgreSQL + Auth + Realtime)
* **Map:** Leaflet + OpenStreetMap
* **Hosting:** Vercel (Web) / Expo (Mobile App)

---

## 🧠 How It Works

1. Conductors or bus operators update the live location.
2. Supabase syncs the data securely to all connected passengers.
3. Passengers can view only valid routes and active buses.
4. Smart filtering prevents fake or missing buses from showing.

---

## 🔒 Security

All tables use **Row Level Security (RLS)** in Supabase:

```sql
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_locations ENABLE ROW LEVEL SECURITY;
```

This ensures only verified users and services can modify or view real-time bus data.

---

## 🚀 Vision

To make **affordable, open-source bus tracking** accessible to every small town —
**without needing government contracts or high-cost GPS systems.**

---

Would you like me to make it sound a bit **more startup-investor appealing** (like you’re pitching this on GitHub for funding)?
