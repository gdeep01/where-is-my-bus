export interface Bus {
  id: string;
  bus_number: string;
  route_name: string;
  capacity: number;
  status: 'online' | 'offline';
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  bus_id: string;
  conductor_name: string;
  start_time: string;
  end_time: string | null;
  status: 'active' | 'completed';
  created_at: string;
}

export interface BusLocation {
  id: string;
  bus_id: string;
  trip_id: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  accuracy: number | null;
  timestamp: string;
  created_at: string;
}

export interface BusWithLocation extends Bus {
  latest_location?: BusLocation;
  current_trip?: Trip;
}

export interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    speed: number | null;
  };
  timestamp: number;
}