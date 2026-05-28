import React, { useEffect, useState } from 'react';
import './DriverDashboard.css';

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
      <rect x="20.5" y="4" width="3" height="6" rx="1" fill="rgba(255,255,255,.8)" />
      <rect x="2" y="3" width="13" height="8" rx="1" fill="rgba(255,255,255,.8)" />
    </svg>
  );
}

// ─── Utilitaires ───────────────────────────────────────────────────────────

function formatDist(meters) {
  if (!meters && meters !== 0) return { num: '—', unit: '' };
  if (meters < 1000) return { num: `${Math.round(meters)}`, unit: 'm' };
  return { num: (meters / 1000).toFixed(1), unit: 'km' };
}

function distBarWidth(meters, maxMeters = 5000) {
  return Math.max(5, 100 - (meters / maxMeters) * 100);
}

function occupancyChip(passengers, capacity) {
  if (!capacity) return null;
  const r = passengers / capacity;
  const cls = r >= 0.9 ? 'chip-red' : r >= 0.6 ? 'chip-orange' : 'chip-purple';
  return <span className={`comp-chip ${cls}`}>{passengers}/{capacity} pass.</span>;
}

// ─── Composant principal ───────────────────────────────────────────────────

export default function DriverDashboard({ socket, position, name, busName }) {
  const [data,    setData]    = useState(null);
  const [geoInfo, setGeoInfo] = useState(null);

  // ── Join ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !position) return;
    socket.emit('driver:join', {
      name,
      lat: position.lat,
      lon: position.lon,
      busName,
      busCapacity: 30,
    });
  }, [socket?.id, position]);

  // ── Écouter mises à jour ────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handler = (update) => setData(update);
    socket.on('driver:update', handler);
    return () => socket.off('driver:update', handler);
  }, [socket]);

  // ── Refresh 10s ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const t = setInterval(() => socket.emit('ping:refresh'), 10000);
    return () => clearInterval(t);
  }, [socket]);

  // ── Reverse-geocoding Nominatim ─────────────────────────────────────────
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
          fokontany: a.suburb || a.quarter || a.neighbourhood || null,
          commune:   a.city   || a.town    || a.village       || null,
          region:    a.state  || a.region  || null,
          pays:      a.country || null,
        });
      })
      .catch(() => {});
  }, [data?.position?.lat, data?.position?.lon, position?.lat, position?.lon]);

  // ── Données dérivées ────────────────────────────────────────────────────
  const passengers  = data?.nearbyPassengers  || [];
  const pos         = data?.position          || position;

  // Exclure le bus actuel (même nom OU même id que socket) + dédoublonner par id
  const mySocketId = socket?.id;
  const rawCompetitors = data?.nearbyCompetitors || [];
  const seenIds = new Set();
  const competitors = rawCompetitors.filter(b => {
    // Exclure soi-même
    if (b.id === mySocketId) return false;
    if (b.name === busName)  return false;
    // Dédoublonner
    if (seenIds.has(b.id))   return false;
    seenIds.add(b.id);
    return true;
  });

  const time = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="driver-wrap">

      {/* ── Barre de statut Android ── */}
      <div className="status-bar">
        <span>{time}</span>
        <div className="status-right">
          <IconWifi />
          <IconBattery />
        </div>
      </div>

      {/* ── Header orange chauffeur ── */}
      <header className="driver-header">
        <div className="header-left">
          <div className="header-avatar">🚌</div>
          <div className="header-text">
            <h1>Tableau de Bord Chauffeur</h1>
            <p>{name} · {busName}</p>
          </div>
        </div>
        <div className="header-service">
          <div className="service-dot" />
          EN SERVICE
        </div>
      </header>

      {/* ── Statistiques rapides ── */}
      <div className="stats-row">
        <div className="stat-chip stat-orange">
          <span className="stat-val">30</span>
          <span className="stat-lbl">Capacité</span>
        </div>
        <div className="stat-chip stat-green">
          <span className="stat-val">{passengers.length}</span>
          <span className="stat-lbl">Voyageurs</span>
        </div>
        <div className="stat-chip stat-purple">
          <span className="stat-val">{competitors.length}</span>
          <span className="stat-lbl">Concurrents</span>
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="driver-body">

       
        {/* ══ CARTE 2 — Voyageurs proches ════════════════════════════════ */}
        <div className="fb-card">
          <div className="card-header">
            <div className="card-header-icon icon-green">🧍</div>
            <div className="card-header-title">
              <h2>Top 10 Voyageurs Proches</h2>
              <p>Mis à jour en direct</p>
            </div>
            <div className="card-badge badge-green">{passengers.length}</div>
          </div>

          {passengers.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🔍</span>
              <p>Aucun voyageur à proximité</p>
              <small>En attente de voyageurs connectés…</small>
            </div>
          ) : (
            <div className="person-list">
              {passengers.map((p, i) => {
                const d    = formatDist(p.distance);
                const fill = distBarWidth(p.distance, 2000);
                return (
                  <div
                    key={p.id}
                    className="person-item"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="person-rank">{i + 1}</div>
                    <div className="person-avatar">🧍</div>
                    <div className="person-info">
                      <div className="person-name">{p.name}</div>
                      <div className="person-sub">Voyageur</div>
                    </div>
                    <div className="person-dist">
                      <span className="dist-val">{d.num}</span>
                      <span className="dist-unit">{d.unit}</span>
                      <div className="dist-bar">
                        <div
                          className="dist-fill-green"
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

        {/* ══ CARTE 3 — Concurrents ══════════════════════════════════════ */}
        <div className="fb-card">
          <div className="card-header">
            <div className="card-header-icon icon-purple">🚎</div>
            <div className="card-header-title">
              <h2>Top 5 Bus Concurrents</h2>
              <p>Surveillance de la zone</p>
            </div>
            <div className="card-badge badge-purple">{competitors.length}</div>
          </div>

          {competitors.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🚎</span>
              <p>Aucun concurrent détecté</p>
              <small>Vous êtes le seul bus actif</small>
            </div>
          ) : (
            <div className="competitor-list">
              {competitors.map((b, i) => {
                const d    = formatDist(b.distance);
                const fill = distBarWidth(b.distance, 5000);
                return (
                  <div
                    key={b.id}
                    className="competitor-item"
                    style={{ animationDelay: `${i * 0.06}s` }}
                  >
                    <div className="comp-rank">{i + 1}</div>
                    <div className="comp-avatar">🚎</div>
                    <div className="comp-info">
                      <div className="comp-name">{b.name}</div>
                      <div className="comp-meta">
                        {occupancyChip(b.passengers ?? 0, b.capacity)}
                        {b.speed != null && b.speed > 0 && (
                          <span className="comp-chip chip-orange">
                            {b.speed} km/h
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="comp-dist">
                      <span className="dist-val">{d.num}</span>
                      <span className="dist-unit">{d.unit}</span>
                      <div className="dist-bar">
                        <div
                          className="dist-fill-purple"
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

      </div>{/* /driver-body */}

      {/* ── Barre de navigation Android ── */}
      <div className="nav-bar">
        <div className="home-indicator" />
      </div>

    </div>
  );
}