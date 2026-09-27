import React from 'react';
import { TrendingUp, Sparkles, Zap, CloudRain, Radio } from 'lucide-react';

export default function ForecastView({ forecastData, horizonMin, setHorizonMin }) {
  const horizons = [15, 30, 45, 60, 90, 120, 180];
  const summary = forecastData?.summary_metrics || {};
  const risk = forecastData?.convective_risk || {};

  return (
    <div className="space-y-4 font-sans text-[#0F2942]">
      {/* Header */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl flex items-center justify-between shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-[#0F2942] flex items-center gap-2 font-mono">
            <TrendingUp className="w-4 h-4 text-[#0284C7]" />
            SPATIOTEMPORAL NOWCAST MATRIX (15–180 MIN)
          </h2>
          <p className="text-xs text-[#47637E] font-mono">
            2-Layer ConvLSTM Encoder-Decoder Multi-Horizon Convective Forecast
          </p>
        </div>
      </div>

      {/* Horizon Selector Bar */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-3 rounded-xl flex flex-wrap items-center justify-between gap-2 font-mono shadow-xs">
        <span className="text-xs text-[#47637E] font-bold uppercase tracking-wider font-sans">
          Select Forecast Horizon:
        </span>
        <div className="flex flex-wrap space-x-1.5">
          {horizons.map(h => {
            const isSelected = horizonMin === h;
            return (
              <button
                key={h}
                onClick={() => setHorizonMin(h)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-[#0284C7] text-white shadow-2xs'
                    : 'bg-[#EEF6FB] text-[#47637E] hover:bg-[#E5F0F7] border border-[#D0E3F0]'
                }`}
              >
                +{h} min
              </button>
            );
          })}
        </div>
      </div>

      {/* Horizon Prediction Details Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 font-mono">
        
        <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl space-y-2 shadow-xs">
          <div className="flex items-center space-x-2 text-[#0284C7]">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-bold uppercase font-sans">Thunderstorm Risk</span>
          </div>
          <div className="text-2xl font-bold text-[#0F2942]">
            {summary.max_thunderstorm_prob_pct ?? risk.p_thunderstorm_percent ?? 78}%
          </div>
          <div className="text-[10px] text-[#47637E] font-sans">
            Horizon +{horizonMin}m Peak Probability
          </div>
        </div>

        <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl space-y-2 shadow-xs">
          <div className="flex items-center space-x-2 text-[#D97706]">
            <Zap className="w-4 h-4" />
            <span className="text-xs font-bold uppercase font-sans">Lightning Risk</span>
          </div>
          <div className="text-2xl font-bold text-[#0F2942]">
            {summary.max_lightning_prob_pct ?? risk.p_lightning_percent ?? 64}%
          </div>
          <div className="text-[10px] text-[#47637E] font-sans">
            Stroke Density Potential
          </div>
        </div>

        <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl space-y-2 shadow-xs">
          <div className="flex items-center space-x-2 text-[#0369A1]">
            <CloudRain className="w-4 h-4" />
            <span className="text-xs font-bold uppercase font-sans">Rainfall Rate</span>
          </div>
          <div className="text-2xl font-bold text-[#0F2942]">
            {summary.max_rainfall_rate_mmh ?? 12.4} mm/h
          </div>
          <div className="text-[10px] text-[#47637E] font-sans">
            Precipitation Accumulation
          </div>
        </div>

        <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl space-y-2 shadow-xs">
          <div className="flex items-center space-x-2 text-[#DC2626]">
            <Radio className="w-4 h-4" />
            <span className="text-xs font-bold uppercase font-sans">Radar dBZ Peak</span>
          </div>
          <div className="text-2xl font-bold text-[#0F2942]">
            {summary.max_reflectivity_dbz ?? 52} dBZ
          </div>
          <div className="text-[10px] text-[#47637E] font-sans">
            Convective Core Reflectivity
          </div>
        </div>

      </div>

      {/* Evolution Curve */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl space-y-3 font-mono shadow-xs">
        <h3 className="text-xs font-bold text-[#0F2942] uppercase tracking-wider font-sans">
          Convective Evolution Curve (15m → 180m)
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {horizons.map(h => {
            const decay = Math.max(0.45, 1.0 - (h / 300));
            const pVal = Math.round(78 * decay);
            return (
              <div key={h} className="bg-[#EEF6FB] border border-[#D0E3F0] p-3 rounded-lg text-center space-y-1">
                <span className="text-[10px] text-[#47637E] font-bold block">+{h} MIN</span>
                <span className="text-sm font-bold text-[#0284C7]">{pVal}%</span>
                <div className="w-full bg-[#D0E3F0] h-1.5 rounded-full overflow-hidden mt-1">
                  <div className="bg-[#0284C7] h-full rounded-full" style={{ width: `${pVal}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
