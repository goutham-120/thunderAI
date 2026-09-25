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
    <div className="glass-panel p-3.5 rounded-2xl border border-slate-800/90 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Playback Controls */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`p-2.5 rounded-xl font-bold flex items-center justify-center transition-all shadow-md ${
            isPlaying
              ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
              : 'bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
          }`}
          title={isPlaying ? "Pause Nowcast" : "Play Forecast Sequence"}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-white" />}
        </button>

        <button
          onClick={handleStepPrev}
          disabled={horizonMin === horizons[0]}
          className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 disabled:opacity-30 border border-slate-700/60 transition-all"
          title="Previous Horizon"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={handleStepNext}
          disabled={horizonMin === horizons[horizons.length - 1]}
          className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 disabled:opacity-30 border border-slate-700/60 transition-all"
          title="Next Horizon"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Speed Toggle */}
        <div className="bg-slate-900/90 p-0.5 rounded-lg flex items-center text-[10px] font-bold font-mono border border-slate-800">
          {[1, 2, 4].map(spd => (
            <button
              key={spd}
              onClick={() => setPlaySpeed(spd)}
              className={`px-2 py-1 rounded-md transition-all ${
                playSpeed === spd 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      {/* Horizon Scrubber Steps */}
      <div className="flex-1 w-full flex items-center justify-center space-x-1 sm:space-x-2 px-2">
        <span className="text-[11px] font-mono font-bold text-slate-400 mr-2 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
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
                  ? 'bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-cyan-300/40 scale-105'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/70'
              }`}
            >
              <span>{h}m</span>
              <span className={`text-[8px] font-sans ${isSelected ? 'text-cyan-100' : 'text-slate-400'}`}>
                {h <= 60 ? 'AI Direct' : 'Blended'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Timestamp Indicator */}
      <div className="flex items-center space-x-3 text-xs font-mono bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800">
        <div className="flex flex-col text-right">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Valid Forecast</span>
          <span className="font-bold text-slate-200">T + {horizonMin} Minutes</span>
        </div>
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]"></div>
      </div>
    </div>
  );
}
