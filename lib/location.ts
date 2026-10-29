import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

export type Coords = { lat: number; lng: number };

/** Pide permiso y obtiene la ubicación actual del usuario. */
export function useLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Necesitamos tu ubicación para mostrar skateparks cercanos.');
      return;
    }
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      setError('No pudimos obtener tu ubicación.');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { coords, error, refresh };
}
