import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function makeIcon(emoji, color) {
  return L.divIcon({
    html: `<div style="
      background:${color};
      border-radius:50%;
      width:36px;height:36px;
      display:flex;align-items:center;justify-content:center;
      font-size:18px;
      border:2px solid rgba(255,255,255,0.3);
      box-shadow:0 2px 12px rgba(0,0,0,0.5);
    ">${emoji}</div>`,
    className: '',
    iconSize:  [36, 36],
    iconAnchor:[18, 18],
  });
}

const ICONS = {
  me:         makeIcon('📍', '#00e5ff'),
  bus:        makeIcon('🚌', '#ff6b35'),
  competitor: makeIcon('🚎', '#a78bfa'),
  passenger:  makeIcon('🧍', '#00ff9d'),
};

export default function LiveMap({ center, markers = [], style = {} }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markersRef   = useRef([]);

  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
  }, []);

  // Update center
  useEffect(() => {
    if (!mapRef.current || !center) return;
    mapRef.current.setView([center.lat, center.lon], 15, { animate: true });
  }, [center?.lat, center?.lon]);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    markers.forEach(({ lat, lon, type, label }) => {
      if (lat == null || lon == null) return;
      const icon   = ICONS[type] || ICONS.bus;
      const marker = L.marker([lat, lon], { icon }).addTo(map);
      if (label) marker.bindPopup(`<b>${label}</b>`);
      markersRef.current.push(marker);
    });
  }, [markers]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 300, ...style }} />
  );
}
