import React, { useState } from 'react';
import './JoinForm.css';

export default function JoinForm({ role, onJoin }) {
  const isDriver = role === 'driver';
  const [name,     setName]     = useState('');
  const [busName,  setBusName]  = useState('');
  const [capacity, setCapacity] = useState(30);

  function handleSubmit(e) {
    e.preventDefault();
    onJoin({
      name:     name.trim() || (isDriver ? 'Chauffeur anonyme' : 'Voyageur anonyme'),
      busName:  busName.trim() || 'Bus Express',
      busCapacity: Number(capacity),
    });
  }

  return (
    <div className="join-wrap animate-in">
      <div className="join-card">
        <div className="join-top">
          <span className="join-icon">{isDriver ? '🚌' : '🧍'}</span>
          <h2>{isDriver ? 'Tableau de bord Chauffeur' : 'Interface Voyageur'}</h2>
          <p className="join-sub">Renseignez vos informations pour rejoindre la simulation</p>
        </div>

        <form onSubmit={handleSubmit} className="join-form">
          <label>
            <span>{isDriver ? 'Votre nom' : 'Votre prénom'}</span>
            <input
              type="text"
              placeholder={isDriver ? 'Ex: Jean Dupont' : 'Ex: Marie'}
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </label>

          {isDriver && (
            <>
              <label>
                <span>Nom du bus</span>
                <input
                  type="text"
                  placeholder="Ex: Ligne 12 - Centre"
                  value={busName}
                  onChange={e => setBusName(e.target.value)}
                />
              </label>
              <label>
                <span>Capacité (places)</span>
                <input
                  type="number"
                  min={1} max={200}
                  value={capacity}
                  onChange={e => setCapacity(e.target.value)}
                />
              </label>
            </>
          )}

          <button type="submit" className={`join-btn ${isDriver ? 'driver' : 'passenger'}`}>
            {isDriver ? '🚌 Démarrer en tant que Chauffeur' : '🧍 Rejoindre comme Voyageur'}
          </button>
        </form>

        <p className="join-geo-note mono">
          📍 Votre position GPS sera utilisée automatiquement
        </p>
      </div>
    </div>
  );
}
