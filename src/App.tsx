import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  INITIAL_BUS_STOPS,
  ALL_SINGAPORE_BUS_STOPS,
  RAIL_LINES_STATUS,
  COMMUTER_ADVISORIES,
  createDynamicBusStop,
} from './data/singaporeTransitData';
import { BusStop, BusServiceArrival, RouteStop } from './types/transit';
import { HeaderBar } from './components/HeaderBar';
import { ArrivalCard } from './components/ArrivalCard';
import { BusStopSelector } from './components/BusStopSelector';
import { SchematicRouteMap } from './components/SchematicRouteMap';
import { RailIncidentMatrix } from './components/RailIncidentMatrix';
import { LegendModal } from './components/LegendModal';
import { AlightNotificationModal } from './components/AlightNotificationModal';
import { DatamallApiModal } from './components/DatamallApiModal';
import { SearchModal } from './components/SearchModal';
import { FirstTimeUserBanner } from './components/FirstTimeUserBanner';
import { BottomNavBar, ActiveTab } from './components/BottomNavBar';
import {
  MapPin,
  RefreshCw,
  Search,
  ArrowUpDown,
  Navigation,
  Compass,
  Train,
  Bus,
  Filter,
  Check,
  Sparkles
} from 'lucide-react';

const REFRESH_INTERVAL_SECONDS = 15;

export default function App() {
  const [stops, setStops] = useState<BusStop[]>(ALL_SINGAPORE_BUS_STOPS);
  const [selectedStopCode, setSelectedStopCode] = useState<string>('01012');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'favorites' | 'sea_only' | 'dd_only' | 'wab_only'>('all');
  const [direction, setDirection] = useState<1 | 2>(1);
  const [selectedService, setSelectedService] = useState<BusServiceArrival | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('board');

  const handleSelectStop = useCallback((stop: BusStop) => {
    setStops((prev) => {
      const exists = prev.some((s) => s.code === stop.code);
      if (!exists) {
        return [...prev, stop];
      }
      return prev;
    });
    setSelectedStopCode(stop.code);
    if (stop.services.length > 0) {
      setSelectedService(stop.services[0]);
    }
  }, []);

  // Auto-refresh countdown
  const [refreshCountdown, setRefreshCountdown] = useState<number>(REFRESH_INTERVAL_SECONDS);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Modals & Navigation
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isLegendOpen, setIsLegendOpen] = useState<boolean>(false);
  const [isAlightModalOpen, setIsAlightModalOpen] = useState<boolean>(false);
  const [isDatamallApiOpen, setIsDatamallApiOpen] = useState<boolean>(false);
  const [activeAlightStop, setActiveAlightStop] = useState<RouteStop | null>(null);

  // Favorites in LocalStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sg_transit_favorites');
      return saved ? JSON.parse(saved) : ['190', '147'];
    } catch {
      return ['190', '147'];
    }
  });

  const toggleFavorite = useCallback((serviceNo: string) => {
    setFavorites((prev) => {
      const next = prev.includes(serviceNo)
        ? prev.filter((s) => s !== serviceNo)
        : [...prev, serviceNo];
      try {
        localStorage.setItem('sg_transit_favorites', JSON.stringify(next));
      } catch {
        // LocalStorage fallback
      }
      return next;
    });
  }, []);

  // Current selected stop
  const currentStop = useMemo(() => {
    return stops.find((s) => s.code === selectedStopCode) || stops[0];
  }, [stops, selectedStopCode]);

  // Set default selected service if none
  useEffect(() => {
    if (!selectedService && currentStop.services.length > 0) {
      setSelectedService(currentStop.services[0]);
    }
  }, [currentStop, selectedService]);

  // Real-time second countdown ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          triggerTelemetrySync();
          return REFRESH_INTERVAL_SECONDS;
        }
        return prev - 1;
      });

      // Tick arrival seconds down
      setStops((prevStops) =>
        prevStops.map((stop) => ({
          ...stop,
          services: stop.services.map((svc) => ({
            ...svc,
            nextBuses: svc.nextBuses.map((b) => {
              if (b.etaSeconds <= 5) {
                return { ...b, etaSeconds: Math.max(0, b.etaSeconds - 1) };
              }
              return { ...b, etaSeconds: b.etaSeconds - 1 };
            }) as [typeof svc.nextBuses[0], typeof svc.nextBuses[1], typeof svc.nextBuses[2]],
          })),
        }))
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Telemetry sync action
  const triggerTelemetrySync = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setStops((prevStops) =>
        prevStops.map((stop) => ({
          ...stop,
          services: stop.services.map((svc) => {
            const next1 = svc.nextBuses[0];
            const next2 = svc.nextBuses[1];
            const next3 = svc.nextBuses[2];
            if (next1.etaSeconds <= 0) {
              return {
                ...svc,
                nextBuses: [
                  { ...next2, etaSeconds: Math.max(20, next2.etaSeconds - 15) },
                  { ...next3, etaSeconds: Math.max(120, next3.etaSeconds - 20) },
                  {
                    id: `${svc.serviceNo}-${Date.now()}`,
                    etaSeconds: 900 + Math.floor(Math.random() * 300),
                    occupancy: 'SEA',
                    vehicleType: next1.vehicleType,
                    isWab: true,
                    isLiveGps: true,
                    busPlate: 'SG' + Math.floor(1000 + Math.random() * 8999) + 'X',
                  },
                ],
              };
            }
            return svc;
          }),
        }))
      );
      setIsRefreshing(false);
      setRefreshCountdown(REFRESH_INTERVAL_SECONDS);
    }, 400);
  };

  // Filtered bus services on the active stop
  const filteredServices = useMemo(() => {
    return currentStop.services.filter((svc) => {
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesService = svc.serviceNo.toLowerCase().includes(query);
        const matchesDest = svc.destinationName.toLowerCase().includes(query);
        if (!matchesService && !matchesDest) return false;
      }

      if (activeFilter === 'favorites' && !favorites.includes(svc.serviceNo)) {
        return false;
      }
      if (activeFilter === 'sea_only' && svc.nextBuses[0].occupancy !== 'SEA') {
        return false;
      }
      if (activeFilter === 'dd_only' && svc.nextBuses[0].vehicleType !== 'DD') {
        return false;
      }
      if (activeFilter === 'wab_only' && !svc.nextBuses[0].isWab) {
        return false;
      }

      return true;
    });
  }, [currentStop, searchQuery, activeFilter, favorites]);

  const handleSetAlightAlarm = (stop: RouteStop) => {
    setActiveAlightStop(stop);
    setIsAlightModalOpen(true);
  };

  const handleCancelAlarm = () => {
    setActiveAlightStop(null);
  };

  const handleServiceSelect = (service: BusServiceArrival) => {
    setSelectedService(service);
    // On small screens, if user is in board, switch to route tab for immediate feedback
    if (window.innerWidth < 768) {
      setActiveTab('route');
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 flex flex-col font-sans selection:bg-zinc-200 selection:text-zinc-900">
      {/* Sleek Top Navigation */}
      <HeaderBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSearch={() => setIsSearchOpen(true)}
        onRefresh={triggerTelemetrySync}
        isRefreshing={isRefreshing}
        refreshCountdown={refreshCountdown}
        onOpenLegend={() => setIsLegendOpen(true)}
        onOpenDatamallApi={() => setIsDatamallApiOpen(true)}
        activeAlightAlarmStop={activeAlightStop?.stopCode || null}
        onOpenAlightModal={() => setIsAlightModalOpen(true)}
        currentStopName={currentStop.name}
        currentStopCode={currentStop.code}
      />

      {/* Main Content Area (with bottom padding for mobile tab bar) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-5 pb-20 md:pb-6">
        {/* First-Time User Onboarding Banner */}
        <FirstTimeUserBanner onLearnMore={() => setIsLegendOpen(true)} />

        {/* Tab View: Live Board (Default) */}
        {activeTab === 'board' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left 7 Columns: Active Station Hero + Arrival Feed */}
            <div className="lg:col-span-7 space-y-3.5">
              {/* Station Hero Card */}
              <div className="bg-white border border-zinc-200/90 rounded-xl p-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                        {currentStop.code}
                      </span>
                      <h1 className="text-base sm:text-lg font-bold text-zinc-950 truncate tracking-tight">
                        {currentStop.name}
                      </h1>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                      <span>{currentStop.road}</span>
                      <span>·</span>
                      <span>{filteredServices.length} Bus lines active</span>
                    </p>
                  </div>

                  {/* Direction Switch & Change Stop */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDirection((d) => (d === 1 ? 2 : 1))}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors"
                      title="Switch direction"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{direction === 1 ? 'Inbound' : 'Outbound'}</span>
                    </button>

                    <button
                      onClick={() => setIsSearchOpen(true)}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors shadow-2xs"
                    >
                      Switch Stop
                    </button>
                  </div>
                </div>

                {/* Filter Bar */}
                <div className="mt-3 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1 bg-zinc-100/80 p-0.5 rounded-lg">
                    <button
                      onClick={() => setActiveFilter('all')}
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                        activeFilter === 'all'
                          ? 'bg-white text-zinc-950 font-semibold shadow-2xs'
                          : 'text-zinc-500 hover:text-zinc-900'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setActiveFilter('favorites')}
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                        activeFilter === 'favorites'
                          ? 'bg-white text-zinc-950 font-semibold shadow-2xs'
                          : 'text-zinc-500 hover:text-zinc-900'
                      }`}
                    >
                      Pinned ({favorites.length})
                    </button>
                    <button
                      onClick={() => setActiveFilter('sea_only')}
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                        activeFilter === 'sea_only'
                          ? 'bg-white text-zinc-950 font-semibold shadow-2xs'
                          : 'text-zinc-500 hover:text-zinc-900'
                      }`}
                    >
                      Seats Available
                    </button>
                    <button
                      onClick={() => setActiveFilter('dd_only')}
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                        activeFilter === 'dd_only'
                          ? 'bg-white text-zinc-950 font-semibold shadow-2xs'
                          : 'text-zinc-500 hover:text-zinc-900'
                      }`}
                    >
                      Double Deck
                    </button>
                  </div>

                  {/* Telemetry Indicator */}
                  <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    <span>Live Telemetry</span>
                  </div>
                </div>
              </div>

              {/* Arrival Cards List */}
              <div className="space-y-2">
                {filteredServices.length === 0 ? (
                  <div className="py-12 text-center rounded-xl border border-dashed border-zinc-200 bg-white p-6">
                    <Bus className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-zinc-800">No services match this filter</p>
                    <p className="text-xs text-zinc-400 mt-1">Try resetting the filter chips above.</p>
                    <button
                      onClick={() => setActiveFilter('all')}
                      className="mt-3 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 text-white"
                    >
                      Show All Buses
                    </button>
                  </div>
                ) : (
                  filteredServices.map((svc) => (
                    <ArrivalCard
                      key={svc.serviceNo}
                      service={svc}
                      isFavorite={favorites.includes(svc.serviceNo)}
                      onToggleFavorite={toggleFavorite}
                      isSelected={selectedService?.serviceNo === svc.serviceNo}
                      onSelect={handleServiceSelect}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Right 5 Columns (Desktop): Selected Service Route Progression */}
            <div className="hidden lg:block lg:col-span-5 h-[620px] sticky top-16">
              <SchematicRouteMap
                selectedService={selectedService}
                currentStopCode={currentStop.code}
                onSetAlightAlarm={handleSetAlightAlarm}
                activeAlightAlarmStop={activeAlightStop?.stopCode || null}
              />
            </div>
          </div>
        )}

        {/* Tab View: Nearby Stops */}
        {activeTab === 'stops' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-5 shadow-2xs">
              <div className="border-b border-zinc-100 pb-3 mb-4">
                <h2 className="text-base font-bold text-zinc-950">
                  Nearby Bus Stops & Interchanges
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Select any transit station to view its live bus countdown board.
                </p>
              </div>

              <BusStopSelector
                stops={INITIAL_BUS_STOPS}
                allStops={stops}
                selectedStop={currentStop}
                onSelectStop={(stop) => {
                  handleSelectStop(stop);
                  setActiveTab('board');
                }}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                favoritesCount={favorites.length}
                direction={direction}
                onDirectionToggle={() => setDirection((d) => (d === 1 ? 2 : 1))}
                onOpenSearchAll={() => setIsSearchOpen(true)}
              />
            </div>
          </div>
        )}

        {/* Tab View: Route Progression */}
        {activeTab === 'route' && (
          <div className="max-w-2xl mx-auto h-[680px]">
            <SchematicRouteMap
              selectedService={selectedService}
              currentStopCode={currentStop.code}
              onSetAlightAlarm={handleSetAlightAlarm}
              activeAlightAlarmStop={activeAlightStop?.stopCode || null}
            />
          </div>
        )}

        {/* Tab View: MRT & Alerts */}
        {activeTab === 'mrt' && (
          <div className="max-w-2xl mx-auto">
            <RailIncidentMatrix
              railLines={RAIL_LINES_STATUS}
              advisories={COMMUTER_ADVISORIES}
            />
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Thumb Reach) */}
      <BottomNavBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        serviceCount={filteredServices.length}
        hasIncidentAlert={RAIL_LINES_STATUS.some((l) => l.status !== 'Normal')}
      />

      {/* Quick Search Command Palette */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        stops={stops}
        onSelectStop={(stop) => {
          handleSelectStop(stop);
          setActiveTab('board');
        }}
        onSelectService={(service) => {
          setSelectedService(service);
          setActiveTab('board');
        }}
      />

      {/* Telemetry Standards & Guide Modal */}
      <LegendModal
        isOpen={isLegendOpen}
        onClose={() => setIsLegendOpen(false)}
      />

      {/* Alight Alarm Notification Modal */}
      <AlightNotificationModal
        isOpen={isAlightModalOpen}
        onClose={() => setIsAlightModalOpen(false)}
        activeStop={activeAlightStop}
        onCancelAlarm={handleCancelAlarm}
      />

      {/* LTA Datamall Serverless Connection Modal */}
      <DatamallApiModal
        isOpen={isDatamallApiOpen}
        onClose={() => setIsDatamallApiOpen(false)}
      />
    </div>
  );
}
