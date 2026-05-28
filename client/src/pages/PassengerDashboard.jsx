import React, { useEffect, useState } from 'react';
import './PassengerDashboard.css';

// ─── Icônes SVG légères ────────────────────────────────────────────────────

function IconWifi() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="rgba(255,255,255,.8)" strokeWidth="2" strokeLinecap="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <circle cx="12" cy="20" r=".5" fill="rgba(255,255,255,.8)" />
    </svg>
  );
}

function IconBattery() {
  return (
    <svg width="16" height="14" viewBox="0 0 24 14">
      <rect x="0" y="1" width="20" height="12" rx="2"
        stroke="rgba(255,255,255,.8)" strokeWidth="1.5" fill="none" />
      <rect x="20.5" y="4" width="3" height="6" rx="1"
        fill="rgba(255,255,255,.8)" />
      <rect x="2" y="3" width="13" height="8" rx="1"
        fill="rgba(255,255,255,.8)" />
    </svg>
  );
}

// ─── Utilitaire : formate les mètres / km ─────────────────────────────────
function formatDist(meters) {
  if (!meters && meters !== 0) return { num: '—', unit: '' };
  if (meters < 1000) return { num: `${Math.round(meters)}`, unit: 'm' };
  return { num: (meters / 1000).toFixed(1), unit: 'km' };
}

// ─── Utilitaire : couleur d'occupation ────────────────────────────────────
function occupancyClass(passengers, capacity) {
  if (!capacity) return '';
  const ratio = passengers / capacity;
  if (ratio >= 0.9) return 'chip-red';
  if (ratio >= 0.6) return 'chip-orange';
  return 'chip-green';
}

// ─── Dédoublonnage robuste ─────────────────────────────────────────────────
// Filtre par id ET par nom du bus.
// Si le serveur génère des id différents pour la même entrée,
// le nom du bus sert de clé de déduplication secondaire.
function deduplicateBuses(list) {
  const seenIds   = new Set();
  const seenNames = new Set();
  return list.filter(b => {
    if (seenIds.has(b.id))     return false;
    if (seenNames.has(b.name)) return false;
    seenIds.add(b.id);
    seenNames.add(b.name);
    return true;
  });
}

// ─── Composant principal ──────────────────────────────────────────────────

export default function PassengerDashboard({ socket, position, name }) {
  const [data,     setData]     = useState(null);
  const [geoInfo,  setGeoInfo]  = useState(null);
  const [geoError, setGeoError] = useState(false);

  // ── Join WebSocket ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !position) return;
    socket.emit('passenger:join', { name, lat: position.lat, lon: position.lon });
  }, [socket?.id, position]);

  // ── Écouter les mises à jour ────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handler = (update) => setData(update);
    socket.on('passenger:update', handler);
    return () => socket.off('passenger:update', handler);
  }, [socket]);

  // ── Refresh toutes les 10s ──────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const t = setInterval(() => socket.emit('ping:refresh'), 10000);
    return () => clearInterval(t);
  }, [socket]);

  // ── Reverse-geocoding avec Nominatim ───────────────────────────────────
  useEffect(() => {
    const pos = data?.position || position;
    if (!pos) return;

    fetch(
      `https://nominatim.openstreetmap.org/reverse` +
      `?lat=${pos.lat}&lon=${pos.lon}&format=json&accept-language=fr`,
      { headers: { 'Accept-Language': 'fr' } }
    )
      .then(r => r.json())
      .then(json => {
        const a = json.address || {};
        setGeoInfo({
          displayName: json.display_name,
          fokontany:   a.suburb   || a.quarter || a.neighbourhood || null,
          commune:     a.city     || a.town    || a.village       || null,
          district:    a.county   || a.district || null,
          region:      a.state    || a.region  || null,
          pays:        a.country  || null,
        });
        setGeoError(false);
      })
      .catch(() => setGeoError(true));
  }, [data?.position?.lat, data?.position?.lon, position?.lat, position?.lon]);

  // ── Données dérivées ────────────────────────────────────────────────────
  const buses = deduplicateBuses(data?.nearbyBuses || []);
  const pos   = data?.position || position;
  const time  = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  });

  // ── Données de localisation ─────────────────────────────────────────────
  const locationRows = [
    {
      key:   'fokontany',
      icon:  '🏘️',
      cls:   'area',
      label: 'Fokontany',
      name:  geoInfo?.fokontany || '—',
      sub:   null,
    },
    {
      key:   'commune',
      icon:  '🏙️',
      cls:   'city',
      label: 'Ville',
      name:  geoInfo?.commune || '—',
      sub:   geoInfo?.district || null,
    },
    {
      key:   'region',
      icon:  '🗺️',
      cls:   'region',
      label: 'Région',
      name:  geoInfo?.region || '—',
      sub:   null,
    },
    {
      key:   'pays',
      icon:  '🌍',
      cls:   'country',
      label: 'Pays',
      name:  geoInfo?.pays || '—',
      sub:   null,
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="dash-wrap">

      {/* ── Barre de statut Android ── */}
      <div className="status-bar">
        <span>{time}</span>
        <div className="status-right">
          <IconWifi />
          <IconBattery />
        </div>
      </div>

      {/* ── Header Facebook-style ── */}
      <header className="dash-header">
        <div className="header-left">
          <div className="header-avatar">🧍</div>
          <div className="header-text">
            <h1>Interface Voyageur</h1>
            <p>{name}</p>
          </div>
        </div>
        <div className="header-live">
          <div className="live-dot" />
          EN DIRECT
        </div>
      </header>

      {/* ── Corps scrollable ── */}
      <div className="dash-body">

        {/* ══ CARTE 1 — Localisation ═════════════════════════════════════ */}
        <div className="fb-card">
          <div className="card-header">
            <div className="card-header-icon icon-green">🗺️</div>
            <div className="card-header-title">
              <h2>Votre Localisation</h2>
              <p>
                {geoInfo
                  ? 'Adresse détectée automatiquement'
                  : geoError
                  ? 'Erreur de géocodage'
                  : 'Résolution en cours…'}
              </p>
            </div>
          </div>

          <div className="location-list">
            {locationRows.map((row) => (
              <div className="location-row" key={row.key}>
                <div className={`loc-icon ${row.cls}`}>{row.icon}</div>
                <div className="loc-info">
                  <span className="loc-label">{row.label}</span>
                  <span className="loc-name">{row.name}</span>
                  {row.sub && <span className="loc-sub">{row.sub}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ CARTE 2 — Bus proches ══════════════════════════════════════ */}
        <div className="fb-card">
          <div className="card-header">
            <div className="card-header-icon icon-orange">🚌</div>
            <div className="card-header-title">
              <h2>Bus les Plus Proches</h2>
              <p>Mis à jour en direct</p>
            </div>
            <div className="card-badge">{buses.length}</div>
          </div>

          {buses.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🔍</span>
              <p>Aucun bus à proximité</p>
              <small>En attente de chauffeurs connectés…</small>
            </div>
          ) : (
            <div className="bus-list">
              {buses.map((bus, i) => {
                const d     = formatDist(bus.distance);
                const fill  = Math.max(5, 100 - (bus.distance / 5000) * 100);
                const ocCls = occupancyClass(bus.passengers, bus.capacity);
                return (
                  <div
                    key={bus.id}
                    className="bus-item"
                    style={{ animationDelay: `${i * 0.06}s` }}
                  >
                    <div className="bus-rank">{i + 1}</div>
                    <div className="bus-avatar">🚌</div>
                    <div className="bus-info">
                      <div className="bus-name">{bus.name}</div>
                      <div className="bus-meta">
                        <span className={`bus-chip ${ocCls}`}>
                          {bus.passengers ?? 0}/{bus.capacity ?? '?'} pass.
                        </span>
                        {bus.speed > 0 && (
                          <span className="bus-chip chip-blue">
                            {bus.speed} km/h
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="bus-right">
                      <span className="bus-dist-val">
                        {d.num} <span style={{ fontSize: 10 }}>{d.unit}</span>
                      </span>
                      <div className="bus-dist-bar">
                        <div
                          className="bus-dist-fill"
                          style={{ width: `${fill}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>{/* /dash-body */}

      {/* ── Barre de navigation Android ── */}
      <div className="nav-bar">
        <div className="home-indicator" />
      </div>

    </div>
  );
}