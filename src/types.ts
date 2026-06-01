export type LivestockType = 'goat' | 'horse' | 'cow';
export type HealthStatus = 'excellent' | 'good' | 'fair' | 'poor';

export interface Livestock {
  id: string;
  name: string;
  type: LivestockType;
  lat: number;
  lng: number;
  alt: number;
  health: HealthStatus;
  battery: number;
  lastUpdate: string;
  heartRate: number[];
  speed: number;
  heartRateSensor: {
    currentRate: number;
    lastReadingTime: string;
  };
  temperatureSensor?: {
    currentTemp: number; // in Celsius, e.g., 38.7
    lastReadingTime: string;
  };
  loraQuality?: {
    rssi: number; // e.g. -96
    snr: number; // e.g. 7.5
    spreadingFactor: number; // e.g. 7, 8, 9, 10, 11, 12
    frequency: number; // e.g. 921.5 (MHz)
    gatewayName: string; // e.g. "Gateway Tambora Alpha"
    packetLossRate: number; // e.g. 1.2 (%)
  };
}

export interface Geofence {
  id: string;
  center: { lat: number; lng: number };
  radius: number; // in meters
}
