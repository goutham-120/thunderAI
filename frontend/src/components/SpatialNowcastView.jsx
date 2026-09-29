import React from 'react';
import WeatherMap from './WeatherMap';
import { Layers, ChevronDown, Radio, Zap, Satellite, Wind, ShieldAlert, CloudRain, Thermometer, Activity } from 'lucide-react';

export default function SpatialNowcastView({
  forecastData,
  selectedCell,
  onSelectCell,
  activeLayers,
  toggleLayer,
  horizonMin,
  setHorizonMin,
  selectedLocation,
  onLocationSelect,
  selectedRegion,
  setSelectedRegion,
  selectedArea,
  onAreaPointSelect,
  onAreaBoxSelect,
  onClearArea
}) {
  const layerButtons = [
    { key: 'radar', label: 'Radar dBZ', icon: Radio, activeColor: 'bg-[#DC2626] text-white border-[#DC2626]' },
    { key: 'satellite', label: 'Satellite IR', icon: Satellite, activeColor: 'bg-[#4F46E5] text-white border-[#4F46E5]' },
    { key: 'lightning', label: 'Lightning Feed', icon: Zap, activeColor: 'bg-[#D97706] text-white border-[#D97706]' },
    { key: 'aiRisk', label: 'Storm Risk Index', icon: Activity, activeColor: 'bg-[#0284C7] text-white border-[#0284C7]' },
    { key: 'lightningRisk', label: 'Lightning Risk', icon: ShieldAlert, activeColor: 'bg-[#EA580C] text-white border-[#EA580C]' },
    { key: 'rainfall', label: 'Rainfall Isohyets', icon: CloudRain, activeColor: 'bg-[#0284C7] text-white border-[#0284C7]' },
    { key: 'cloudTop', label: 'Cloud Top Temp', icon: Thermometer, activeColor: 'bg-[#7C3AED] text-white border-[#7C3AED]' },
    { key: 'wind', label: 'Wind Vectors', icon: Wind, activeColor: 'bg-[#0D9488] text-white border-[#0D9488]' }
  ];

  return (
    <div className="space-y-4 font-sans text-[#12324E]">
      {/* Top Header & Layer Bar */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-lg shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[#12324E] tracking-tight flex items-center gap-2 font-sora">
              <Layers className="w-4 h-4 text-[#0284C7]" />
              SPATIAL ATMOSPHERIC NOWCAST
            </h2>
            <p className="text-xs text-[#5E82A6] font-sans">
              Multimodal Sensor Layers & Spatiotemporal Radar/Satellite Overlays
            </p>
          </div>

          {/* Region Dropdown Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold text-[#5E82A6] uppercase">Sector:</span>
            <div className="relative font-mono">
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="bg-[#EEF6FB] border border-[#D0E3F0] text-[#12324E] text-xs rounded-md px-3 py-1.5 appearance-none focus:outline-hidden focus:border-[#0284C7] font-mono font-semibold pr-8 max-w-[220px]"
              >
                <optgroup label="Popular States & Regions">
                  <option value="Telangana">Telangana</option>
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Odisha">Odisha</option>
                  <option value="West Bengal">West Bengal</option>
                  <option value="Chhattisgarh">Chhattisgarh</option>
                  <option value="Delhi">Delhi (NCT)</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                </optgroup>
                <optgroup label="States">
                  {['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </optgroup>
                <optgroup label="Union Territories">
                  {['Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'].map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </optgroup>
                <optgroup label="Radar Composites">
                  <option value="All India Composite">All India Composite</option>
                  <option value="Andhra Pradesh & Telangana">Andhra Pradesh & Telangana</option>
                  <option value="East Coast (Odisha & WB)">East Coast (Odisha & WB)</option>
                  <option value="South Interior Karnataka">South Interior Karnataka</option>
                </optgroup>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#5E82A6] absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Dynamic Layer Toggles Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#D0E3F0] text-xs font-sans">
          <span className="text-[10px] text-[#5E82A6] uppercase font-bold mr-1 font-mono">Active Layers:</span>
          {layerButtons.map(layer => {
            const Icon = layer.icon;
            const isActive = activeLayers[layer.key];
            return (
              <button
                key={layer.key}
                onClick={() => toggleLayer(layer.key)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                  isActive
                    ? layer.activeColor
                    : 'bg-[#EEF6FB] text-[#5E82A6] border-[#D0E3F0] hover:bg-[#E5F0F7] hover:text-[#12324E]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{layer.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Large Weather Map View */}
      <div className="h-[620px] w-full">
        <WeatherMap
          forecastData={forecastData}
          selectedCell={selectedCell}
          onSelectCell={onSelectCell}
          activeLayers={activeLayers}
          toggleLayer={toggleLayer}
          horizonMin={horizonMin}
          selectedLocation={selectedLocation}
          onLocationSelect={onLocationSelect}
          selectedRegion={selectedRegion}
          selectedArea={selectedArea}
          onAreaPointSelect={onAreaPointSelect}
          onAreaBoxSelect={onAreaBoxSelect}
          onClearArea={onClearArea}
        />
      </div>
    </div>
  );
}
