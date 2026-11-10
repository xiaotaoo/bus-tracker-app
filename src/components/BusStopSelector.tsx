import React, { useState, useMemo } from 'react';
import { BusStop, TransitRegion } from '../types/transit';
import { Search, MapPin, X, ArrowUpDown, Globe, Navigation, Sparkles } from 'lucide-react';
import { createDynamicBusStop } from '../data/singaporeTransitData';

interface BusStopSelectorProps {
  stops: BusStop[];
  allStops?: BusStop[];
  selectedStop: BusStop;
  onSelectStop: (stop: BusStop) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: 'all' | 'favorites' | 'sea_only' | 'dd_only' | 'wab_only';
  onFilterChange: (filter: 'all' | 'favorites' | 'sea_only' | 'dd_only' | 'wab_only') => void;
  favoritesCount: number;
  direction: 1 | 2;
  onDirectionToggle: () => void;
  onOpenSearchAll?: () => void;
}

type StationScope = 'nearby' | 'all';

export const BusStopSelector: React.FC<BusStopSelectorProps> = ({
  stops,
  allStops,
  selectedStop,
  onSelectStop,
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  favoritesCount,
  direction,
  onDirectionToggle,
  onOpenSearchAll,
}) => {
  const [stationScope, setStationScope] = useState<StationScope>('all');
  const [selectedRegion, setSelectedRegion] = useState<TransitRegion | 'ALL'>('ALL');

  // Master stop pool based on scope
  const availableStops = useMemo(() => {
    const pool = stationScope === 'all' && allStops && allStops.length > 0 ? allStops : stops;
    const map = new Map<string, BusStop>();
    pool.forEach((s) => map.set(s.code, s));
    // Ensure selected stop is always available
    if (selectedStop) map.set(selectedStop.code, selectedStop);
    return Array.from(map.values());
  }, [stationScope, stops, allStops, selectedStop]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const isFiveDigitCode = /^\d{5}$/.test(normalizedQuery);

  const filteredStops = useMemo(() => {
    return availableStops.filter((stop) => {
      // Region filter
      if (selectedRegion !== 'ALL' && stop.region && stop.region !== selectedRegion) {
        return false;
      }

      // Text / query search
      if (normalizedQuery) {
        const matchesCode = stop.code.includes(normalizedQuery);
        const matchesName = stop.name.toLowerCase().includes(normalizedQuery);
        const matchesRoad = stop.road.toLowerCase().includes(normalizedQuery);
        const matchesService = stop.services.some((s) => s.serviceNo.toLowerCase().includes(normalizedQuery));
        const matchesMrt = stop.mrtConnections?.some((m) => m.name.toLowerCase().includes(normalizedQuery) || m.code.toLowerCase().includes(normalizedQuery));

        if (!matchesCode && !matchesName && !matchesRoad && !matchesService && !matchesMrt) {
          return false;
        }
      }

      return true;
    });
  }, [availableStops, selectedRegion, normalizedQuery]);

  const exactStopFound = availableStops.find((s) => s.code === normalizedQuery);
  const showDynamicPrompt = isFiveDigitCode && !exactStopFound;

  const handleTrackDynamicStop = (code: string) => {
    const dynamicStop = createDynamicBusStop(code);
    onSelectStop(dynamicStop);
    onSearchChange('');
  };

  const regions: TransitRegion[] = ['Central', 'East', 'North', 'North-East', 'West'];

  return (
    <div className="space-y-3.5">
      {/* Scope Switcher: Nearby vs All Singapore */}
      <div className="flex items-center justify-between gap-2 p-1 bg-zinc-100 rounded-xl">
        <button
          onClick={() => setStationScope('nearby')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
            stationScope === 'nearby'
              ? 'bg-white text-zinc-900 shadow-2xs'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Nearby Transit ({stops.length})</span>
        </button>
        <button
          onClick={() => setStationScope('all')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
            stationScope === 'all'
              ? 'bg-white text-zinc-900 shadow-2xs'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>All Singapore ({allStops ? allStops.length : availableStops.length})</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search all stops (01012, Tampines, Orchard), roads, or services..."
          className="w-full pl-9 pr-9 py-2 text-xs bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Region Filter Chips if in All Singapore mode */}
      {stationScope === 'all' && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px]">
          <span className="text-zinc-400 font-semibold uppercase text-[10px] shrink-0 mr-0.5">
            Region:
          </span>
          <button
            onClick={() => setSelectedRegion('ALL')}
            className={`px-2.5 py-1 rounded-md shrink-0 font-medium transition-colors ${
              selectedRegion === 'ALL'
                ? 'bg-zinc-900 text-white shadow-2xs'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            All
          </button>
          {regions.map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRegion(r)}
              className={`px-2.5 py-1 rounded-md shrink-0 font-medium transition-colors ${
                selectedRegion === r
                  ? 'bg-zinc-900 text-white shadow-2xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {/* Direction & Live Board Filters */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Direction Switcher */}
        <button
          onClick={onDirectionToggle}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition-colors"
          title="Toggle inbound / outbound direction"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
          <span>{direction === 1 ? 'Direction 1 · Inbound' : 'Direction 2 · Outbound'}</span>
        </button>

        {/* Filter Segmented Control */}
        <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg">
          <button
            onClick={() => onFilterChange('all')}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              activeFilter === 'all'
                ? 'bg-white text-zinc-900 font-semibold shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => onFilterChange('favorites')}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              activeFilter === 'favorites'
                ? 'bg-white text-zinc-900 font-semibold shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Pinned {favoritesCount > 0 ? `(${favoritesCount})` : ''}
          </button>
          <button
            onClick={() => onFilterChange('sea_only')}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              activeFilter === 'sea_only'
                ? 'bg-white text-zinc-900 font-semibold shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Seats Only
          </button>
          <button
            onClick={() => onFilterChange('dd_only')}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              activeFilter === 'dd_only'
                ? 'bg-white text-zinc-900 font-semibold shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Double Deck
          </button>
        </div>
      </div>

      {/* 5-digit Dynamic Stop Prompt */}
      {showDynamicPrompt && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold text-amber-950">
                Track Bus Stop #{normalizedQuery}
              </p>
              <p className="text-[11px] text-amber-800">
                Instantly load live LTA Datamall arrivals for this 5-digit stop.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleTrackDynamicStop(normalizedQuery)}
            className="px-3 py-1.5 rounded-lg bg-amber-900 hover:bg-amber-800 text-white font-medium text-xs shrink-0 shadow-2xs transition-colors"
          >
            Track #{normalizedQuery}
          </button>
        </div>
      )}

      {/* Transit Stations List */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-zinc-400 font-medium px-1">
          <span>
            {stationScope === 'all' ? 'All Singapore Transit Stations' : 'Nearby Stations'} ({filteredStops.length})
          </span>
          <span className="text-[11px]">Tap to view arrivals</span>
        </div>

        <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-0.5">
          {filteredStops.map((stop) => {
            const isSelected = selectedStop.code === stop.code;
            return (
              <div
                key={stop.code}
                onClick={() => onSelectStop(stop)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectStop(stop)}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900 shadow-2xs'
                    : 'border-zinc-200/80 bg-white hover:border-zinc-300 hover:bg-zinc-50/50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-xs font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
                    {stop.code}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-900 truncate flex items-center gap-1.5">
                      <span>{stop.name}</span>
                      {stop.region && (
                        <span className="text-[9px] font-semibold text-zinc-500 bg-zinc-100 px-1.5 py-0.2 rounded border border-zinc-200">
                          {stop.region}
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                      {stop.road} · {stop.services.length} bus lines active
                    </p>
                  </div>
                </div>

                {/* MRT Transfers */}
                {stop.mrtConnections && stop.mrtConnections.length > 0 && (
                  <div className="flex gap-1 shrink-0 ml-2">
                    {stop.mrtConnections.map((m) => (
                      <span
                        key={m.code}
                        className="font-mono text-[9px] font-bold text-white px-1.5 py-0.2 rounded"
                        style={{ backgroundColor: m.color }}
                      >
                        {m.code}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {filteredStops.length === 0 && !showDynamicPrompt && (
            <div className="text-center py-8 text-xs text-zinc-400 space-y-2">
              <p>No transit stations found matching &ldquo;{searchQuery}&rdquo;.</p>
              {onOpenSearchAll && (
                <button
                  onClick={onOpenSearchAll}
                  className="px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800 transition-colors"
                >
                  Search All Singapore Services & Stops
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
