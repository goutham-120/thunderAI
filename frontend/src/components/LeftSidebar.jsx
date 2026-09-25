import React from 'react';
import { 
  Radio, 
  Satellite, 
  Zap, 
  CloudRain, 
  Wind, 
  Thermometer, 
  Layers, 
  Search, 
  ChevronDown, 
  Settings,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

export default function LeftSidebar({
  activeLayers,
  toggleLayer,
  horizonMin,
  setHorizonMin,
  selectedRegion,
  setSelectedRegion,
  searchQuery,
  setSearchQuery
}) {
  const horizons = [15, 30, 45, 60, 90, 120, 180];

  const layerItems = [
    { key: 'radar', label: 'Radar Reflectivity', icon: Radio, defaultActive: true, hasSettings: true },
    { key: 'satellite', label: 'Satellite (IR)', icon: Satellite, defaultActive: true, hasSettings: true },
    { key: 'lightning', label: 'Lightning (Live)', icon: Zap, defaultActive: true, hasSettings: true },
    { key: 'aiRisk', label: 'Thunderstorm Risk', icon: Sparkles, defaultActive: true, hasSettings: true },
    { key: 'lightningRisk', label: 'Lightning Risk', icon: Zap, defaultActive: false },
    { key: 'rainfall', label: 'Rainfall Forecast', icon: CloudRain, defaultActive: false },
    { key: 'wind', label: 'Wind (NWP)', icon: Wind, defaultActive: false },
    { key: 'cloudTop', label: 'Cloud Top Temp', icon: Thermometer, defaultActive: false },
    { key: 'cape', label: 'CAPE (Model)', icon: Layers, defaultActive: false },
    { key: 'adminBoundaries', label: 'Administrative Boundaries', icon: Layers, defaultActive: true }
  ];

  return (
    <div className="bg-[#0B101D] p-3.5 rounded-2xl border border-slate-800 shadow-xl flex flex-col space-y-4 text-slate-200 text-xs">
      {/* 1. LAYERS Section */}
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            LAYERS
          </span>
          <Settings className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 cursor-pointer" />
        </div>

        <div className="space-y-1.5">
          {layerItems.map(item => {
            const Icon = item.icon;
            const isChecked = activeLayers[item.key] ?? item.defaultActive;

            return (
              <div 
                key={item.key}
                onClick={() => toggleLayer(item.key)}
                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800/60 cursor-pointer transition-all"
              >
                <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <Icon className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[11px] font-medium text-slate-300">
                    {item.label}
                  </span>
                </label>

                {item.hasSettings && (
                  <Settings className="w-3 h-3 text-slate-600 hover:text-slate-400 transition-colors" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. FORECAST HORIZON */}
      <div>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
          FORECAST HORIZON
        </span>
        <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
          {horizons.map(h => {
            const isSelected = horizonMin === h;
            return (
              <button
                key={h}
                onClick={() => setHorizonMin(h)}
                className={`py-1.5 px-2 rounded-lg font-bold transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)] border border-blue-400/40'
                    : 'bg-slate-900/90 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {h} min
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. REGION */}
      <div>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
          REGION
        </span>
        <div className="relative">
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 appearance-none focus:outline-hidden focus:border-blue-500 font-medium"
          >
            <option value="Andhra Pradesh & Telangana">Andhra Pradesh & Telangana</option>
            <option value="East Coast (Odisha & WB)">East Coast (Odisha & WB)</option>
            <option value="South Interior Karnataka">South Interior Karnataka</option>
            <option value="All India Composite">All India Composite</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* 4. SEARCH LOCATION */}
      <div>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
          SEARCH LOCATION
        </span>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search city / district ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-hidden focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
