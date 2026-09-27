import React, { useState, useEffect } from 'react';
import { Database, Clock, Activity, MapPin, ChevronDown } from 'lucide-react';

export default function Header({ 
  activeTab,
  onOpenProvenance,
  selectedRegion,
  setSelectedRegion,
  selectedLocation
}) {
  const [utcTime, setUtcTime] = useState('');
  const [dataMode, setDataMode] = useState('SYNTHETIC DEMO');

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
    fetch('http://localhost:8000/api/health')
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

  const regions = [
    'Andhra Pradesh & Telangana',
    'East Coast (Odisha & WB)',
    'South Interior Karnataka',
    'All India Composite'
  ];

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

        {/* Region & Location Selector Dropdown */}
        {setSelectedRegion && (
          <div className="relative flex items-center bg-[#EEF6FB] border border-[#D0E3F0] rounded-lg px-2.5 py-1 text-xs">
            <MapPin className="w-3.5 h-3.5 text-[#DC2626] mr-1.5 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[9px] font-mono text-[#47637E] font-bold uppercase leading-none">Radar Region / Station</span>
              <select
                value={selectedRegion || 'Andhra Pradesh & Telangana'}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="bg-transparent text-[#0F2942] font-bold font-sans text-xs focus:outline-none cursor-pointer pr-4"
              >
                {regions.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#47637E] pointer-events-none absolute right-2" />
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


