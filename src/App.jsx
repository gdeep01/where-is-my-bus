import React, { useState, useEffect, useRef } from 'react';
import { fbSetBus, fbRemoveBus, fbSubscribeBuses } from './firebase.js'
import { MapPin, Bus, Navigation, UserCircle, Users, Play, Square, X } from 'lucide-react';

// =============================================================================
// CONSTANTS
// =============================================================================
const MARKER_SIZE = { selected: 50, default: 40 };
const MAP_CONFIG = { zoom: 12, selectedZoom: 14, center: [13.9299, 75.5681] };
const UPDATE_INTERVAL = 5000;
const CLEANUP_INTERVAL = 3600000;
const MAX_AGE = 86400000;

const LOCATIONS = [
  { name: 'Shivamogga Bus Stand', lat: 13.9299, lng: 75.5681 },
  { name: 'Shivamogga Railway Station', lat: 13.9321, lng: 75.5733 },
  { name: 'BVB Campus Shivamogga', lat: 13.9343, lng: 75.5656 },
  { name: 'Bangalore Majestic', lat: 12.9777, lng: 77.5718 },
  { name: 'Bangalore Airport', lat: 13.1986, lng: 77.7066 },
  { name: 'MG Road Bangalore', lat: 12.9750, lng: 77.6088 },
  { name: 'Mysore Bus Stand', lat: 12.3045, lng: 76.6390 },
  { name: 'Mysore Palace', lat: 12.3051, lng: 76.6551 },
  { name: 'Mangalore Central', lat: 12.9141, lng: 74.8559 },
  { name: 'Hubli Bus Stand', lat: 15.3647, lng: 75.1240 },
];

// =============================================================================
// DATABASE
// =============================================================================
const DB = {
  buses: [],
  subscribers: new Set(),

  init() {
    try {
      const saved = localStorage.getItem('buses');
      if (saved) this.buses = JSON.parse(saved);
    } catch (e) {
      console.error('Load failed:', e);
    }
  },

  save() {
    try {
      localStorage.setItem('buses', JSON.stringify(this.buses));
      this.notify();
    } catch (e) {
      console.error('Save failed:', e);
    }
  },

  add(bus) {
    this.buses.push(bus);
    this.save();
  },

  update(id, data) {
    const bus = this.buses.find(b => b.id === id);
    if (bus && bus.active) {
      Object.assign(bus, data);
      if (!bus.history) bus.history = [];
      bus.history.push({ lat: data.lat, lng: data.lng, time: Date.now() });
      if (bus.history.length > 100) bus.history.shift();
      this.save();
    }
  },

  stop(id) {
    const bus = this.buses.find(b => b.id === id);
    if (bus) {
      bus.active = false;
      bus.status = 'offline';
      this.save();
    }
  },

  cleanup() {
    const cutoff = Date.now() - MAX_AGE;
    const before = this.buses.length;
    this.buses = this.buses.filter(b => b.active || b.updated >= cutoff);
    if (before !== this.buses.length) {
      console.log(`Cleaned ${before - this.buses.length} old buses`);
      this.save();
    }
  },

  subscribe(fn) {
    this.subscribers.add(fn);
    fn([...this.buses]);
    return () => this.subscribers.delete(fn);
  },

  notify() {
    this.subscribers.forEach(fn => fn([...this.buses]));
  }
};

// =============================================================================
// UTILITIES
// =============================================================================
const Utils = {
  getGPS() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('GPS not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        err => reject(new Error(err.code === 1 ? 'Location denied' : 'Location unavailable')),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  },

  distance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  },

  search(query) {
    if (!query || query.length < 2) return [];
    return LOCATIONS.filter(l => l.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  },

  color(str) {
    const colors = ['#dc2626', '#059669', '#d97706', '#7c3aed', '#db2777', '#2563eb'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  },

  eta(bus) {
    // Returns a human-readable ETA string, or null if not computable
    if (!bus.to || !bus.lat || !bus.lng) return null
    const distKm   = Utils.distance(bus.lat, bus.lng, bus.to.lat, bus.to.lng)
    const speedKph = bus.speed > 2 ? bus.speed : 30   // assume 30 km/h if nearly stationary
    const etaMins  = Math.round((distKm / speedKph) * 60)
    if (etaMins < 1)  return 'Arriving now'
    if (etaMins < 60) return `~${etaMins} min`
    const h = Math.floor(etaMins / 60)
    const m = etaMins % 60
    return `~${h}h ${m}m`
  },
};

// =============================================================================
// LOCATION PICKER - FIXED DROPDOWN POSITIONING
// =============================================================================
function LocationPicker({ label, value, onChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef();

  useEffect(() => {
    if (value?.name) setQuery(value.name);
  }, [value]);

  useEffect(() => {
    setResults(Utils.search(query));
    setShow(query.length >= 2);
  }, [query]);

  useEffect(() => {
    const handler = e => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShow(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const useGPS = async () => {
    setLoading(true);
    try {
      const pos = await Utils.getGPS();
      const loc = { name: `GPS: ${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`, ...pos };
      onChange(loc);
      setQuery(loc.name);
      setShow(false);
    } catch (e) {
      alert(e.message);
    }
    setLoading(false);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', marginBottom: '20px' }}>
      <label style={{ 
        display: 'block', 
        marginBottom: '8px', 
        fontSize: '14px', 
        fontWeight: '600', 
        color: '#94a3b8',
        transition: 'all 0.2s ease'
      }}>
        {label}
      </label>
      
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setShow(true); }}
          onFocus={e => {
            if (query.length >= 2) setShow(true);
            e.target.style.borderColor = '#667eea';
            e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1), 0 4px 6px rgba(0,0,0,0.1)';
          }}
          placeholder="Search or type location"
          style={{ 
            width: '100%', 
            padding: '14px 40px 14px 16px', 
            background: '#1e293b', 
            border: '2px solid #334155', 
            borderRadius: '12px', 
            color: '#f1f5f9', 
            fontSize: '15px',
            outline: 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
          onBlur={e => {
            e.target.style.borderColor = '#334155';
            e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
          }}
        />
        {query && (
          <button 
            onClick={() => { setQuery(''); onChange(null); setShow(false); }} 
            style={{ 
              position: 'absolute', 
              right: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#334155'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <X size={18} color="#64748b" />
          </button>
        )}
      </div>

      <button 
        onClick={useGPS}
        disabled={loading}
        style={{ 
          marginTop: '10px', 
          padding: '10px 14px', 
          background: loading ? '#334155' : 'transparent', 
          border: '2px solid #334155', 
          borderRadius: '10px', 
          color: loading ? '#64748b' : '#667eea', 
          fontSize: '13px', 
          fontWeight: '600', 
          cursor: loading ? 'not-allowed' : 'pointer', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
        onMouseEnter={e => {
          if (!loading) {
            e.currentTarget.style.background = '#667eea';
            e.currentTarget.style.borderColor = '#667eea';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(102, 126, 234, 0.3)';
          }
        }}
        onMouseLeave={e => {
          if (!loading) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = '#334155';
            e.currentTarget.style.color = '#667eea';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
          }
        }}
      >
        <Navigation size={16} />
        {loading ? 'Getting GPS...' : 'Use GPS Location'}
      </button>

      {/* FIXED: Dropdown now positioned correctly within wrapper */}
      {show && results.length > 0 && (
        <div style={{ 
          position: 'absolute',
          top: 'calc(100% - 50px)',
          left: 0, 
          right: 0, 
          background: '#1e293b', 
          border: '2px solid #334155', 
          borderRadius: '12px', 
          maxHeight: '240px', 
          overflowY: 'auto',
          zIndex: 9999,
          boxShadow: '0 10px 25px rgba(0,0,0,0.3), 0 0 0 1px rgba(102, 126, 234, 0.1)',
          animation: 'slideDown 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          {results.map((loc, i) => (
            <div
              key={i}
              onMouseDown={() => { 
                onChange(loc); 
                setQuery(loc.name); 
                setShow(false); 
              }}
              style={{ 
                padding: '14px 16px', 
                cursor: 'pointer', 
                borderBottom: i < results.length - 1 ? '1px solid #334155' : 'none',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                animation: `fadeIn 0.2s ease-out ${i * 0.03}s backwards`
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#667eea';
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <MapPin size={18} color="#667eea" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#f1f5f9', marginBottom: '2px' }}>
                    {loc.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>
                    {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ShaderAnimation() {
  const containerRef = useRef();
  const sceneRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const THREE = window.__THREE__;
    let camera, scene, renderer, uniforms, animId;

    const init = (T) => {
      camera = new T.Camera();
      camera.position.z = 1;
      scene = new T.Scene();
      const geometry = new T.PlaneGeometry(2, 2);
      uniforms = {
        time: { value: 1.0 },
        resolution: { value: new T.Vector2() },
      };
      const material = new T.ShaderMaterial({
        uniforms,
        vertexShader: `void main() { gl_Position = vec4(position, 1.0); }`,
        fragmentShader: `
          precision highp float;
          uniform vec2 resolution;
          uniform float time;
          void main(void) {
            vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
            float t = time * 0.05;
            float lineWidth = 0.002;
            vec3 color = vec3(0.0);
            for(int j = 0; j < 3; j++){
              for(int i = 0; i < 5; i++){
                color[j] += lineWidth * float(i*i) / abs(fract(t - 0.01*float(j) + float(i)*0.01)*5.0 - length(uv) + mod(uv.x+uv.y, 0.2));
              }
            }
            gl_FragColor = vec4(color[0], color[1], color[2], 1.0);
          }
        `,
      });
      scene.add(new T.Mesh(geometry, material));
      renderer = new T.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      container.appendChild(renderer.domElement);

      const resize = () => {
        const w = container.clientWidth, h = container.clientHeight;
        renderer.setSize(w, h);
        uniforms.resolution.value.set(renderer.domElement.width, renderer.domElement.height);
      };
      resize();
      window.addEventListener('resize', resize);

      const animate = () => {
        animId = requestAnimationFrame(animate);
        uniforms.time.value += 0.05;
        renderer.render(scene, camera);
      };
      animate();

      sceneRef.current = { renderer, geometry, material, animId, resize };
    };

    // Dynamically load Three.js then init
    if (window.THREE) {
      init(window.THREE);
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.onload = () => init(window.THREE);
      document.head.appendChild(script);
    }

    return () => {
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animId);
        window.removeEventListener('resize', sceneRef.current.resize);
        if (container.contains(sceneRef.current.renderer.domElement))
          container.removeChild(sceneRef.current.renderer.domElement);
        sceneRef.current.renderer.dispose();
        sceneRef.current.geometry.dispose();
        sceneRef.current.material.dispose();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
}

// =============================================================================
// LANDING PAGE - ENHANCED ANIMATIONS
// =============================================================================
function Landing({ onSelect }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
      background: '#000'
    }}>
      {/* Shader background replaces video */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <ShaderAnimation />
        {/* Dark overlay so text stays readable */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.75) 100%)',
          pointerEvents: 'none'
        }} />
      </div>

      <div style={{ textAlign: 'center', maxWidth: '900px', width: '100%', position: 'relative', zIndex: 2 }}>
        <div style={{
          width: '110px', height: '110px',
          background: 'rgba(255,255,255,0.08)',
          border: '1.5px solid rgba(255,255,255,0.15)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 0 40px rgba(56,189,248,0.25)',
          animation: 'bounce 2s ease-in-out infinite'
        }}>
          <Bus size={52} color="#38bdf8" strokeWidth={2} />
        </div>

        <h1 style={{
          fontSize: 'clamp(36px, 7vw, 68px)',
          fontWeight: '900',
          color: 'white',
          margin: '0 0 12px',
          letterSpacing: '-2px',
          textShadow: '0 2px 30px rgba(0,0,0,0.6)',
          animation: 'fadeInUp 0.5s ease-out'
        }}>
          Where is My Bus?
        </h1>

        <p style={{
          fontSize: '18px',
          color: 'rgba(255,255,255,0.65)',
          margin: '0 0 56px',
          letterSpacing: '0.5px',
          animation: 'fadeInUp 0.5s ease-out 0.1s backwards'
        }}>
          Real-time GPS bus tracking
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          animation: 'fadeInUp 0.5s ease-out 0.2s backwards'
        }}>
          {[
            { icon: UserCircle, title: 'Conductor', desc: 'Start trip & broadcast GPS', color: '#38bdf8', key: 'conductor' },
            { icon: Users, title: 'Passenger', desc: 'Track buses in real-time', color: '#48bb78', key: 'passenger' }
          ].map((btn, i) => (
            <button
              key={i}
              onClick={() => onSelect(btn.key)}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '24px',
                padding: '44px 32px',
                cursor: 'pointer',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
                transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.09)';
                e.currentTarget.style.border = `1px solid ${btn.color}60`;
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = `0 20px 50px rgba(0,0,0,0.4), 0 0 30px ${btn.color}25, inset 0 1px 0 rgba(255,255,255,0.1)`;
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.border = '1px solid rgba(255,255,255,0.12)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)';
              }}
            >
              <div style={{
                width: '64px', height: '64px',
                background: `${btn.color}18`,
                border: `1px solid ${btn.color}40`,
                borderRadius: '18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <btn.icon size={32} color={btn.color} strokeWidth={1.8} />
              </div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: 'white', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                {btn.title}
              </div>
              <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>
                {btn.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// CONDUCTOR - ENHANCED UI
// =============================================================================
function Conductor({ onBack }) {
  const [form, setForm] = useState({ 
    number: '', 
    name: '', 
    from: null, 
    to: null, 
    time: new Date().toTimeString().slice(0, 5) 
  });
  const [active, setActive] = useState(false);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gpsDenied, setGpsDenied] = useState(false)
  const [busId, setBusId] = useState(null);
  const intervalRef = useRef();

  const start = async e => {
    e.preventDefault();
    if (!form.number.trim() || !form.name.trim() || !form.from || !form.to) {
      alert('Please fill all fields');
      return;
    }
    setGpsDenied(false)
    setLoading(true);
    try {
      const pos = await Utils.getGPS()
      const id = `${Date.now()}`           // string key for Firebase path safety
      const route = `${form.from.name} \u2192 ${form.to.name}`

      const busRecord = {
        id,
        number: form.number,
        name:   form.name,
        route,
        color:  Utils.color(route),
        from:   form.from,
        to:     form.to,
        time:   form.time,
        lat:    pos.lat,
        lng:    pos.lng,
        speed:  0,
        updated: Date.now(),
        status: 'live',
        active: true,
        history: [{ lat: pos.lat, lng: pos.lng, time: Date.now() }],
      }

      // Write to local DB (keeps demo / same-device passenger working)
      DB.add(busRecord)

      // Write to Firebase (cross-device sync)
      const { history: _h, ...busRecordForFirebase } = busRecord
      await fbSetBus(id, busRecordForFirebase)

      setBusId(id)
      setLocation(pos)
      setActive(true)

      let last = { pos, time: Date.now(), speed: 0 }

      intervalRef.current = setInterval(async () => {
        try {
          const newPos = await Utils.getGPS()
          const dist  = Utils.distance(last.pos.lat, last.pos.lng, newPos.lat, newPos.lng)
          const hours = (Date.now() - last.time) / 3_600_000
          // Only calculate speed if movement is meaningful (>10 meters)
          // GPS drift is typically 3-10m, so threshold at 0.01km filters noise
          const speed = dist > 0.01 ? dist / hours : last.speed ?? 0

          const update = {
            lat:     newPos.lat,
            lng:     newPos.lng,
            speed,
            updated: Date.now(),
            status:  'live',
          }

          // Keep local DB in sync (same-device passenger)
          DB.update(id, update)

          // Push to Firebase — this is what passengers on other devices receive
          // Never send history to Firebase — keep it local only
          const { history: _history, ...busRecordWithoutHistory } = busRecord
          await fbSetBus(id, { ...busRecordWithoutHistory, ...update })

          setLocation(newPos)
          last = { pos: newPos, time: Date.now(), speed }
        } catch (err) {
          console.error('GPS update error:', err)
        }
      }, UPDATE_INTERVAL)   // UPDATE_INTERVAL is already defined as 5000 ms
    } catch (e) {
      if (e.message === 'Location denied') {
        setGpsDenied(true)
      } else {
        alert(e.message)
      }
    }
    setLoading(false);
  };

  const stop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (busId) {
      DB.stop(busId)
      fbRemoveBus(busId)   // deletes the Firebase record immediately
    }
    setActive(false)
    setGpsDenied(false)
    setForm({ number: '', name: '', from: null, to: null, time: new Date().toTimeString().slice(0, 5) })
    setLocation(null)
    setBusId(null)
  };

  useEffect(() => () => intervalRef.current && clearInterval(intervalRef.current), []);

  const inputStyle = {
    width: '100%',
    padding: '13px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#f1f5f9',
    fontSize: '15px',
    outline: 'none',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(8px)',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080c14',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle background grid */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      {/* Glow orb top-right */}
      <div style={{
        position: 'absolute', top: '-120px', right: '-120px',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(102,126,234,0.12) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Header bar */}
      <div style={{
        position: 'relative', zIndex: 2,
        padding: '20px 28px',
        display: 'flex', alignItems: 'center', gap: '16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
        backdropFilter: 'blur(12px)',
      }}>
        <button
          onClick={onBack}
          style={{
            padding: '9px 18px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: 'rgba(255,255,255,0.8)',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
          }}
        >
          ← Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'rgba(56,189,248,0.12)',
            border: '1px solid rgba(56,189,248,0.3)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bus size={18} color="#38bdf8" strokeWidth={2} />
          </div>
          <span style={{ fontSize: '17px', fontWeight: '700', color: 'white', letterSpacing: '-0.3px' }}>
            Conductor Dashboard
          </span>
        </div>
        {active && (
          <div style={{
            marginLeft: 'auto',
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '6px 14px',
            background: 'rgba(72,187,120,0.1)',
            border: '1px solid rgba(72,187,120,0.3)',
            borderRadius: '20px',
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: '#48bb78',
              boxShadow: '0 0 8px #48bb78',
              animation: 'pulse 2s infinite',
            }} />
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#48bb78' }}>LIVE</span>
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{
        position: 'relative', zIndex: 2,
        maxWidth: '680px', margin: '0 auto',
        padding: '36px 24px',
      }}>

        {!active ? (
          /* ── FORM STATE ── */
          <div>
            <div style={{ marginBottom: '32px' }}>
              <h1 style={{
                fontSize: '32px', fontWeight: '800',
                color: 'white', margin: '0 0 8px',
                letterSpacing: '-1px',
              }}>
                Start Your Trip
              </h1>
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                Fill in the details to begin broadcasting your location
              </p>
            </div>

            <form onSubmit={start} style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

              {/* Bus Number + Bus Name side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    Bus Number
                  </label>
                  <input
                    type="text"
                    value={form.number}
                    onChange={e => setForm({ ...form, number: e.target.value })}
                    placeholder="KA-20-1234"
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = 'rgba(102,126,234,0.6)'; e.target.style.background = 'rgba(102,126,234,0.08)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    Bus Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Express Shuttle"
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = 'rgba(102,126,234,0.6)'; e.target.style.background = 'rgba(102,126,234,0.08)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                    required
                  />
                </div>
              </div>

              {/* Route section */}
              <div style={{
                padding: '24px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '16px',
                marginBottom: '20px',
              }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '20px' }}>
                  Route
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  <LocationPicker label="From" value={form.from} onChange={from => setForm({ ...form, from })} />
                  {form.from && form.to && (
                    <div style={{
                      padding: '10px 14px',
                      background: 'rgba(102,126,234,0.08)',
                      border: '1px solid rgba(102,126,234,0.2)',
                      borderRadius: '10px',
                      color: '#818cf8',
                      fontWeight: '600',
                      fontSize: '14px',
                      marginBottom: '20px',
                      display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                      <Navigation size={14} />
                      {Utils.distance(form.from.lat, form.from.lng, form.to.lat, form.to.lng).toFixed(1)} km
                    </div>
                  )}
                  <LocationPicker label="To" value={form.to} onChange={to => setForm({ ...form, to })} />
                </div>
              </div>

              {/* Start time */}
              <div style={{ marginBottom: '28px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Departure Time
                </label>
                <input
                  type="time"
                  value={form.time}
                  onChange={e => setForm({ ...form, time: e.target.value })}
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(102,126,234,0.6)'; e.target.style.background = 'rgba(102,126,234,0.08)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                  required
                />
              </div>

              {gpsDenied && (
                <div style={{
                  marginBottom: '16px',
                  padding: '14px 16px',
                  background: 'rgba(245,101,101,0.08)',
                  border: '1px solid rgba(245,101,101,0.25)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  color: '#fca5a5',
                  lineHeight: '1.6',
                }}>
                  <strong style={{ display: 'block', marginBottom: '4px' }}>
                    Location access denied
                  </strong>
                  Go to your browser settings and allow location access for this site, then refresh the page.
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '16px',
                  background: loading ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                  border: loading ? '1px solid rgba(255,255,255,0.1)' : 'none',
                  borderRadius: '14px',
                  color: loading ? 'rgba(255,255,255,0.4)' : 'white',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  boxShadow: loading ? 'none' : '0 8px 24px rgba(56,189,248,0.28)',
                  transition: 'all 0.25s ease',
                  letterSpacing: '-0.2px',
                }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 32px rgba(56,189,248,0.38)'; } }}
                onMouseLeave={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(56,189,248,0.28)'; } }}
              >
                <Play size={18} />
                {loading ? 'Acquiring GPS...' : 'Start GPS Tracking'}
              </button>
            </form>
          </div>
        ) : (
          /* ── ACTIVE TRIP STATE ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeInUp 0.4s ease-out' }}>
            <div style={{ marginBottom: '8px' }}>
              <h1 style={{ fontSize: '30px', fontWeight: '800', color: 'white', margin: '0 0 6px', letterSpacing: '-1px' }}>
                Trip Active
              </h1>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                Broadcasting location every 5 seconds
              </p>
            </div>

            {/* Bus + Route info as two-col cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{
                padding: '20px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
              }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Bus
                </div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: 'white', marginBottom: '4px' }}>{form.name}</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{form.number}</div>
              </div>
              <div style={{
                padding: '20px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
              }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Route
                </div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'white', lineHeight: '1.5' }}>
                  {form.from?.name?.split(' ')[0]} → {form.to?.name?.split(' ')[0]}
                </div>
              </div>
            </div>

            {/* GPS live card */}
            <div style={{
              padding: '24px',
              background: 'rgba(72,187,120,0.06)',
              border: '1px solid rgba(72,187,120,0.2)',
              borderRadius: '16px',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: '-30px', right: '-30px',
                width: '120px', height: '120px',
                background: 'radial-gradient(circle, rgba(72,187,120,0.12) 0%, transparent 70%)',
                borderRadius: '50%', pointerEvents: 'none',
              }} />
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(72,187,120,0.7)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#48bb78', boxShadow: '0 0 6px #48bb78', animation: 'pulse 2s infinite' }} />
                GPS Location — updating every 5s
              </div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#48bb78', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                {location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : 'Acquiring GPS...'}
              </div>
            </div>

            {/* End trip button */}
            <button
              onClick={stop}
              style={{
                marginTop: '8px',
                padding: '16px',
                background: 'rgba(245,101,101,0.1)',
                border: '1px solid rgba(245,101,101,0.3)',
                borderRadius: '14px',
                color: '#f56565',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(245,101,101,0.18)';
                e.currentTarget.style.borderColor = 'rgba(245,101,101,0.5)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(245,101,101,0.1)';
                e.currentTarget.style.borderColor = 'rgba(245,101,101,0.3)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Square size={18} />
              End Trip
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// REAL MAP - OPTIMIZED
// =============================================================================
function RealMap({ buses, selected }) {
  const containerRef = useRef();
  const mapRef = useRef();
  const markersRef = useRef({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadLeaflet = () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.onerror = () => setError('Failed to load map styles');
        document.head.appendChild(link);
      }
      
      if (!window.L) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = initMap;
        script.onerror = () => setError('Failed to load map library');
        document.head.appendChild(script);
      } else {
        initMap();
      }
    };

    const initMap = () => {
      if (mapRef.current || !containerRef.current || !window.L) return;
      try {
        const map = window.L.map(containerRef.current, { 
          zoomControl: true,
          attributionControl: false
        }).setView(MAP_CONFIG.center, MAP_CONFIG.zoom);
        
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(map);
        
        mapRef.current = map;
        setReady(true);
      } catch (e) {
        setError('Map initialization failed');
        console.error(e);
      }
    };

    loadLeaflet();
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      Object.values(markersRef.current).forEach(m => m.remove());
      markersRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.L) return;
    const map = mapRef.current;
    const L = window.L;

    Object.keys(markersRef.current).forEach(num => {
      if (!buses.find(b => b.number === num && b.active)) {
        markersRef.current[num].remove();
        delete markersRef.current[num];
      }
    });

    buses.forEach(bus => {
      if (!bus.lat || !bus.lng) return;
      const isSelected = selected?.number === bus.number;
      const size = isSelected ? MARKER_SIZE.selected : MARKER_SIZE.default;

      if (markersRef.current[bus.number]) {
        const marker = markersRef.current[bus.number];
        marker.setLatLng([bus.lat, bus.lng]);
        
        const newIcon = L.divIcon({
          html: `<div style="width:${size}px;height:${size}px;background:${bus.color};border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 ${isSelected ? 8 : 4}px ${isSelected ? 20 : 15}px rgba(0,0,0,${isSelected ? 0.5 : 0.4});transition:all 0.3s ease"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><rect x="3" y="6" width="18" height="11" rx="2"/><path d="M3 9h18M7 17h.01M17 17h.01"/></svg></div>`,
          className: 'bus-marker',
          iconSize: [size, size],
          iconAnchor: [size/2, size/2]
        });
        marker.setIcon(newIcon);
        
        if (isSelected) marker.openPopup();
      } else {
        const icon = L.divIcon({
          html: `<div style="width:${size}px;height:${size}px;background:${bus.color};border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 ${isSelected ? 8 : 4}px ${isSelected ? 20 : 15}px rgba(0,0,0,${isSelected ? 0.5 : 0.4});transition:all 0.3s ease"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><rect x="3" y="6" width="18" height="11" rx="2"/><path d="M3 9h18M7 17h.01M17 17h.01"/></svg></div>`,
          className: 'bus-marker',
          iconSize: [size, size],
          iconAnchor: [size/2, size/2]
        });
        
        const marker = L.marker([bus.lat, bus.lng], { icon }).addTo(map);
        marker.bindPopup(`<div style="font-family:system-ui;padding:12px;min-width:220px"><div style="font-size:20px;font-weight:800;color:${bus.color};margin-bottom:8px">${bus.name}</div><div style="font-size:14px;color:#64748b;margin-bottom:14px;font-family:monospace">${bus.number}</div><div style="background:#f1f5f9;padding:12px;border-radius:10px;margin-bottom:10px"><div style="font-size:11px;color:#64748b;margin-bottom:4px;font-weight:600">ROUTE</div><div style="font-size:14px;font-weight:700;color:#1e293b">${bus.route}</div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px"><div><div style="font-size:11px;color:#64748b;font-weight:600">Speed</div><div style="font-size:18px;font-weight:800;color:#10b981">${Math.round(bus.speed||0)} km/h</div></div><div><div style="font-size:11px;color:#64748b;font-weight:600">Start</div><div style="font-size:18px;font-weight:800;color:#1e293b">${bus.time}</div></div></div><div style="background:#f1f5f9;padding:10px;border-radius:8px;font-size:12px;color:#10b981;font-family:monospace;word-break:break-all">${bus.lat.toFixed(6)}, ${bus.lng.toFixed(6)}</div></div>`);
        
        if (isSelected) marker.openPopup();
        markersRef.current[bus.number] = marker;
      }
    });

    const points = buses.filter(b => b.lat && b.lng).map(b => [b.lat, b.lng]);
    if (points.length > 0) {
      map.fitBounds(points, { padding: [60, 60], maxZoom: 15 });
    }

    if (selected?.lat && selected?.lng) {
      setTimeout(() => {
        map.setView([selected.lat, selected.lng], MAP_CONFIG.selectedZoom, { 
          animate: true,
          duration: 0.8
        });
      }, 100);
    }
  }, [buses, selected, ready]);

  if (error) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ef4444', fontSize: '18px', fontWeight: '600' }}>{error}</div>;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#1a2332' }} />
      
      {!ready && (
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          background: '#1a2332', 
          color: '#64748b', 
          fontSize: '18px',
          fontWeight: '600'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '50px', 
              height: '50px', 
              border: '3px solid #334155',
              borderTopColor: '#667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            Loading map...
          </div>
        </div>
      )}
      
      {ready && (
        <>
          <div style={{ 
            position: 'absolute', 
            top: '20px', 
            left: '20px', 
            background: 'white', 
            border: '3px solid #10b981', 
            borderRadius: '16px', 
            padding: '20px 24px', 
            boxShadow: '0 12px 35px rgba(0,0,0,0.4)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px', 
            zIndex: 1000,
            animation: 'fadeIn 0.5s ease-out'
          }}>
            <div style={{ 
              width: '16px', 
              height: '16px', 
              borderRadius: '50%', 
              background: '#10b981', 
              animation: 'pulse 2s infinite', 
              boxShadow: '0 0 18px #10b981' 
            }} />
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '3px', fontWeight: '600' }}>
                Live Buses
              </div>
              <div style={{ fontSize: '32px', fontWeight: '900', color: '#10b981' }}>
                {buses.filter(b => b.status === 'live').length}
              </div>
            </div>
          </div>
          
          <div style={{ 
            position: 'absolute', 
            bottom: '20px', 
            right: '20px', 
            background: 'white', 
            padding: '14px 20px', 
            borderRadius: '12px', 
            fontSize: '13px', 
            color: '#64748b', 
            fontFamily: 'monospace', 
            boxShadow: '0 6px 20px rgba(0,0,0,0.3)', 
            zIndex: 1000,
            fontWeight: '600',
            animation: 'fadeIn 0.5s ease-out 0.2s backwards'
          }}>
            Real-time GPS • Updates every 5s
          </div>
        </>
      )}
      
      <style>{`
        .bus-marker { background: transparent !important; border: none !important; }
        .leaflet-popup-content-wrapper { padding: 0; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
        .leaflet-popup-content { margin: 0; width: auto !important; }
        .leaflet-popup-tip { display: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}

// =============================================================================
// PASSENGER - POLISHED UI
// =============================================================================
function Passenger({ onBack }) {
  const [buses, setBuses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const hasAutoSelected = useRef(false);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    // Always subscribe to local DB (catches same-device conductor)
    const unsubLocal = DB.subscribe(list => {
      setBuses(prev => {
        // Merge: remote (Firebase) records take precedence; local fills the rest
        const remoteIds = new Set(prev.filter(b => b._remote).map(b => b.id))
        // Only include active local buses not already covered by Firebase
        const localOnly = list.filter(b => b.active && !remoteIds.has(b.id))
        return [...prev.filter(b => b._remote), ...localOnly]
      })
    })

    // Subscribe to Firebase for cross-device updates
    const unsubRemote = fbSubscribeBuses(remoteBuses => {
      const live = remoteBuses.map(b => ({
        ...b,
        updated: b.updatedAt ?? b.updated,
        active:  true,
        status:  'live',
        _remote: true,   // flag so the merge above knows this came from Firebase
      }))
      setBuses(prev => {
        // Keep local-only buses, replace/add all remote ones
        const localOnly = prev.filter(b => !b._remote)
        const merged    = [...localOnly]
        for (const rb of live) {
          const idx = merged.findIndex(b => b.id === rb.id)
          if (idx >= 0) merged[idx] = rb
          else merged.push(rb)
        }
        return merged
      })
    })

    return () => {
      unsubLocal()
      unsubRemote()
    }
  }, []);

  useEffect(() => {
    if (hasAutoSelected.current) return
    const active = buses.filter(b => b.active)
    if (active.length > 0) {
      setSelected(active[0])
      hasAutoSelected.current = true
    }
  }, [buses])

  const active = buses.filter(b => b.active);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a', overflow: 'hidden' }}>
      <div style={{ 
        padding: '16px 24px',
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Users size={32} color="white" strokeWidth={2.5} />
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'white', letterSpacing: '-0.5px' }}>
            Live Bus Tracker
          </h1>
          <div style={{ 
            padding: '5px 12px',
            background: 'rgba(72,187,120,0.12)',
            border: '1px solid rgba(72,187,120,0.25)',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '700',
            color: '#48bb78',
          }}>
            {active.length} Live
          </div>
        </div>
        <button 
          onClick={onBack} 
          style={{ 
            padding: '9px 18px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: 'rgba(255,255,255,0.8)',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
            e.currentTarget.style.transform = 'translateX(-4px)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          ← Back
        </button>
      </div>
      
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        flexDirection: isMobile ? 'column' : 'row',
      }}>
        <div style={{
          width: isMobile ? '100%' : '380px',
          height: isMobile ? 'auto' : '100%',
          maxHeight: isMobile ? '42vh' : 'none',
          background: '#0d1117',
          borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.07)',
          borderBottom: isMobile ? '1px solid rgba(255,255,255,0.07)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          flexShrink: 0,
        }}>
          <div style={{ padding: '24px' }}>
            <div style={{ 
              fontSize: '13px', 
              fontWeight: '700', 
              color: 'rgba(255,255,255,0.3)', 
              textTransform: 'uppercase', 
              letterSpacing: '1.2px', 
              marginBottom: '18px' 
            }}>
              Select Bus to Track
            </div>
            
            {active.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
                <Bus size={56} style={{ margin: '0 auto 20px', opacity: 0.25 }} />
                <div style={{ fontSize: '18px', marginBottom: '10px', fontWeight: '600' }}>No Active Buses</div>
                <div style={{ fontSize: '14px', opacity: 0.8 }}>Waiting for conductors to start trips</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {active.map((bus, idx) => {
                  const isSelected = selected?.number === bus.number;
                  const age      = Math.max(0, Math.round((Date.now() - (bus.updatedAt ?? bus.updated)) / 1000))
                  return (
                    <div 
                      key={bus.number} 
                      onClick={() => setSelected(bus)} 
                      style={{ 
                        padding: '18px', 
                        background: isSelected ? bus.color : '#334155', 
                        border: `2px solid ${isSelected ? bus.color : 'transparent'}`, 
                        borderRadius: '16px', 
                        cursor: 'pointer', 
                        transform: isSelected ? 'scale(1.03)' : 'scale(1)', 
                        boxShadow: isSelected ? `0 8px 25px ${bus.color}60` : '0 2px 8px rgba(0,0,0,0.2)',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        animation: `fadeIn 0.3s ease-out ${idx * 0.05}s backwards`
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) {
                          e.currentTarget.style.background = '#475569';
                          e.currentTarget.style.transform = 'scale(1.02)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) {
                          e.currentTarget.style.background = '#334155';
                          e.currentTarget.style.transform = 'scale(1)';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                        <div style={{ 
                          width: '52px', 
                          height: '52px', 
                          background: isSelected ? 'rgba(255,255,255,0.2)' : bus.color, 
                          borderRadius: '14px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          transition: 'all 0.3s ease'
                        }}>
                          <Bus size={26} color="white" strokeWidth={2.5} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            fontSize: '17px', 
                            fontWeight: '800', 
                            color: 'white', 
                            marginBottom: '5px', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap' 
                          }}>
                            {bus.name}
                          </div>
                          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace' }}>
                            {bus.number}
                          </div>
                        </div>
                        <div style={{ 
                          width: '14px', 
                          height: '14px', 
                          background: bus.status === 'live' ? '#48bb78' : '#f56565', 
                          borderRadius: '50%', 
                          boxShadow: bus.status === 'live' ? '0 0 12px #48bb78' : 'none',
                          animation: bus.status === 'live' ? 'pulse 2s infinite' : 'none'
                        }} />
                      </div>
                      
                      <div style={{ 
                        padding: '12px 14px', 
                        background: isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.25)', 
                        borderRadius: '10px', 
                        marginBottom: '12px',
                        transition: 'all 0.3s ease'
                      }}>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginBottom: '5px', fontWeight: '600' }}>
                          ROUTE
                        </div>
                        <div style={{ fontSize: '14px', color: 'white', fontWeight: '700' }}>
                          {bus.route}
                        </div>
                      </div>
                      
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                        gap: '10px', 
                        fontSize: '13px', 
                        color: 'rgba(255,255,255,0.95)',
                        fontWeight: '600'
                      }}>
                        <div>
                          <span style={{ opacity: 0.7 }}>Speed:</span> {Math.round(bus.speed)} km/h
                        </div>
                        <div>
                          <span style={{ opacity: 0.7 }}>Updated:</span>{' '}
                          {age <= 10  ? <span style={{ color: '#48bb78', fontWeight: 700 }}>{age}s ago ✓</span>
                           : age <= 30 ? <span style={{ color: '#f6c90e' }}>{age}s ago</span>
                           : age < 3600 ? <span style={{ color: '#94a3b8' }}>{age}s ago</span>
                           : <span style={{ color: '#94a3b8' }}>{Math.floor(age/3600)}h ago</span>}
                        </div>
                      </div>

                      {Utils.eta(bus) && (
                        <div style={{
                          marginTop: '10px',
                          padding: '8px 12px',
                          background: isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)',
                          borderRadius: '8px',
                          fontSize: '13px',
                          color: 'rgba(255,255,255,0.95)',
                          fontWeight: '700',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}>
                          <span style={{ opacity: 0.7 }}>ETA to {bus.to?.name?.split(' ')[0]}:</span>
                          <span style={{ color: '#48bb78' }}>{Utils.eta(bus)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        <div style={{
          flex: 1,
          position: 'relative',
          background: '#0f172a',
          minHeight: isMobile ? '58vh' : '100%',
        }}>
          {active.length === 0 ? (
            <div style={{ 
              width: '100%', 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#64748b' 
            }}>
              <MapPin size={72} style={{ margin: '0 auto 24px', opacity: 0.25 }} />
              <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '10px' }}>
                No Active Buses
              </div>
              <div style={{ fontSize: '15px', opacity: 0.8 }}>
                Map will appear when conductors start tracking
              </div>
            </div>
          ) : (
            <RealMap buses={active} selected={selected} />
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// APP
// =============================================================================
export default function App() {
  const [page, setPage] = useState('landing');

  useEffect(() => {
    DB.init();
    const cleanup = setInterval(() => DB.cleanup(), CLEANUP_INTERVAL);
    return () => clearInterval(cleanup);
  }, []);

  return (
    <>
      {page === 'landing' && <Landing onSelect={setPage} />}
      {page === 'conductor' && <Conductor onBack={() => setPage('landing')} />}
      {page === 'passenger' && <Passenger onBack={() => setPage('landing')} />}
    </>
  );
}

