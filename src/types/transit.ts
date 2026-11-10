export type OccupancyStatus = 'SEA' | 'SDA' | 'LSD'; // Seats Available, Standing Available, Limited Standing
export type VehicleType = 'SD' | 'DD' | 'BD'; // Single Deck, Double Deck, Bendy
export type TransitOperator = 'SBST' | 'SMRT' | 'TowerTransit' | 'GoAhead';

export interface BusArrival {
  id: string;
  etaSeconds: number; // seconds from now
  occupancy: OccupancyStatus;
  vehicleType: VehicleType;
  isWab: boolean; // Wheelchair Accessible
  isLiveGps: boolean;
  busPlate: string;
  distanceMeters?: number;
  speedKmh?: number;
}

export interface BusServiceArrival {
  serviceNo: string;
  operator: TransitOperator;
  destinationCode: string;
  destinationName: string;
  originName: string;
  direction: 1 | 2;
  category: 'Trunk' | 'Express' | 'Feeder' | 'NightRider';
  nextBuses: [BusArrival, BusArrival, BusArrival];
  loopDescription?: string;
  firstBusTime: string;
  lastBusTime: string;
  frequencyRange: string;
}

export type TransitRegion = 'Central' | 'East' | 'North' | 'North-East' | 'West';

export interface BusStop {
  code: string; // 5-digit code e.g. "01012"
  name: string; // e.g. "Victoria St / Bugis Stn Exit A"
  road: string; // e.g. "Victoria St"
  lat: number;
  lng: number;
  distanceMeters?: number;
  region?: TransitRegion;
  isInterchange?: boolean;
  mrtConnections?: { code: string; color: string; name: string }[];
  services: BusServiceArrival[];
}

export interface SingaporeServiceDirectoryItem {
  serviceNo: string;
  operator: TransitOperator;
  category: 'Trunk' | 'Express' | 'Feeder' | 'NightRider';
  originName: string;
  destinationName: string;
  frequencyRange: string;
  operatingHours: string;
  primaryStops: string[]; // stop codes served
}

export interface RouteStop {
  stopCode: string;
  stopName: string;
  roadName: string;
  seq: number;
  distanceKm: number;
  fareStage: number;
  mrtTransfer?: string;
  currentBuses?: {
    plate: string;
    deck: VehicleType;
    occupancy: OccupancyStatus;
    speedKmh: number;
  }[];
}

export interface RailLineStatus {
  code: string;
  name: string;
  status: 'Normal' | 'Minor Headway' | 'Delayed' | 'Disrupted';
  headway: string;
  message?: string;
  accentColor: string;
  bgBadge: string;
}

export interface CommuterAdvisory {
  id: string;
  serviceNo?: string;
  type: 'Crowd' | 'Diversion' | 'Weather' | 'General';
  title: string;
  description: string;
  timestamp: string;
  urgency: 'low' | 'medium' | 'high';
}
