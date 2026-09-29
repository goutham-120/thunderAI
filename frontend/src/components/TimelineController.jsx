import React, { useEffect, useState } from 'react';
import { 
  Play, 
  Pause, 
  Clock, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';

export default function TimelineController({
  horizonMin,
  setHorizonMin,
  tOffset,
  setTOffset,
  isReplayMode
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);

  const horizons = [15, 30, 45, 60, 90, 120, 180];

  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setHorizonMin(prev => {
          const idx = horizons.indexOf(prev);
          if (idx === -1 || idx === horizons.length - 1) {
            return horizons[0];
          }
          return horizons[idx + 1];
        });
      }, 2000 / playSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playSpeed]);

  const handleStepPrev = () => {
    const idx = horizons.indexOf(horizonMin);
    if (idx > 0) setHorizonMin(horizons[idx - 1]);
  };

  const handleStepNext = () => {
    const idx = horizons.indexOf(horizonMin);
    if (idx < horizons.length - 1) setHorizonMin(horizons[idx + 1]);
  };

  return (
    <div className="meteo-card p-3.5 rounded-2xl border border-[#D0E3F0] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 bg-[#F8FCFE] font-sans">
      {/* Playback Controls */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`p-2.5 rounded-xl font-bold flex items-center justify-center transition-all shadow-xs ${
            isPlaying
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : 'bg-[#12324E] text-white hover:bg-[#12324E]/90'
          }`}
          title={isPlaying ? "Pause Nowcast" : "Play Forecast Sequence"}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-white" />}
        </button>

        <button
          onClick={handleStepPrev}
          disabled={horizonMin === horizons[0]}
          className="p-2 rounded-xl bg-white hover:bg-[#EEF6FB] text-[#12324E] disabled:opacity-30 border border-[#D0E3F0] transition-all"
          title="Previous Horizon"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={handleStepNext}
          disabled={horizonMin === horizons[horizons.length - 1]}
          className="p-2 rounded-xl bg-white hover:bg-[#EEF6FB] text-[#12324E] disabled:opacity-30 border border-[#D0E3F0] transition-all"
          title="Next Horizon"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Speed Toggle */}
        <div className="bg-[#EEF6FB] p-0.5 rounded-lg flex items-center text-[10px] font-bold font-mono border border-[#D0E3F0]">
          {[1, 2, 4].map(spd => (
            <button
              key={spd}
              onClick={() => setPlaySpeed(spd)}
              className={`px-2 py-1 rounded-md transition-all ${
                playSpeed === spd 
                  ? 'bg-[#12324E] text-white shadow-xs' 
                  : 'text-[#5E82A6] hover:text-[#12324E]'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      {/* Horizon Scrubber Steps */}
      <div className="flex-1 w-full flex items-center justify-center space-x-1 sm:space-x-2 px-2">
        <span className="text-[11px] font-mono font-bold text-[#5E82A6] mr-2 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-[#0284C7]" />
          T+
        </span>

        {horizons.map((h) => {
          const isSelected = horizonMin === h;
          return (
            <button
              key={h}
              onClick={() => setHorizonMin(h)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex flex-col items-center ${
                isSelected
                  ? 'bg-[#12324E] text-white shadow-xs border border-[#12324E] scale-105'
                  : 'bg-white hover:bg-[#EEF6FB] text-[#12324E] border border-[#D0E3F0]'
              }`}
            >
              <span>{h}m</span>
              <span className={`text-[8px] font-sans ${isSelected ? 'text-cyan-200' : 'text-[#5E82A6]'}`}>
                {h <= 60 ? 'ConvLSTM' : 'Blended'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Timestamp Indicator */}
      <div className="flex items-center space-x-3 text-xs font-mono bg-[#EEF6FB] px-3 py-2 rounded-xl border border-[#D0E3F0]">
        <div className="flex flex-col text-right">
          <span className="text-[10px] text-[#5E82A6] uppercase font-semibold font-sans">Valid Forecast</span>
          <span className="font-bold text-[#12324E]">T + {horizonMin} Minutes</span>
        </div>
        <div className="w-2 h-2 rounded-full bg-[#0284C7] animate-pulse"></div>
      </div>
    </div>
  );
}
