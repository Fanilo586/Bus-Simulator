import { useEffect, useState, useCallback } from 'react';

export function useGeoLocation() {
  const [position, setPosition] = useState(null);
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(true);

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Géolocalisation non supportée');
      setLoading(false);
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLoading(false);
        setError(null);
      },
      (err) => {
        // Fallback: Antananarivo center for demo
        console.warn('Geo error, using fallback:', err.message);
        setPosition({ lat: -18.9137 + (Math.random() - 0.5) * 0.05, lon: 47.5361 + (Math.random() - 0.5) * 0.05 });
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  useEffect(() => { request(); }, [request]);

  return { position, error, loading, refresh: request };
}
