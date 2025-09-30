import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface CustomGeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

export const useGeolocation = (options: UseGeolocationOptions = {}) => {
  const [position, setPosition] = useState<CustomGeolocationPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const { toast } = useToast();

  const {
    enableHighAccuracy = true,
    timeout = 30000,
    maximumAge = 5000,
    watch = false,
  } = options;

  const geolocationOptions: PositionOptions = {
    enableHighAccuracy,
    timeout,
    maximumAge,
  };

  const handleSuccess = useCallback((pos: GeolocationPosition) => {
    setPosition({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      speed: pos.coords.speed,
      heading: pos.coords.heading,
      timestamp: pos.timestamp,
    });
    setError(null);
    setLoading(false);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    let errorMessage = 'Unknown geolocation error';
    
    switch (err.code) {
      case err.PERMISSION_DENIED:
        errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
        break;
      case err.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable. Please check your GPS settings.';
        break;
      case err.TIMEOUT:
        errorMessage = 'Location request timed out. Please try again.';
        break;
    }
    
    setError(errorMessage);
    setLoading(false);
    
    toast({
      title: "Location Error",
      description: errorMessage,
      variant: "destructive",
    });
  }, [toast]);

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      const error = 'Geolocation is not supported by this browser.';
      setError(error);
      toast({
        title: "Geolocation Not Supported",
        description: error,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      geolocationOptions
    );
  }, [handleSuccess, handleError, geolocationOptions]);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }

    setLoading(true);
    setError(null);

    const id = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      geolocationOptions
    );

    setWatchId(id);
  }, [handleSuccess, handleError, geolocationOptions, watchId]);

  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setLoading(false);
    }
  }, [watchId]);

  useEffect(() => {
    if (watch) {
      startWatching();
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watch, startWatching, watchId]);

  return {
    position,
    error,
    loading,
    getCurrentPosition,
    startWatching,
    stopWatching,
    isWatching: watchId !== null,
  };
};