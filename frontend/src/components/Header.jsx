import React, { useState, useEffect, useRef } from 'react';
import { Database, Clock, Activity, MapPin, ChevronDown, Search, X, Check } from 'lucide-react';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

const UNION_TERRITORIES = [
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const RADAR_COMPOSITES = [
  'All India Composite', 'Andhra Pradesh & Telangana', 'East Coast (Odisha & WB)', 'South Interior Karnataka'
];

export default function Header({ 
  activeTab,
  onOpenProvenance,
  selectedRegion,
  setSelectedRegion,
  selectedLocation
}) {
  const [utcTime, setUtcTime] = useState('');
  const [dataMode, setDataMode] = useState('SYNTHETIC DEMO');
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setUtcTime(now.toISOString().substring(11, 19) + ' UTC');
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch('http://localhost:8008/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.dwr_radar_status && data.dwr_radar_status.includes('SYNTHETIC')) {
          setDataMode('SYNTHETIC MODE (SIMULATED)');
        } else if (data.status === 'healthy') {
          setDataMode('LIVE RADAR & SENSOR MODE');
        }
      })
      .catch(() => setDataMode('SYNTHETIC MODE (OFFLINE FALLBACK)'));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pageDescriptions = {
    live: { title: 'Overview', desc: 'Real-time multimodal atmospheric nowcasting dashboard' },
    spatial: { title: 'Spatial Nowcast', desc: 'AI-based thunderstorm and lightning prediction maps' },
    cells: { title: 'Storm Cells', desc: 'TITAN/SCIT segmented convective clusters & velocity vectors' },
    forecast: { title: 'Forecast Matrix', desc: '2-Layer ConvLSTM multi-horizon prediction grid (15–180 min)' },
    alerts: { title: 'Alerts', desc: 'Common Alerting Protocol (CAP) automated severe storm warnings' },
    replay: { title: 'Historical Replay', desc: 'Archive event replay & ground-truth validation' },
    explainability: { title: 'Explainability', desc: 'SHAP feature attribution breakdown & atmospheric drivers' },
    model: { title: 'Model Performance', desc: 'ConvLSTM architecture specs & validation benchmark metrics' },
    datasources: { title: 'Data Sources', desc: 'Multimodal observation feed provenance & sensor quality' }
  };

  const currentMeta = pageDescriptions[activeTab] || pageDescriptions.live;

  const filterList = (list) => list.filter(item => item.toLowerCase().includes(searchQuery.toLowerCase()));

  const filteredStates = filterList(INDIAN_STATES);
  const filteredUTs = filterList(UNION_TERRITORIES);
  const filteredComposites = filterList(RADAR_COMPOSITES);

  return (
    <header className="bg-[#F8FCFE] border-b border-[#D0E3F0] px-5 py-2.5 flex flex-wrap items-center justify-between sticky top-0 z-30 font-sans shadow-2xs gap-2">
      {/* Page Title & Contextual Subtitle */}
      <div className="flex items-center space-x-4">
        <div>
          <h1 className="text-sm font-bold text-[#0F2942] tracking-tight font-mono flex items-center space-x-2">
            <span>{currentMeta.title}</span>
          </h1>
          <p className="text-[11px] text-[#47637E] font-medium tracking-tight">
            {currentMeta.desc}
          </p>
        </div>

        {/* Region & Searchable Location Selector */}
        {setSelectedRegion && (
          <div className="relative font-sans" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center bg-[#EEF6FB] hover:bg-[#E5F0F7] border border-[#D0E3F0] rounded-lg px-3 py-1.5 text-xs transition-colors shadow-2xs"
            >
              <MapPin className="w-3.5 h-3.5 text-[#DC2626] mr-1.5 shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-mono text-[#47637E] font-bold uppercase leading-none">Radar Region / State / UT</span>
                <span className="text-[#0F2942] font-bold text-xs truncate max-w-[180px]">
                  {selectedRegion || 'Andhra Pradesh & Telangana'}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-[#47637E] ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-72 bg-[#F8FCFE] border border-[#D0E3F0] rounded-xl shadow-xl z-50 overflow-hidden flex flex-col text-xs font-sans animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Search Bar Input */}
                <div className="p-2 border-b border-[#E2EAF0] bg-[#EEF6FB] flex items-center space-x-1.5">
                  <Search className="w-3.5 h-3.5 text-[#0284C7] shrink-0 ml-1" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search State or UT (e.g. Telangana, Delhi)..."
                    className="w-full bg-transparent text-[#0F2942] font-medium focus:outline-none placeholder-[#64829E] text-xs py-0.5"
                    autoFocus
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="p-0.5 hover:bg-[#D0E3F0] rounded-full text-[#47637E]">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Dropdown Options List */}
                <div className="max-h-[340px] overflow-y-auto p-1.5 divide-y divide-[#E2EAF0]/60 space-y-1">
                  
                  {/* Operational Radar Composites */}
                  {filteredComposites.length > 0 && (
                    <div className="pb-1">
                      <div className="px-2 py-1 text-[10px] font-mono font-bold text-[#0284C7] uppercase tracking-wider bg-[#EEF6FB] rounded mb-1">
                        Operational Radar Composites
                      </div>
                      {filteredComposites.map(comp => (
                        <button
                          key={comp}
                          onClick={() => {
                            setSelectedRegion(comp);
                            setIsOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                            selectedRegion === comp ? 'bg-[#0284C7] text-white font-bold' : 'text-[#0F2942] hover:bg-[#EEF6FB]'
                          }`}
                        >
                          <span className="truncate">{comp}</span>
                          {selectedRegion === comp && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 28 Indian States */}
                  {filteredStates.length > 0 && (
                    <div className="py-1">
                      <div className="px-2 py-1 text-[10px] font-mono font-bold text-[#47637E] uppercase tracking-wider bg-[#EEF6FB] rounded mb-1 flex items-center justify-between">
                        <span>States ({filteredStates.length})</span>
                      </div>
                      {filteredStates.map(state => (
                        <button
                          key={state}
                          onClick={() => {
                            setSelectedRegion(state);
                            setIsOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                            selectedRegion === state ? 'bg-[#0284C7] text-white font-bold' : 'text-[#0F2942] hover:bg-[#EEF6FB]'
                          }`}
                        >
                          <span className="truncate">{state}</span>
                          {selectedRegion === state && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 8 Union Territories */}
                  {filteredUTs.length > 0 && (
                    <div className="pt-1">
                      <div className="px-2 py-1 text-[10px] font-mono font-bold text-[#D97706] uppercase tracking-wider bg-[#FFFBEB] rounded mb-1 flex items-center justify-between">
                        <span>Union Territories ({filteredUTs.length})</span>
                      </div>
                      {filteredUTs.map(ut => (
                        <button
                          key={ut}
                          onClick={() => {
                            setSelectedRegion(ut);
                            setIsOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                            selectedRegion === ut ? 'bg-[#0284C7] text-white font-bold' : 'text-[#0F2942] hover:bg-[#EEF6FB]'
                          }`}
                        >
                          <span className="truncate">{ut}</span>
                          {selectedRegion === ut && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {filteredStates.length === 0 && filteredUTs.length === 0 && filteredComposites.length === 0 && (
                    <div className="p-4 text-center text-[#47637E] text-xs font-mono">
                      No matching state or UT found for "{searchQuery}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Compact System State & Time */}
      <div className="flex items-center space-x-3">
        {/* Active Location Badge */}
        {selectedLocation && (
          <div className="hidden lg:flex items-center space-x-1.5 text-[11px] font-mono bg-[#FEF2F2] border border-[#FEE2E2] text-[#991B1B] px-2.5 py-1 rounded-md">
            <span className="font-bold">{selectedLocation.name}</span>
            <span className="text-[9px] text-[#DC2626]">({selectedLocation.lat}°, {selectedLocation.lon}°)</span>
          </div>
        )}

        {/* Data Mode Indicator */}
        <div className="hidden md:flex items-center space-x-1.5 text-[10px] font-mono font-bold px-2.5 py-1 rounded-md bg-[#EEF6FB] text-[#0284C7] border border-[#D0E3F0]" title="Current Backend Data Ingestion Mode">
          <Activity className="w-3 h-3 text-[#0284C7]" />
          <span>{dataMode}</span>
        </div>

        {/* Live Indicator */}
        <div className="flex items-center space-x-2 bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] px-2.5 py-1 rounded-full text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse inline-block" />
          <span>SYSTEM ONLINE ●</span>
        </div>

        {/* UTC Clock */}
        <div className="hidden sm:flex items-center space-x-1.5 text-xs text-[#47637E] font-mono bg-[#EEF6FB] px-2.5 py-1 rounded-md border border-[#D0E3F0]">
          <Clock className="w-3.5 h-3.5 text-[#0284C7]" />
          <span>{utcTime}</span>
        </div>

        {/* Data Provenance Log Button */}
        {onOpenProvenance && (
          <button
            onClick={onOpenProvenance}
            className="text-xs font-mono text-[#0F2942] hover:text-[#0284C7] bg-[#EEF6FB] hover:bg-[#E5F0F7] px-2.5 py-1 rounded-md border border-[#D0E3F0] transition-colors flex items-center gap-1.5"
            title="View Multimodal Data Provenance Log"
          >
            <Database className="w-3.5 h-3.5 text-[#0284C7]" />
            <span>Data Log</span>
          </button>
        )}
      </div>
    </header>
  );
}


