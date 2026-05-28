import React, { useRef } from 'react';
import './RoleSelect.css';

// ── Icônes SVG inline (pas de dépendance externe) ──────────────────────────

function IconWifi() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#E0E0E0" strokeWidth="1.5" strokeLinecap="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <circle cx="12" cy="20" r="0.5" fill="#E0E0E0" />
    </svg>
  );
}

function IconBattery() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16">
      <rect x="2" y="7" width="15" height="11" rx="2" fill="#E0E0E0" />
      <rect x="19" y="10" width="3" height="5" rx="1" fill="#E0E0E0" />
      <rect x="4" y="9" width="9" height="7" rx="1" fill="#0F1117" />
    </svg>
  );
}

// ── Composant principal ────────────────────────────────────────────────────

export default function RoleSelect({ onSelect }) {
  const passengerRef = useRef(null);
  const driverRef    = useRef(null);

  // Effet ripple Material Design au clic
  function handleRipple(e, cardRef) {
    const card   = cardRef.current;
    const layer  = card.querySelector('.ripple-layer');
    const rect   = card.getBoundingClientRect();
    const size   = Math.max(rect.width, rect.height) * 2;
    const x      = e.clientX - rect.left  - size / 2;
    const y      = e.clientY - rect.top   - size / 2;

    const circle = document.createElement('span');
    circle.className = 'ripple-circle';
    circle.style.width  = `${size}px`;
    circle.style.height = `${size}px`;
    circle.style.left   = `${x}px`;
    circle.style.top    = `${y}px`;

    layer.appendChild(circle);
    setTimeout(() => circle.remove(), 500);
  }

  function handleSelect(role, e, ref) {
    handleRipple(e, ref);
    // Petit délai pour que le ripple soit visible avant la transition
    setTimeout(() => onSelect(role), 150);
  }

  // Heure courante HH:MM pour la status bar
  const now = new Date();
  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="android-screen">

      {/* ── Barre de statut ── */}
      <div className="status-bar">
        <span>{time}</span>
        <div className="status-icons">
          <IconWifi />
          <IconBattery />
        </div>
      </div>

      {/* ── Hero bleu ── */}
      <div className="hero-bg">
        <div className="app-header">
          <div className="app-icon">🚌</div>
          <div className="app-title">
            <h1>BusSim</h1>
            <p>Simulateur · Temps Réel</p>
          </div>
        </div>

        <div className="hero-badge">
          <div className="badge-dot" />
          <span>Géolocalisation active · WebSocket</span>
        </div>
      </div>

      {/* ── Cartes de rôle ── */}
      <div className="content-area">
        <p className="section-label">Choisir un rôle</p>

        {/* Voyageur */}
        <button
          ref={passengerRef}
          className="role-card passenger-card"
          onClick={(e) => handleSelect('passenger', e, passengerRef)}
        >
          <div className="ripple-layer" />
          <div className="card-inner">
            <div className="card-top">
              <div className="card-emoji-wrap">🧍</div>
              <div className="card-arrow">→</div>
            </div>

            <p className="card-title">Voyageur</p>

            <ul className="feature-list">
              <li><div className="feat-check">✓</div>Top 10 bus les plus proches</li>
              <li><div className="feat-check">✓</div>Distance en temps réel</li>
              <li><div className="feat-check">✓</div>Votre position sur la carte</li>
            </ul>

            <div className="card-divider" />

            <div className="card-cta">
              <span>Entrer comme Voyageur</span>
              <span className="card-cta-arrow">›</span>
            </div>
          </div>
        </button>

        {/* Chauffeur */}
        <button
          ref={driverRef}
          className="role-card driver-card"
          onClick={(e) => handleSelect('driver', e, driverRef)}
        >
          <div className="ripple-layer" />
          <div className="card-inner">
            <div className="card-top">
              <div className="card-emoji-wrap">🚌</div>
              <div className="card-arrow">→</div>
            </div>

            <p className="card-title">Chauffeur</p>

            <ul className="feature-list">
              <li><div className="feat-check">✓</div>Top 10 voyageurs proches</li>
              <li><div className="feat-check">✓</div>Top 5 bus concurrents</li>
              <li><div className="feat-check">✓</div>Votre position & votre bus</li>
            </ul>

            <div className="card-divider" />

            <div className="card-cta">
              <span>Entrer comme Chauffeur</span>
              <span className="card-cta-arrow">›</span>
            </div>
          </div>
        </button>
      </div>

      {/* ── Chips info bas de page ── */}
      <div className="bottom-bar">
        <div className="bottom-chip">No DB</div>
        <div className="bottom-chip">Pure WebSocket</div>
        <div className="bottom-chip">GPS natif</div>
      </div>

      {/* ── Barre de navigation Android (gesture) ── */}
      <div className="nav-bar">
        <div className="home-indicator" />
      </div>

    </div>
  );
}