import React from 'react';
import { Info, AlertCircle } from 'lucide-react';

export default function SpatialMapLegend({ activeLayers, channelProvenance = {} }) {
  const legends = [
    {
      key: 'aiRisk',
      title: 'Thunderstorm Probability (%)',
      unit: '%',
      range: '0% - 100%',
      stops: ['0%', '25%', '50%', '75%', '100%'],
      gradient: 'bg-gradient-to-r from-sky-200 via-yellow-400 via-orange-500 to-red-600',
      isActive: activeLayers.aiRisk,
      isAvailable: true
    },
    {
      key: 'lightningRisk',
      title: 'Lightning Probability (%)',
      unit: '%',
      range: '0% - 100%',
      stops: ['10%', '35%', '60%', '85%', '100%'],
      gradient: 'bg-gradient-to-r from-purple-200 via-amber-400 via-orange-500 to-red-600',
      isActive: activeLayers.lightningRisk,
      isAvailable: true
    },
    {
      key: 'rainfall',
      title: 'Rainfall Rate (mm/hr)',
      unit: 'mm/hr',
      range: '0 - 100 mm/hr',
      stops: ['0.5', '10', '25', '50', '100+'],
      gradient: 'bg-gradient-to-r from-cyan-200 via-blue-500 via-emerald-500 via-purple-600 to-pink-600',
      isActive: activeLayers.rainfall,
      isAvailable: true
    },
    {
      key: 'radar',
      title: 'Radar Reflectivity (dBZ)',
      unit: 'dBZ',
      range: '0 - 70 dBZ',
      stops: ['15 (Light)', '35 (Mod)', '50 (Heavy)', '65+ (Extreme)'],
      gradient: 'bg-gradient-to-r from-cyan-400 via-green-500 via-yellow-400 via-orange-500 via-red-600 via-fuchsia-600 to-white',
      isActive: activeLayers.radar,
      isAvailable: true
    }
  ];

  return (
    <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl shadow-xs space-y-3 font-sans text-[#12324E] h-full flex flex-col justify-between">
      
      <div className="flex items-center justify-between border-b border-[#D0E3F0] pb-2">
        <span className="text-xs font-mono font-bold text-[#0F2942] uppercase flex items-center gap-1.5">
          <Info className="w-4 h-4 text-[#0284C7]" /> Weather Layer Legends & Color Scales
        </span>
        <span className="text-[10px] font-mono text-[#47637E]">Meteorological Scales</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {legends.map((item) => (
          <div 
            key={item.key}
            className={`p-3 rounded-lg border transition-all ${
              item.isActive
                ? 'bg-white border-[#D0E3F0] shadow-2xs'
                : 'bg-[#EEF6FB]/50 border-[#D0E3F0]/60 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
              <span className="font-semibold text-[#0F2942] truncate">{item.title}</span>
              <span className="text-[10px] text-[#0284C7] font-bold shrink-0 ml-1">{item.range}</span>
            </div>

            {item.isAvailable ? (
              <div className="space-y-1">
                <div className={`h-2.5 rounded-xs w-full ${item.gradient} shadow-2xs`} />
                <div className="flex justify-between text-[9px] font-mono text-[#47637E] pt-0.5">
                  {item.stops.map((stop, i) => (
                    <span key={i}>{stop}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-[#FEF2F2] border border-[#FEE2E2] p-1.5 rounded text-[11px] font-mono text-[#991B1B] flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Layer Unavailable in Current Stream
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="text-[10px] text-[#47637E] font-mono pt-2 border-t border-[#D0E3F0] flex justify-between">
        <span>* Field scales mapped to IMD / ECMWF standards</span>
        <span>Lead Time: Multi-horizon</span>
      </div>

    </div>
  );
}
