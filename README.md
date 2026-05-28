# 🚌 BusSim — Simulateur de Transport en Temps Réel

Un simulateur de transport urbain **sans base de données**, entièrement en mémoire, avec WebSocket temps réel.

---

## Architecture

```
bus-simulator/
├── server/              # Node.js + Express + Socket.IO
│   ├── index.js         # Logique principale (state in-memory, géo, sockets)
│   └── package.json
├── client/              # React + Vite + Leaflet
│   ├── src/
│   │   ├── App.jsx                        # Machine d'état principale
│   │   ├── pages/
│   │   │   ├── RoleSelect.jsx             # Choix voyageur / chauffeur
│   │   │   ├── PassengerDashboard.jsx     # Interface voyageur
│   │   │   └── DriverDashboard.jsx        # Interface chauffeur
│   │   └── components/
│   │       ├── JoinForm.jsx               # Formulaire d'entrée
│   │       └── LiveMap.jsx                # Carte Leaflet live
│   └── package.json
└── package.json         # Scripts racine
```

---

## Stratégie Technique (Sans DB)

### State In-Memory (Server)
```
state = {
  passengers: Map<socketId, PassengerData>,
  drivers:    Map<socketId, DriverData>,
  buses:      Map<busId,    BusData>,
}
```

### Algorithme de Proximité
- **Haversine formula** : distance exacte sur sphère terrestre (km)
- Tri instantané par distance croissante
- Mise à jour push sur chaque mouvement

### Événements WebSocket
| Événement            | Direction        | Déclencheur                         |
|---------------------|------------------|-------------------------------------|
| `passenger:join`    | client → server  | Voyageur rejoint                    |
| `passenger:move`    | client → server  | Voyageur bouge                      |
| `passenger:update`  | server → client  | Push: 10 bus les plus proches       |
| `driver:join`       | client → server  | Chauffeur rejoint                   |
| `driver:move`       | client → server  | Bus bouge                           |
| `driver:update`     | server → client  | Push: 10 voyageurs + 5 concurrents  |
| `ping:refresh`      | client → server  | Keep-alive / refresh manuel         |

---

## Interface Voyageur 🧍

- 📍 **Position GPS actuelle** affichée sur carte interactive
- 🚌 **Top 10 bus les plus proches** avec distance (mètres/km)
- 📊 Barre de distance visuelle pour chaque bus
- ⚡ Mise à jour en temps réel via WebSocket

## Interface Chauffeur 🚌

- 📍 **Position GPS actuelle** + position du bus
- 🧍 **Top 10 voyageurs les plus proches** (clients potentiels)
- 🚎 **Top 5 bus concurrents** les plus proches
- 📊 Distances et occupations en temps réel
- 🗺️ Carte avec tous les acteurs affichés

---

## Installation & Démarrage

### Option 1 : Manuel (recommandé)

```bash
# Terminal 1 — Serveur
cd server
npm install
npm run dev
# → http://localhost:4000

# Terminal 2 — Client
cd client
npm install
npm run dev
# → http://localhost:3000
```

### Option 2 : Script global

```bash
# Depuis la racine
npm run install:concurrent   # installe tout + concurrently
npm start                    # lance les deux en parallèle
```

---

## Test Multi-Utilisateurs

Pour simuler plusieurs utilisateurs :
1. Ouvrez `http://localhost:3000` dans plusieurs onglets/navigateurs
2. Connectez certains comme **Voyageur**, d'autres comme **Chauffeur**
3. Les positions GPS seront légèrement aléatoires si la géolocalisation est refusée
4. Chaque dashboard se met à jour en temps réel

## Debug

```bash
# Stats temps réel
curl http://localhost:4000/api/stats

# Liste de tous les bus
curl http://localhost:4000/api/buses
```

---

## Notes

- **Aucune DB** : tout est en mémoire RAM, données perdues au redémarrage
- **Géolocalisation** : utilise l'API native du navigateur, fallback Antananarivo si refusée
- **Scalabilité** : pour du multi-serveur, il faudrait un Redis pub/sub — pas nécessaire ici
