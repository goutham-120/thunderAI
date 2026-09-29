import React from 'react';
import { CloudLightning, Zap, CloudRain, Radio } from 'lucide-react';

export default function NowcastSummaryBar({ forecastData }) {
  const summary = forecastData?.summary_metrics || {};
  const risk = forecastData?.convective_risk || {};

  const thunderProb = summary.max_thunderstorm_prob_percent ?? summary.max_thunderstorm_prob_pct ?? risk.p_thunderstorm_percent ?? null;
  const lightningProb = summary.max_lightning_prob_percent ?? summary.max_lightning_prob_pct ?? risk.p_lightning_percent ?? null;
  const maxRain = summary.max_rain_intensity_mmh ?? summary.max_rainfall_rate_mmh ?? risk.max_rainfall_rate_mmh ?? null;
  const maxDbz = summary.peak_radar_dbz ?? summary.max_reflectivity_dbz ?? risk.max_reflectivity_dbz ?? null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono select-none">
      
      {/* 1. THUNDERSTORM PROBABILITY */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-3.5 rounded-lg shadow-2xs flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-md bg-[#EEF6FB] text-[#0284C7] border border-[#D0E3F0]">
            <CloudLightning className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#5E82A6] block uppercase tracking-wider font-sans">
              THUNDERSTORM
            </span>
            <span className="text-xs text-[#5E82A6] font-sans">Probability</span>
          </div>
        </div>
        <span className="text-xl font-bold text-[#0284C7] font-mono">
          {thunderProb !== null ? `${Math.round(thunderProb)}%` : '—'}
        </span>
      </div>

      {/* 2. LIGHTNING PROBABILITY */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-3.5 rounded-lg shadow-2xs flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-md bg-[#FFFBEB] text-[#D97706] border border-[#FEF3C7]">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#5E82A6] block uppercase tracking-wider font-sans">
              LIGHTNING
            </span>
            <span className="text-xs text-[#5E82A6] font-sans">Probability</span>
          </div>
        </div>
        <span className="text-xl font-bold text-[#D97706] font-mono">
          {lightningProb !== null ? `${Math.round(lightningProb)}%` : '—'}
        </span>
      </div>

      {/* 3. RAINFALL INTENSITY */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-3.5 rounded-lg shadow-2xs flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-md bg-[#EEF6FB] text-[#0284C7] border border-[#D0E3F0]">
            <CloudRain className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#5E82A6] block uppercase tracking-wider font-sans">
              STORM INTENSITY
            </span>
            <span className="text-xs text-[#5E82A6] font-sans">Rainfall Rate</span>
          </div>
        </div>
        <span className="text-xl font-bold text-[#0284C7] font-mono">
          {maxRain !== null ? `${Number(maxRain).toFixed(1)} mm/h` : '—'}
        </span>
      </div>

      {/* 4. MAX dBZ REFLECTIVITY */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-3.5 rounded-lg shadow-2xs flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-md bg-[#FEF2F2] text-[#DC2626] border border-[#FEE2E2]">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#5E82A6] block uppercase tracking-wider font-sans">
              MAX dBZ
            </span>
            <span className="text-xs text-[#5E82A6] font-sans">Reflectivity</span>
          </div>
        </div>
        <span className="text-xl font-bold text-[#DC2626] font-mono">
          {maxDbz !== null ? `${Math.round(maxDbz)}` : '—'}
        </span>
      </div>

    </div>
  );
}
