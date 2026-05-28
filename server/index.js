import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

// ─── IN-MEMORY STATE ───────────────────────────────────────────────────────────
const state = {
  passengers: new Map(), // socketId -> PassengerData
  drivers:    new Map(), // socketId -> DriverData
  buses:      new Map(), // busId    -> BusData (managed by drivers)
};

// ─── GEO UTILS ────────────────────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function enrichWithDistance(items, refLat, refLon) {
  return items
    .map(item => ({
      ...item,
      distance: haversine(refLat, refLon, item.lat, item.lon),
    }))
    .sort((a, b) => a.distance - b.distance);
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(2)} km`;
}

// ─── BROADCAST HELPERS ────────────────────────────────────────────────────────

// Send updated view to a single passenger
function pushToPassenger(socketId) {
  const p = state.passengers.get(socketId);
  if (!p) return;

  const buses = [...state.buses.values()];
  const nearbyBuses = enrichWithDistance(buses, p.lat, p.lon)
    .slice(0, 10)
    .map(b => ({ ...b, distanceLabel: formatDistance(b.distance) }));

  io.to(socketId).emit('passenger:update', {
    position: { lat: p.lat, lon: p.lon },
    nearbyBuses,
  });
}

// Send updated view to a single driver
function pushToDriver(socketId) {
  const d = state.drivers.get(socketId);
  if (!d) return;

  const passengers = [...state.passengers.values()];
  const nearbyPassengers = enrichWithDistance(passengers, d.lat, d.lon)
    .slice(0, 10)
    .map(p => ({ ...p, distanceLabel: formatDistance(p.distance) }));

  // Competitor buses = all buses except this driver's own bus
  const competitorBuses = [...state.buses.values()].filter(b => b.driverId !== socketId);
  const nearbyCompetitors = enrichWithDistance(competitorBuses, d.lat, d.lon)
    .slice(0, 5)
    .map(b => ({ ...b, distanceLabel: formatDistance(b.distance) }));

  io.to(socketId).emit('driver:update', {
    position: { lat: d.lat, lon: d.lon },
    bus: state.buses.get(d.busId) || null,
    nearbyPassengers,
    nearbyCompetitors,
  });
}

// Broadcast to everyone who is watching this area
function broadcastAll() {
  for (const socketId of state.passengers.keys()) pushToPassenger(socketId);
  for (const socketId of state.drivers.keys())    pushToDriver(socketId);
}

// ─── SOCKET EVENTS ────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] connected: ${socket.id}`);

  // ── Passenger joins ──────────────────────────────────────────────────────
  socket.on('passenger:join', ({ name, lat, lon }) => {
    state.passengers.set(socket.id, {
      id: socket.id,
      name: name || `Voyageur-${socket.id.slice(0, 4)}`,
      lat, lon,
      joinedAt: Date.now(),
    });
    console.log(`[P] ${name} joined at (${lat}, ${lon})`);
    pushToPassenger(socket.id);
    // Notify drivers of new passenger
    for (const driverId of state.drivers.keys()) pushToDriver(driverId);
  });

  // ── Passenger updates position ───────────────────────────────────────────
  socket.on('passenger:move', ({ lat, lon }) => {
    const p = state.passengers.get(socket.id);
    if (!p) return;
    p.lat = lat; p.lon = lon;
    pushToPassenger(socket.id);
    for (const driverId of state.drivers.keys()) pushToDriver(driverId);
  });

  // ── Driver joins ─────────────────────────────────────────────────────────
  socket.on('driver:join', ({ name, lat, lon, busName, busCapacity }) => {
    const busId = uuidv4();
    state.buses.set(busId, {
      id: busId,
      driverId: socket.id,
      name: busName || `Bus-${socket.id.slice(0, 4)}`,
      capacity: busCapacity || 30,
      lat, lon,
      speed: 0,
      heading: 0,
      passengers: 0,
    });
    state.drivers.set(socket.id, {
      id: socket.id,
      name: name || `Chauffeur-${socket.id.slice(0, 4)}`,
      lat, lon,
      busId,
      joinedAt: Date.now(),
    });
    console.log(`[D] ${name} joined with bus ${busName}`);
    pushToDriver(socket.id);
    // Notify passengers of new bus
    for (const passId of state.passengers.keys()) pushToPassenger(passId);
  });

  // ── Driver updates position ──────────────────────────────────────────────
  socket.on('driver:move', ({ lat, lon, speed, heading, passengerCount }) => {
    const d = state.drivers.get(socket.id);
    if (!d) return;
    d.lat = lat; d.lon = lon;

    const bus = state.buses.get(d.busId);
    if (bus) {
      bus.lat = lat; bus.lon = lon;
      if (speed !== undefined)         bus.speed = speed;
      if (heading !== undefined)       bus.heading = heading;
      if (passengerCount !== undefined) bus.passengers = passengerCount;
    }

    pushToDriver(socket.id);
    for (const passId of state.passengers.keys()) pushToPassenger(passId);
  });

  // ── Ping (keep-alive + refresh) ───────────────────────────────────────────
  socket.on('ping:refresh', () => {
    if (state.passengers.has(socket.id)) pushToPassenger(socket.id);
    if (state.drivers.has(socket.id))    pushToDriver(socket.id);
  });

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    if (state.passengers.has(socket.id)) {
      state.passengers.delete(socket.id);
      for (const driverId of state.drivers.keys()) pushToDriver(driverId);
    }
    if (state.drivers.has(socket.id)) {
      const d = state.drivers.get(socket.id);
      if (d) state.buses.delete(d.busId);
      state.drivers.delete(socket.id);
      for (const passId of state.passengers.keys()) pushToPassenger(passId);
    }
    console.log(`[-] disconnected: ${socket.id}`);
  });
});

// ─── REST ENDPOINTS (debug / stats) ──────────────────────────────────────────
app.get('/api/stats', (_, res) => {
  res.json({
    passengers: state.passengers.size,
    drivers: state.drivers.size,
    buses: state.buses.size,
  });
});

app.get('/api/buses', (_, res) => {
  res.json([...state.buses.values()]);
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`🚌 Bus Simulator server on http://localhost:${PORT}`));
