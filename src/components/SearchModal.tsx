import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  MapPin,
  Bus,
  X,
  ArrowRight,
  Sparkles,
  Compass,
  Clock,
  Layers,
  Building2,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import {
  BusStop,
  BusServiceArrival,
  TransitRegion,
  SingaporeServiceDirectoryItem,
} from '../types/transit';
import {
  ALL_SINGAPORE_BUS_STOPS,
  SINGAPORE_SERVICES_DIRECTORY,
  createDynamicBusStop,
} from '../data/singaporeTransitData';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  stops: BusStop[];
  onSelectStop: (stop: BusStop) => void;
  onSelectService?: (service: BusServiceArrival) => void;
}

type SearchTab = 'all' | 'stops' | 'services' | 'regions';

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  stops,
  onSelectStop,
  onSelectService,
}) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [selectedRegion, setSelectedRegion] = useState<TransitRegion | 'ALL'>('ALL');
  const [selectedServiceDetail, setSelectedServiceDetail] = useState<SingaporeServiceDirectoryItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Combine parent provided stops with all known Singapore stops without duplicates
  const allKnownStops = useMemo(() => {
    const map = new Map<string, BusStop>();
    ALL_SINGAPORE_BUS_STOPS.forEach((s) => map.set(s.code, s));
    stops.forEach((s) => map.set(s.code, s));
    return Array.from(map.values());
  }, [stops]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSelectedServiceDetail(null);
      setSelectedRegion('ALL');
      setActiveTab('all');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const normalizedQuery = query.trim().toLowerCase();
  const isFiveDigitCode = /^\d{5}$/.test(normalizedQuery);

  // Matched bus stops across all of Singapore
  const matchedStops = allKnownStops.filter((s) => {
    if (selectedRegion !== 'ALL' && s.region !== selectedRegion) {
      return false;
    }
    if (!normalizedQuery) return true;
    return (
      s.code.includes(normalizedQuery) ||
      s.name.toLowerCase().includes(normalizedQuery) ||
      s.road.toLowerCase().includes(normalizedQuery) ||
      (s.mrtConnections && s.mrtConnections.some((m) => m.name.toLowerCase().includes(normalizedQuery) || m.code.toLowerCase().includes(normalizedQuery)))
    );
  });

  // Matched bus services across all of Singapore
  const matchedServices = SINGAPORE_SERVICES_DIRECTORY.filter((svc) => {
    if (!normalizedQuery) return true;
    return (
      svc.serviceNo.toLowerCase().includes(normalizedQuery) ||
      svc.destinationName.toLowerCase().includes(normalizedQuery) ||
      svc.originName.toLowerCase().includes(normalizedQuery) ||
      svc.operator.toLowerCase().includes(normalizedQuery) ||
      svc.category.toLowerCase().includes(normalizedQuery)
    );
  });

  // Check if query is 5-digit code that is not yet loaded in list
  const exactStopFound = allKnownStops.find((s) => s.code === normalizedQuery);
  const showDynamicStopPrompt = isFiveDigitCode && !exactStopFound;

  const handleSelectDynamicStop = (code: string) => {
    const dynamicStop = createDynamicBusStop(code);
    onSelectStop(dynamicStop);
    onClose();
  };

  const handleServiceClick = (svcItem: SingaporeServiceDirectoryItem) => {
    setSelectedServiceDetail(svcItem);
  };

  const handleTrackServiceAtStop = (stopCode: string, serviceNo: string) => {
    let targetStop = allKnownStops.find((s) => s.code === stopCode);
    if (!targetStop) {
      targetStop = createDynamicBusStop(stopCode);
    }
    onSelectStop(targetStop);

    if (onSelectService) {
      const existingService = targetStop.services.find((s) => s.serviceNo === serviceNo);
      if (existingService) {
        onSelectService(existingService);
      } else {
        // Build fallback arrival
        const fallbackArrival: BusServiceArrival = {
          serviceNo,
          operator: 'SBST',
          destinationCode: '03223',
          destinationName: selectedServiceDetail?.destinationName || 'City Center',
          originName: selectedServiceDetail?.originName || 'Origin Interchange',
          direction: 1,
          category: selectedServiceDetail?.category || 'Trunk',
          firstBusTime: '05:30',
          lastBusTime: '23:45',
          frequencyRange: selectedServiceDetail?.frequencyRange || '6-10 mins',
          nextBuses: [
            {
              id: `${serviceNo}-${stopCode}-1`,
              etaSeconds: 85,
              occupancy: 'SEA',
              vehicleType: 'DD',
              isWab: true,
              isLiveGps: true,
              busPlate: 'SG' + Math.floor(2000 + Math.random() * 7000) + 'X',
              speedKmh: 30,
            },
            {
              id: `${serviceNo}-${stopCode}-2`,
              etaSeconds: 380,
              occupancy: 'SDA',
              vehicleType: 'DD',
              isWab: true,
              isLiveGps: true,
              busPlate: 'SMB' + Math.floor(3000 + Math.random() * 6000) + 'L',
              speedKmh: 28,
            },
            {
              id: `${serviceNo}-${stopCode}-3`,
              etaSeconds: 820,
              occupancy: 'SEA',
              vehicleType: 'SD',
              isWab: true,
              isLiveGps: false,
              busPlate: 'SBS' + Math.floor(5000 + Math.random() * 4000) + 'P',
              speedKmh: 0,
            },
          ],
        };
        onSelectService(fallbackArrival);
      }
    }

    onClose();
  };

  const regionsList: TransitRegion[] = ['Central', 'East', 'North', 'North-East', 'West'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-14 p-3 sm:p-4 bg-zinc-950/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white shadow-2xl text-zinc-900 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-200 bg-zinc-50/50">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all Singapore stops (e.g. 01012, Orchard, Tampines) or services (190, 65, 147)..."
            className="w-full text-xs sm:text-sm bg-transparent placeholder:text-zinc-400 text-zinc-900 focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="text-zinc-400 hover:text-zinc-700 p-1 rounded-md hover:bg-zinc-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-zinc-500 bg-zinc-100 rounded-md border border-zinc-200">
              ESC
            </kbd>
          )}
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 bg-white text-xs gap-2 overflow-x-auto">
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                setActiveTab('all');
                setSelectedServiceDetail(null);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-zinc-900 text-white shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              All Singapore
            </button>
            <button
              onClick={() => {
                setActiveTab('stops');
                setSelectedServiceDetail(null);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'stops'
                  ? 'bg-zinc-900 text-white shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Bus Stops</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-200/80 text-zinc-800">
                {matchedStops.length}
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab('services');
                setSelectedServiceDetail(null);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'services'
                  ? 'bg-zinc-900 text-white shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <Bus className="w-3.5 h-3.5" />
              <span>Bus Services</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-200/80 text-zinc-800">
                {matchedServices.length}
              </span>
            </button>
          </div>

          {/* Region Filter Chips */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-zinc-400 uppercase font-semibold hidden md:inline mr-1">
              Region:
            </span>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value as TransitRegion | 'ALL')}
              className="text-xs bg-zinc-100 border border-zinc-200 rounded-lg px-2 py-1 text-zinc-700 font-medium focus:outline-none focus:ring-1 focus:ring-zinc-400"
            >
              <option value="ALL">All Regions</option>
              {regionsList.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic 5-digit prompt banner if user types unknown 5-digit code */}
        {showDynamicStopPrompt && (
          <div className="p-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <p className="font-semibold text-amber-950">
                  Search & Track Singapore Bus Stop #{normalizedQuery}
                </p>
                <p className="text-[11px] text-amber-800">
                  Connect live LTA Datamall telemetry or view simulated arrivals for stop #{normalizedQuery}.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleSelectDynamicStop(normalizedQuery)}
              className="px-3 py-1.5 rounded-lg bg-amber-900 hover:bg-amber-800 text-white font-medium text-xs shrink-0 shadow-2xs transition-colors"
            >
              Track Stop #{normalizedQuery}
            </button>
          </div>
        )}

        {/* Main Body Results Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Service Detail Drawer (if service clicked) */}
          {selectedServiceDetail && (
            <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 space-y-3 animate-in fade-in duration-100">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xl font-extrabold text-zinc-950">
                      Bus {selectedServiceDetail.serviceNo}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded border border-zinc-200 bg-white text-zinc-700">
                      {selectedServiceDetail.category} · {selectedServiceDetail.operator}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 mt-1 flex items-center gap-1.5 font-medium">
                    <span>{selectedServiceDetail.originName}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{selectedServiceDetail.destinationName}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedServiceDetail(null)}
                  className="text-zinc-400 hover:text-zinc-700 p-1 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-white border border-zinc-200/80">
                  <span className="text-[10px] text-zinc-400 font-medium block">Headway Frequency</span>
                  <span className="font-semibold text-zinc-800">{selectedServiceDetail.frequencyRange}</span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-zinc-200/80">
                  <span className="text-[10px] text-zinc-400 font-medium block">Operating Hours</span>
                  <span className="font-semibold text-zinc-800">{selectedServiceDetail.operatingHours}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-wide block mb-1.5">
                  Select a station served by Bus {selectedServiceDetail.serviceNo}:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedServiceDetail.primaryStops.map((stopCode) => {
                    const st = allKnownStops.find((s) => s.code === stopCode);
                    const label = st ? st.name.split('/')[0].trim() : `Stop ${stopCode}`;
                    return (
                      <button
                        key={stopCode}
                        onClick={() => handleTrackServiceAtStop(stopCode, selectedServiceDetail.serviceNo)}
                        className="px-2.5 py-1 text-xs rounded-md bg-white border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-100 text-zinc-800 transition-colors flex items-center gap-1.5 shadow-2xs font-medium"
                      >
                        <span className="font-mono text-[10px] text-zinc-400 font-bold">{stopCode}</span>
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Quick Hub Suggestions if query is empty and no service selected */}
          {!query && !selectedServiceDetail && (
            <div className="space-y-3">
              {/* Regional Transit Hubs */}
              <div className="p-3.5 border border-zinc-200 rounded-xl bg-zinc-50/70">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                    Major Singapore Transit Hubs & Interchanges
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {allKnownStops.length} stops indexed
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {allKnownStops.slice(0, 14).map((stop) => (
                    <button
                      key={stop.code}
                      onClick={() => {
                        onSelectStop(stop);
                        onClose();
                      }}
                      className="px-2.5 py-1 text-xs rounded-lg bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-800 hover:bg-zinc-100/70 transition-all flex items-center gap-1.5 shadow-2xs font-medium"
                    >
                      <span className="font-mono text-[10px] text-zinc-400 font-bold">{stop.code}</span>
                      <span>{stop.name.split('/')[0].trim()}</span>
                      {stop.region && (
                        <span className="text-[9px] text-zinc-400 bg-zinc-100 px-1 py-0.2 rounded">
                          {stop.region}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Major Bus Services Grid */}
              <div className="p-3.5 border border-zinc-200 rounded-xl bg-zinc-50/70">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide block mb-2">
                  Frequently Tracked Singapore Bus Services
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SINGAPORE_SERVICES_DIRECTORY.slice(0, 9).map((svc) => (
                    <div
                      key={svc.serviceNo}
                      onClick={() => handleServiceClick(svc)}
                      className="p-2.5 rounded-lg bg-white border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/80 cursor-pointer transition-colors shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-zinc-950">
                          {svc.serviceNo}
                        </span>
                        <span className="text-[10px] font-medium text-zinc-400">
                          {svc.operator}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                        {svc.destinationName}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bus Services Result Section */}
          {(activeTab === 'all' || activeTab === 'services') && matchedServices.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Bus Services ({matchedServices.length})
                </span>
                <span className="text-[10px] text-zinc-400">Tap to inspect route & served stops</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {matchedServices.map((svc) => (
                  <div
                    key={svc.serviceNo}
                    onClick={() => handleServiceClick(svc)}
                    className="p-2.5 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/80 cursor-pointer transition-all flex items-center justify-between group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center font-mono text-xs font-bold text-zinc-900 shrink-0 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                        {svc.serviceNo}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-900 truncate">
                          {svc.originName} ➔ {svc.destinationName}
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate">
                          {svc.category} · {svc.operator} · Every {svc.frequencyRange}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 shrink-0 ml-1.5" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bus Stops Result Section */}
          {(activeTab === 'all' || activeTab === 'stops') && matchedStops.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Bus Stops & Interchanges ({matchedStops.length})
                </span>
                <span className="text-[10px] text-zinc-400">Tap to open live arrival board</span>
              </div>
              <div className="space-y-1.5">
                {matchedStops.map((stop) => (
                  <div
                    key={stop.code}
                    onClick={() => {
                      onSelectStop(stop);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200/80 bg-white hover:border-zinc-300 hover:bg-zinc-50/80 cursor-pointer transition-all group shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 shrink-0 font-mono text-xs font-bold group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                        {stop.code}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-900 truncate flex items-center gap-2">
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

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {stop.mrtConnections && stop.mrtConnections.length > 0 && (
                        <div className="hidden sm:flex gap-1">
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
                      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {matchedStops.length === 0 && matchedServices.length === 0 && !showDynamicStopPrompt && (
            <div className="text-center py-12 px-4 space-y-2">
              <MapPin className="w-8 h-8 text-zinc-300 mx-auto" />
              <h4 className="text-sm font-semibold text-zinc-700">
                No transit stops or services match &ldquo;{query}&rdquo;
              </h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Tip: Enter any Singapore 5-digit bus stop code (e.g. 01012, 17009), a road name, or a bus service number (e.g. 190, 65).
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between text-[11px] text-zinc-500">
          <span>Singapore Land Transport Authority (LTA) Network</span>
          <span>Coverage: All Regions (Central, East, North, North-East, West)</span>
        </div>
      </div>
    </div>
  );
};
