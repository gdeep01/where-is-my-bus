## Tech Stack
Frontend Framework
TechnologyVersionPurposeReact18.xUI component libraryReact Hooks-State management (useState, useEffect, useRef)Lucide ReactLatestIcon library for UI elements
Mapping & Geolocation
TechnologyVersionPurposeLeaflet.js1.9.4Interactive map libraryOpenStreetMap-Map tile provider (free, open-source)Browser Geolocation API-GPS position access
Data & Storage
TechnologyPurposelocalStorageClient-side persistencePub-Sub PatternReal-time state synchronizationIn-Memory DatabaseFast access to bus data
Build Tools
TechnologyPurposeViteFast development server & bundlerESLintCode quality & lintingPrettierCode formatting
Styling
ApproachDetailsInline StylesComponent-scoped stylingCSS AnimationsKeyframe animations for transitionsCubic BezierSmooth easing functions
APIs & Libraries
javascript// Core Dependencies
import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Bus, Navigation, UserCircle, Users, Play, Square, X } from 'lucide-react';

// External CDN Resources
// Leaflet CSS: https://unpkg.com/leaflet@1.9.4/dist/leaflet.css
// Leaflet JS: https://unpkg.com/leaflet@1.9.4/dist/leaflet.js
// OpenStreetMap Tiles: https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png

🏗 Architecture
System Architecture
┌─────────────────────────────────────────────────────────────┐
│                    Where is My Bus?Client                       │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐   │
│  │  Landing   │  │ Conductor  │  │     Passenger       │   │
│  │   Page     │  │    Page    │  │       Page          │   │
│  └────────────┘  └────────────┘  └─────────────────────┘   │
│         │               │                    │               │
│         └───────────────┴────────────────────┘               │
│                         │                                    │
│                         ▼                                    │
│              ┌──────────────────────┐                        │
│              │  Global Bus Database │                        │
│              │  - In-Memory Store   │                        │
│              │  - Pub-Sub System    │                        │
│              │  - localStorage Sync │                        │
│              └──────────────────────┘                        │
│                         │                                    │
│         ┌───────────────┼───────────────┐                   │
│         ▼               ▼               ▼                    │
│   ┌─────────┐    ┌──────────┐   ┌────────────┐             │
│   │ Browser │    │ Leaflet  │   │ Geolocation│             │
│   │ Storage │    │   Map    │   │     API    │             │
│   └─────────┘    └──────────┘   └────────────┘             │
│                        │                                     │
│                        ▼                                     │
│              ┌──────────────────┐                           │
│              │  OpenStreetMap   │                           │
│              │   Tile Server    │                           │
│              └──────────────────┘                           │
└─────────────────────────────────────────────────────────────┘

## Getting Started
Prerequisites

Node.js (v16 or higher)
npm or yarn package manager
Modern web browser with Geolocation API support
Internet connection (for map tiles)

Installation

Clone the repository

bash   git clone https://github.com/gdeepg01/where-is-my-bus.git
   cd Where is My Bus?

Install dependencies

bash   npm install

Start development server

bash   npm run dev

Open in browser
http://localhost:5173
npm run build

# Preview production build
npm run preview
Environment Setup
No environment variables required! Where is My Bus? works entirely client-side.

📖 Usage Guide
For Conductors

Start a Trip

Select "Conductor" on landing page
Fill in bus number (e.g., KA-20-1234)
Enter bus name (e.g., Express)
Choose start location (search or use GPS)
Choose destination
Set departure time
Click "Start GPS Tracking"

During Trip

GPS broadcasts every 5 seconds automatically
View current coordinates on screen
Speed is calculated and displayed
Trip remains active until stopped


End Trip

Click "End Trip" button
GPS tracking stops
Bus becomes inactive for passengers

For Passengers

View Live Buses

Select "Passenger" on landing page
See all active buses in sidebar
Live counter shows total active buses

Track a Bus

Click any bus card in sidebar
Map zooms to bus location
Popup shows bus details
Watch bus move in real-time


Explore Map

Zoom in/out with mouse wheel
Drag to pan around
Click markers for info
View street names and landmarks

Future Roadmap
Phase 1 (Current)

 Real-time GPS tracking
 Interactive map with OpenStreetMap
 Conductor and Passenger interfaces
 Auto-cleanup system

Phase 2 (Next)

 Backend server with WebSocket
 User authentication
 Trip history and analytics
 Estimated arrival times (ETA)
 Push notifications
 Offline mode with service workers

Phase 3 (Future)

 Multi-route support
 Fleet management dashboard
 Passenger feedback system
 Integration with payment systems
 Mobile native apps (React Native)
 Voice announcements


🤝 Contributing
We welcome contributions! Please follow these steps:

Fork the repository
Create a feature branch (git checkout -b feature/amazing-feature)
Commit your changes (git commit -m 'Add amazing feature')
Push to the branch (git push origin feature/amazing-feature)
Open a Pull Request

Code Style

Follow existing code patterns
Use functional components with hooks
Add comments for complex logic
Test on multiple browsers
Ensure animations are smooth


📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

👏 Acknowledgments

OpenStreetMap Contributors - Map data
Leaflet.js Team - Mapping library
Lucide Icons - Beautiful icon set
React Team - Framework
Vite Team - Build tool



Project Link: https://github.com/gdeepg01/where-is-my-bus.git

<div align="center">
Made with ❤️ for better public transportation
⭐ Star this repo if you find it helpful!
</div>
