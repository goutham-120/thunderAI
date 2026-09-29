import React from 'react';
import { 
  Clock, 
  Layers, 
  Radio, 
  Activity, 
  ShieldAlert, 
  CloudRain, 
  Globe 
} from 'lucide-react';

const SUPPORTED_HORIZONS = [15, 30, 45, 60, 90, 120, 180];

export default function SpatialControlSidebar({
  horizonMin,
  setHorizonMin,
  activeLayers,
  toggleLayer,
  baseMapStyle,
  setBaseMapStyle,
  isLoading
}) {
  // 4 Primary Weather Layers required by user prompt
  const coreLayers = [
    {
      key: 'aiRisk',
      label: 'Thunderstorm Probability',
      icon: Activity,
      activeColor: 'bg-[#0284C7] text-white border-[#0284C7]'
    },
    {
      key: 'lightningRisk',
      label: 'Lightning Probability',
      icon: ShieldAlert,
      activeColor: 'bg-[#EA580C] text-white border-[#EA580C]'
    },
    {
      key: 'rainfall',
      label: 'Rainfall Rate',
      icon: CloudRain,
      activeColor: 'bg-[#0284C7] text-white border-[#0284C7]'
    },
    {
      key: 'radar',
      label: 'Radar Reflectivity',
      icon: Radio,
      activeColor: 'bg-[#DC2626] text-white border-[#DC2626]'
    }
  ];

  return (
    <aside className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl shadow-xs space-y-4 font-sans text-[#12324E] flex flex-col justify-between h-full min-w-0">
      
      <div className="space-y-4">
        
        {/* 1. Forecast Horizon Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#0F2942] uppercase flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#0284C7]" /> Forecast Horizon
            </span>
            <span className="text-[10px] font-mono text-[#0284C7] font-bold bg-[#EEF6FB] px-2 py-0.5 rounded border border-[#D0E3F0]">
              +{horizonMin} min
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {SUPPORTED_HORIZONS.map((h) => {
              const isSelected = horizonMin === h;
              return (
                <button
                  key={h}
                  onClick={() => setHorizonMin(h)}
                  disabled={isLoading}
                  className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold border transition-all text-center cursor-pointer ${
                    isSelected
                      ? 'bg-[#0284C7] text-white border-[#0284C7] shadow-2xs scale-[1.02]'
                      : 'bg-[#EEF6FB] text-[#47637E] border-[#D0E3F0] hover:bg-[#E5F0F7] hover:text-[#0F2942]'
                  } disabled:opacity-50`}
                >
                  +{h}m
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Four Weather Layer Controls */}
        <div className="space-y-2 pt-3 border-t border-[#D0E3F0]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#0F2942] uppercase flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#0284C7]" /> Weather Overlays
            </span>
            <span className="text-[10px] font-mono text-[#47637E]">Controls</span>
          </div>

          <div className="space-y-2">
            {coreLayers.map((layer) => {
              const Icon = layer.icon;
              const isActive = activeLayers[layer.key];

              return (
                <button
                  key={layer.key}
                  onClick={() => toggleLayer(layer.key)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
                    isActive
                      ? `${layer.activeColor} shadow-2xs font-semibold`
                      : 'bg-[#EEF6FB] text-[#47637E] border-[#D0E3F0] hover:bg-[#E5F0F7] hover:text-[#0F2942]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#0284C7]'}`} />
                    <span className="font-sans font-medium truncate">{layer.label}</span>
                  </div>

                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${
                    isActive ? 'bg-white/20 text-white border-transparent' : 'bg-[#EEF6FB] text-[#47637E] border-[#D0E3F0]'
                  }`}>
                    {isActive ? 'ON' : 'OFF'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Basemap View Selector */}
        <div className="space-y-2 pt-3 border-t border-[#D0E3F0]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#0F2942] uppercase flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-[#0284C7]" /> Basemap Style
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {[
              { key: 'map', label: 'Street Map' },
              { key: 'satellite', label: 'Satellite' },
              { key: 'terrain', label: 'Terrain' }
            ].map((style) => (
              <button
                key={style.key}
                onClick={() => setBaseMapStyle(style.key)}
                className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold border transition-all text-center cursor-pointer ${
                  baseMapStyle === style.key
                    ? 'bg-[#0284C7] text-white border-[#0284C7] shadow-2xs'
                    : 'bg-[#EEF6FB] text-[#47637E] border-[#D0E3F0] hover:bg-[#E5F0F7] hover:text-[#0F2942]'
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

      </div>

    </aside>
  );
}
