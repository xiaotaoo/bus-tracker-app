import React, { useState } from 'react';
import { BusServiceArrival, RouteStop } from '../types/transit';
import { getRouteStopsForService } from '../data/singaporeTransitData';
import { Bus, Bell, ArrowRight, Search } from 'lucide-react';

interface SchematicRouteMapProps {
  selectedService: BusServiceArrival | null;
  currentStopCode: string;
  onSetAlightAlarm: (stop: RouteStop) => void;
  activeAlightAlarmStop: string | null;
}

export const SchematicRouteMap: React.FC<SchematicRouteMapProps> = ({
  selectedService,
  currentStopCode,
  onSetAlightAlarm,
  activeAlightAlarmStop,
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  const serviceNo = selectedService?.serviceNo || '190';
  const destination = selectedService?.destinationName || 'Kampong Bahru Ter';
  const origin = selectedService?.originName || 'Choa Chu Kang Int';
  const baseStops = getRouteStopsForService(serviceNo, currentStopCode);

  const filteredStops = baseStops.filter(
    (s) =>
      s.stopName.toLowerCase().includes(filterQuery.toLowerCase()) ||
      s.stopCode.includes(filterQuery) ||
      s.roadName.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const currentStopIndex = baseStops.findIndex((s) => s.stopCode === currentStopCode);
  const currentStopObj = baseStops[currentStopIndex !== -1 ? currentStopIndex : 17];

  const calculateFare = (targetStop: RouteStop): string => {
    const dist = Math.abs(targetStop.distanceKm - (currentStopObj?.distanceKm || 0));
    if (dist <= 3.2) return '$1.09';
    if (dist <= 6.2) return '$1.33';
    if (dist <= 10.2) return '$1.59';
    if (dist <= 15.2) return '$1.86';
    if (dist <= 20.2) return '$2.08';
    return '$2.24';
  };

  return (
    <div className="flex flex-col h-full bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-2xs">
      {/* Route Header */}
      <div className="p-4 border-b border-zinc-200/80 bg-zinc-50/60">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-2xl font-bold text-zinc-950 tracking-tight">
                Bus {serviceNo}
              </span>
              <span className="text-xs text-zinc-500 font-medium">
                {selectedService?.category || 'Trunk'} · {selectedService?.operator || 'SMRT'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-zinc-600 mt-1">
              <span>{origin}</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
              <span className="font-semibold text-zinc-900">{destination}</span>
            </div>
          </div>

          <div className="text-right text-xs">
            <span className="text-zinc-400 block text-[11px]">Headway</span>
            <span className="font-semibold text-zinc-800">
              {selectedService?.frequencyRange || '4–7 min'}
            </span>
          </div>
        </div>

        {/* Live Active Fleet Banner */}
        <div className="mt-3 flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-zinc-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            <span className="font-medium text-zinc-800 text-[11px]">
              2 Buses Live on Route
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-500">
            <span>SG5940X (34 km/h)</span>
            <span>·</span>
            <span>SMB5011L (28 km/h)</span>
          </div>
        </div>

        {/* Search stops along this route */}
        <div className="mt-3 relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search stops along this service..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900"
          />
        </div>
      </div>

      {/* Schematic List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="relative border-l-2 border-zinc-200 ml-3 pl-4 space-y-3">
          {filteredStops.map((stop) => {
            const isUserCurrentStop = stop.stopCode === currentStopCode;
            const hasBusHere = stop.currentBuses && stop.currentBuses.length > 0;
            const isAlightActive = activeAlightAlarmStop === stop.stopCode;
            const fareEst = calculateFare(stop);

            return (
              <div
                key={stop.stopCode}
                className={`relative p-3 rounded-lg border transition-all ${
                  isUserCurrentStop
                    ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900 shadow-2xs'
                    : isAlightActive
                    ? 'border-amber-400 bg-amber-50/60'
                    : 'border-zinc-200/80 bg-white hover:border-zinc-300'
                }`}
              >
                {/* Node dot on vertical line */}
                <div
                  className={`absolute -left-[23px] top-4 w-3 h-3 rounded-full border-2 transition-transform ${
                    isUserCurrentStop
                      ? 'bg-zinc-950 border-white ring-2 ring-zinc-950 scale-125'
                      : hasBusHere
                      ? 'bg-emerald-600 border-white ring-2 ring-emerald-600 animate-pulse'
                      : 'bg-white border-zinc-400'
                  }`}
                />

                {/* If bus approaching or here */}
                {hasBusHere && (
                  <div className="mb-2 p-2 rounded-md bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bus className="w-3.5 h-3.5 text-emerald-800" />
                      <span className="font-mono font-bold text-emerald-900 text-[11px]">
                        {stop.currentBuses![0].plate}
                      </span>
                      <span className="text-[10px] text-emerald-700">
                        {stop.currentBuses![0].deck === 'DD' ? 'Double Deck' : 'Single Deck'}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-emerald-800">
                      {stop.currentBuses![0].speedKmh} km/h
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] text-zinc-400">
                        #{stop.seq}
                      </span>
                      <span className="font-mono text-xs font-semibold text-zinc-700">
                        {stop.stopCode}
                      </span>
                      <h4 className="font-semibold text-xs text-zinc-900 truncate">
                        {stop.stopName}
                      </h4>
                      {isUserCurrentStop && (
                        <span className="text-[10px] font-semibold text-zinc-900 bg-zinc-200 px-1.5 py-0.2 rounded">
                          Current Stop
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      {stop.roadName} · {stop.distanceKm.toFixed(1)} km · Est. Fare: {fareEst}
                    </div>

                    {stop.mrtTransfer && (
                      <div className="mt-1 text-[10px] text-zinc-500 flex items-center gap-1">
                        <span>MRT Transfer:</span>
                        <span className="font-semibold text-zinc-800">{stop.mrtTransfer}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onSetAlightAlarm(stop)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      isAlightActive
                        ? 'bg-amber-600 text-white'
                        : 'border border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                    }`}
                    title="Notify me before reaching this stop"
                  >
                    <Bell className={`w-3 h-3 ${isAlightActive ? 'fill-white' : ''}`} />
                    <span>{isAlightActive ? 'Alarm Set' : 'Alight'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
