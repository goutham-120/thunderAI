import React, { useState, useEffect } from 'react';
import { Clock, Play, Pause } from 'lucide-react';

export default function ForecastTimelineBar({ horizonMin, setHorizonMin }) {
  const [isPlaying, setIsPlaying] = useState(false);

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

  useEffect(() => {
    if (!isPlaying) return;

    const sequence = [0, 15, 30, 45, 60, 90, 120, 180];
    const interval = setInterval(() => {
      setHorizonMin(prev => {
        const currIndex = sequence.indexOf(prev);
        const nextIndex = (currIndex + 1) % sequence.length;
        return sequence[nextIndex] === 0 ? 15 : sequence[nextIndex];
      });
    }, 1300);

    return () => clearInterval(interval);
  }, [isPlaying, setHorizonMin]);

  return (
    <div className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-lg p-3 shadow-2xs font-sans select-none">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center space-x-3">
          <span className="text-[11px] text-[#12324E] font-bold uppercase tracking-wider flex items-center gap-1.5 font-sora">
            <Clock className="w-3.5 h-3.5 text-[#0284C7]" />
            Forecast Lead Time Control
          </span>

          {/* Time-lapse Play / Pause Control Button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold font-sans transition-all border ${
              isPlaying
                ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FEE2E2]'
                : 'bg-[#EEF6FB] text-[#0284C7] border-[#D0E3F0] hover:bg-[#E5F0F7]'
            }`}
            title={isPlaying ? 'Pause Loop' : 'Play Automated 0-180m Loop'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3 fill-current" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current ml-0.5" />
                <span>PLAY LOOP</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-[#0284C7] font-bold font-mono">
            Target: T + {horizonMin} min
          </span>
        </div>
      </div>

      {/* Scientific Timeline Selector */}
      <div className="relative pt-1">
        {/* Baseline Track Line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#D0E3F0] -translate-y-1/2 z-0" />

        <div className="grid grid-cols-8 gap-1 relative z-10 font-mono">
          {horizons.map((item) => {
            const isSelected = horizonMin === item.value || (horizonMin === 0 && item.value === 0);
            return (
              <button
                key={item.value}
                onClick={() => {
                  setIsPlaying(false);
                  setHorizonMin(item.value === 0 ? 15 : item.value);
                }}
                className={`flex flex-col items-center py-1 transition-all group ${
                  isSelected ? 'text-[#0284C7] font-bold' : 'text-[#5E82A6] hover:text-[#12324E]'
                }`}
              >
                <span className="text-[11px] tracking-tight mb-1">{item.label}</span>
                <div
                  className={`w-full h-1 rounded-full transition-all ${
                    isSelected
                      ? 'bg-[#0284C7] shadow-2xs'
                      : 'bg-[#D0E3F0] group-hover:bg-[#5E82A6]'
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

