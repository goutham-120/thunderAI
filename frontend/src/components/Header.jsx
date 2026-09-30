import React, {
  useState,
  useRef,
  useEffect
} from 'react';

import {
  Database,
  Activity,
  MapPin,
  ChevronDown,
  Search,
  X,
  Check,
  RefreshCw,
  Menu
} from 'lucide-react';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal'
];

const UNION_TERRITORIES = [
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry'
];

const RADAR_COMPOSITES = [
  'All India Composite',
  'Andhra Pradesh & Telangana',
  'East Coast (Odisha & WB)',
  'South Interior Karnataka'
];

export default function Header({
  activeTab,
  systemStatus,
  onOpenProvenance,
  selectedRegion,
  setSelectedRegion,
  selectedLocation,
  onRefresh,
  isRefreshing,
  onToggleSidebar,
  isCollapsed
}) {
  const [isOpen, setIsOpen] =
    useState(false);

  const [searchQuery, setSearchQuery] =
    useState('');

  const dropdownRef =
    useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target
        )
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener(
      'mousedown',
      handleClickOutside
    );

    return () =>
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );
  }, []);

  const pageDescriptions = {
    live: {
      title: 'Operational Dashboard',
      desc:
        'Unified meteorological GIS workstation & real-time nowcasting'
    },

    spatial: {
      title: 'Spatial Nowcast',
      desc:
        'Multimodal radar, satellite, and convective risk overlays'
    },

    cells: {
      title: 'Storm Cells',
      desc:
        'Convective storm cell inventory, motion vectors, and trajectories'
    },

    forecast: {
      title: 'Forecast Matrix',
      desc:
        'ConvLSTM multi-lead time predictions (+15m to +180m)'
    },

    alerts: {
      title: 'CAP Alerts',
      desc:
        'Common Alerting Protocol weather advisories & emergency alerts'
    },

    model: {
      title: 'Model Performance',
      desc:
        'ConvLSTM neural network specifications & verification benchmarks'
    },

    reports: {
      title: 'Reports & Model Validation',
      desc:
        'Scientific verification metrics, dataset scope, and performance audit report'
    },

    datasources: {
      title: 'Data Sources',
      desc:
        'Radar, satellite, lightning, and NWP pipeline health & provenance'
    }
  };

  const currentMeta =
    pageDescriptions[activeTab] ||
    pageDescriptions.live;

  const dataMode =
    systemStatus?.data_mode
      ? systemStatus.data_mode.toUpperCase()
      : 'SYNTHETIC';

  const obsTime =
    systemStatus?.timestamps
      ?.observation_time
      ? new Date(
          systemStatus.timestamps.observation_time
        )
          .toUTCString()
          .slice(17, 25) + ' UTC'
      : 'LIVE UTC';

  const filterList = (list) =>
    list.filter((item) =>
      item
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );

  const filteredStates =
    filterList(INDIAN_STATES);

  const filteredUTs =
    filterList(UNION_TERRITORIES);

  const filteredComposites =
    filterList(RADAR_COMPOSITES);

  return (
    <header className="bg-[#F8FCFE] border-b border-[#D0E3F0] px-4 py-2 flex flex-wrap items-center justify-between sticky top-0 z-30 font-sans shadow-2xs gap-2">

      {/* Left: Menu Sidebar Toggle & Primary Sector Selector */}
      <div className="flex items-center space-x-3">

        <button
          onClick={onToggleSidebar}
          aria-label={isCollapsed ? "Open navigation" : "Close navigation"}
          className="p-2 rounded-lg bg-[#EEF6FB] hover:bg-[#E5F0F7] border border-[#D0E3F0] text-[#0B3552] transition-colors flex items-center justify-center shadow-2xs cursor-pointer"
          title={isCollapsed ? "Open navigation" : "Close navigation"}
        >
          {isCollapsed ? (
            <Menu className="w-5 h-5 text-[#0284C7]" />
          ) : (
            <X className="w-5 h-5 text-[#0284C7]" />
          )}
        </button>

        {/* Primary Sector Selector */}
        {setSelectedRegion && (
          <div
            className="relative font-sans"
            ref={dropdownRef}
          >

            <button
              onClick={() =>
                setIsOpen(!isOpen)
              }
              className="flex items-center bg-[#EEF6FB] hover:bg-[#E5F0F7] border border-[#D0E3F0] rounded-md px-2.5 py-1 text-xs transition-colors shadow-2xs"
            >

              <MapPin className="w-3.5 h-3.5 text-[#0284C7] mr-1.5 shrink-0" />

              <div className="flex flex-col text-left">

                <span className="text-[8px] font-mono text-[#5E82A6] font-bold uppercase leading-none">
                  Sector
                </span>

                <span className="text-[#12324E] font-bold text-xs truncate max-w-[150px] font-sans">
                  {selectedRegion ||
                    'Telangana'}
                </span>

              </div>

              <ChevronDown
                className={`w-3.5 h-3.5 text-[#5E82A6] ml-1.5 transition-transform duration-200 ${
                  isOpen
                    ? 'rotate-180'
                    : ''
                }`}
              />

            </button>

            {isOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-72 bg-[#F8FCFE] border border-[#D0E3F0] rounded-lg shadow-xl z-50 overflow-hidden flex flex-col text-xs font-sans">

                {/* Search Input */}
                <div className="p-2 border-b border-[#D0E3F0] bg-[#EEF6FB] flex items-center space-x-1.5">

                  <Search className="w-3.5 h-3.5 text-[#0284C7] shrink-0 ml-1" />

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) =>
                      setSearchQuery(
                        e.target.value
                      )
                    }
                    placeholder="Search sector or composite..."
                    className="w-full bg-transparent text-[#12324E] font-medium focus:outline-none placeholder-[#5E82A6] text-xs py-0.5"
                    autoFocus
                  />

                  {searchQuery && (
                    <button
                      onClick={() =>
                        setSearchQuery('')
                      }
                      className="p-0.5 hover:bg-[#D0E3F0] rounded-full text-[#5E82A6]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}

                </div>

                {/* Dropdown Options */}
                <div className="max-h-[300px] overflow-y-auto p-1.5 divide-y divide-[#D0E3F0]/60 space-y-1">

                  {/* Radar Composites */}
                  {filteredComposites.length >
                    0 && (
                    <div className="pb-1">

                      <div className="px-2 py-1 text-[9px] font-mono font-bold text-[#0284C7] uppercase tracking-wider bg-[#EEF6FB] rounded mb-1">
                        Radar Composites
                      </div>

                      {filteredComposites.map(
                        (comp) => (
                          <button
                            key={comp}
                            onClick={() => {
                              setSelectedRegion(
                                comp
                              );
                              setIsOpen(false);
                            }}
                            className={`w-full text-left px-2 py-1 rounded-md flex items-center justify-between text-xs transition-colors ${
                              selectedRegion ===
                              comp
                                ? 'bg-[#0284C7] text-white font-bold'
                                : 'text-[#12324E] hover:bg-[#EEF6FB]'
                            }`}
                          >

                            <span className="truncate">
                              {comp}
                            </span>

                            {selectedRegion ===
                              comp && (
                              <Check className="w-3.5 h-3.5 shrink-0" />
                            )}

                          </button>
                        )
                      )}
                    </div>
                  )}

                  {/* States */}
                  {filteredStates.length >
                    0 && (
                    <div className="py-1">

                      <div className="px-2 py-1 text-[9px] font-mono font-bold text-[#5E82A6] uppercase tracking-wider bg-[#EEF6FB] rounded mb-1">
                        States (
                        {
                          filteredStates.length
                        }
                        )
                      </div>

                      {filteredStates.map(
                        (state) => (
                          <button
                            key={state}
                            onClick={() => {
                              setSelectedRegion(
                                state
                              );
                              setIsOpen(false);
                            }}
                            className={`w-full text-left px-2 py-1 rounded-md flex items-center justify-between text-xs transition-colors ${
                              selectedRegion ===
                              state
                                ? 'bg-[#0284C7] text-white font-bold'
                                : 'text-[#12324E] hover:bg-[#EEF6FB]'
                            }`}
                          >

                            <span className="truncate">
                              {state}
                            </span>

                            {selectedRegion ===
                              state && (
                              <Check className="w-3.5 h-3.5 shrink-0" />
                            )}

                          </button>
                        )
                      )}
                    </div>
                  )}

                  {/* Union Territories */}
                  {filteredUTs.length >
                    0 && (
                    <div className="pt-1">

                      <div className="px-2 py-1 text-[9px] font-mono font-bold text-[#D97706] uppercase tracking-wider bg-[#FFFBEB] rounded mb-1">
                        Union Territories (
                        {
                          filteredUTs.length
                        }
                        )
                      </div>

                      {filteredUTs.map(
                        (ut) => (
                          <button
                            key={ut}
                            onClick={() => {
                              setSelectedRegion(
                                ut
                              );
                              setIsOpen(false);
                            }}
                            className={`w-full text-left px-2 py-1 rounded-md flex items-center justify-between text-xs transition-colors ${
                              selectedRegion ===
                              ut
                                ? 'bg-[#0284C7] text-white font-bold'
                                : 'text-[#12324E] hover:bg-[#EEF6FB]'
                            }`}
                          >

                            <span className="truncate">
                              {ut}
                            </span>

                            {selectedRegion ===
                              ut && (
                              <Check className="w-3.5 h-3.5 shrink-0" />
                            )}

                          </button>
                        )
                      )}
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2.5">

        {/* Active Location Coordinates */}
        {selectedLocation && (
          <div className="hidden lg:flex items-center space-x-1.5 text-[11px] font-mono bg-[#EEF6FB] border border-[#D0E3F0] text-[#12324E] px-2.5 py-1 rounded-md">

            <span className="font-bold">
              {selectedLocation.name}
            </span>

            <span className="text-[10px] text-[#5E82A6]">
              ({selectedLocation.lat}°,{' '}
              {selectedLocation.lon}°)
            </span>

          </div>
        )}

        {/* Operating Mode */}
        <div
          className={`flex items-center space-x-1.5 text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border ${
            dataMode === 'REAL'
              ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
              : 'bg-[#FFFBEB] text-[#D97706] border-[#FEF3C7]'
          }`}
          title="Backend Ingestion Operating Mode"
        >

          <Activity className="w-3 h-3" />

          <span>
            MODE: {dataMode}
          </span>

        </div>

        {/* Data Freshness */}
        <div className="hidden sm:flex items-center space-x-1 text-xs text-[#5E82A6] font-mono bg-[#EEF6FB] px-2.5 py-1 rounded-md border border-[#D0E3F0]">

          <span className="text-[10px] text-[#5E82A6]">
            OBS:
          </span>

          <span className="font-semibold text-[#12324E]">
            {obsTime}
          </span>

        </div>

        {/* Refresh */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="text-xs font-mono text-[#12324E] hover:text-[#0284C7] bg-[#EEF6FB] hover:bg-[#E5F0F7] px-2.5 py-1 rounded-md border border-[#D0E3F0] transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="Fetch Fresh Telemetry"
          >

            <RefreshCw
              className={`w-3.5 h-3.5 text-[#0284C7] ${
                isRefreshing
                  ? 'animate-spin'
                  : ''
              }`}
            />

            <span className="hidden md:inline font-sans font-medium">
              Refresh
            </span>

          </button>
        )}

        {/* Data Provenance */}
        {onOpenProvenance && (
          <button
            onClick={
              onOpenProvenance
            }
            className="text-xs font-mono text-[#12324E] hover:text-[#0284C7] bg-[#EEF6FB] hover:bg-[#E5F0F7] px-2.5 py-1 rounded-md border border-[#D0E3F0] transition-colors flex items-center gap-1.5"
            title="View Data Provenance Matrix"
          >

            <Database className="w-3.5 h-3.5 text-[#0284C7]" />

            <span className="hidden md:inline font-sans font-medium">
              Data Log
            </span>

          </button>
        )}

      </div>
    </header>
  );
}