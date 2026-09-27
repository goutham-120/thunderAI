import React from 'react';
import { Clock } from 'lucide-react';

export default function ForecastTimelineBar({ horizonMin, setHorizonMin }) {
  const horizons = [
    { value: 0, label: 'NOW' },
    { value: 15, label: '15 min' },
    { value: 30, label: '30 min' },
    { value: 45, label: '45 min' },
    { value: 60, label: '60 min' },
    { value: 90, label: '90 min' },
    { value: 120, label: '120 min' },
    { value: 180, label: '180 min' }
  ];

  return (
    <div className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-xl p-3 shadow-xs font-mono select-none">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[11px] text-[#47637E] font-bold uppercase tracking-wider flex items-center gap-1.5 font-sans">
          <Clock className="w-3.5 h-3.5 text-[#0284C7]" />
          Forecast Timeline
        </span>
        <span className="text-xs text-[#0284C7] font-bold font-mono">
          Target: T + {horizonMin} minutes
        </span>
      </div>

      {/* Thin Scientific Timeline Selector */}
      <div className="relative pt-1">
        {/* Baseline Track Line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#E2EAF0] -translate-y-1/2 z-0" />

        <div className="grid grid-cols-8 gap-1 relative z-10">
          {horizons.map((item) => {
            const isSelected = horizonMin === item.value || (horizonMin === 0 && item.value === 0);
            return (
              <button
                key={item.value}
                onClick={() => setHorizonMin(item.value === 0 ? 15 : item.value)}
                className={`flex flex-col items-center py-1 transition-all group ${
                  isSelected ? 'text-[#0284C7] font-bold' : 'text-[#47637E] hover:text-[#0F2942]'
                }`}
              >
                <span className="text-[11px] tracking-tight mb-1">{item.label}</span>
                <div
                  className={`w-full h-1 rounded-full transition-all ${
                    isSelected
                      ? 'bg-[#0284C7] shadow-2xs'
                      : 'bg-[#D0E3F0] group-hover:bg-[#B8D6EB]'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
