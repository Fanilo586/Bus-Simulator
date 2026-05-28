import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import RoleSelect        from './pages/RoleSelect.jsx';
import JoinForm          from './components/JoinForm.jsx';
import PassengerDashboard from './pages/PassengerDashboard.jsx';
import DriverDashboard    from './pages/DriverDashboard.jsx';

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

// App states: 'select' | 'join' | 'dashboard'
export default function App() {
  const [appState,  setAppState]  = useState('select');  // select → join → dashboard
  const [role,      setRole]      = useState(null);      // 'passenger' | 'driver'
  const [userInfo,  setUserInfo]  = useState(null);
  const [position,  setPosition]  = useState(null);
  const [geoError,  setGeoError]  = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  // Establish socket connection once
  useEffect(() => {
    const socket = io(SERVER, { transports: ['websocket', 'polling'], autoConnect: true });
    socketRef.current = socket;
    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    return () => socket.disconnect();
  }, []);

  // Acquire geolocation
  function acquireGeo(cb) {
    if (!navigator.geolocation) {
      const fallback = { lat: -18.9137 + (Math.random() - 0.5) * 0.04, lon: 47.5361 + (Math.random() - 0.5) * 0.04 };
      setPosition(fallback);
      cb(fallback);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setPosition(p);
        cb(p);
      },
      () => {
        const fallback = { lat: -18.9137 + (Math.random() - 0.5) * 0.04, lon: 47.5361 + (Math.random() - 0.5) * 0.04 };
        setPosition(fallback);
        setGeoError('Géolocalisation refusée — position simulée utilisée');
        cb(fallback);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function handleRoleSelect(selectedRole) {
    setRole(selectedRole);
    setAppState('join');
  }

  function handleJoin(info) {
    setUserInfo(info);
    acquireGeo((pos) => {
      setPosition(pos);
      setAppState('dashboard');
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (appState === 'select') {
    return <RoleSelect onSelect={handleRoleSelect} />;
  }

  if (appState === 'join') {
    return <JoinForm role={role} onJoin={handleJoin} />;
  }

  if (appState === 'dashboard') {
    return (
      <>
        {geoError && (
          <div style={{
            background:'rgba(255,212,0,0.1)', borderBottom:'1px solid rgba(255,212,0,0.2)',
            padding:'0.5rem 2rem', fontSize:'0.8rem', color:'var(--yellow)',
            fontFamily:'var(--font-mono)', textAlign:'center'
          }}>
            ⚠️ {geoError}
          </div>
        )}
        {!connected && (
          <div style={{
            background:'rgba(255,68,68,0.1)', borderBottom:'1px solid rgba(255,68,68,0.2)',
            padding:'0.5rem 2rem', fontSize:'0.8rem', color:'var(--red)',
            fontFamily:'var(--font-mono)', textAlign:'center'
          }}>
            🔴 Connexion au serveur perdue — tentative de reconnexion…
          </div>
        )}

        {role === 'passenger' ? (
          <PassengerDashboard
            socket={socketRef.current}
            position={position}
            name={userInfo?.name}
          />
        ) : (
          <DriverDashboard
            socket={socketRef.current}
            position={position}
            name={userInfo?.name}
            busName={userInfo?.busName}
            busCapacity={userInfo?.busCapacity}
          />
        )}
      </>
    );
  }

  return null;
}
