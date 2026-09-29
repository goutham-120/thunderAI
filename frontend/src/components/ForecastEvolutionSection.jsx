import React from 'react';
import { TrendingUp, Clock, Zap, Flame, CloudRain, Radio, ChevronRight } from 'lucide-react';

export default function ForecastEvolutionSection({
  forecastData,
  areaData,
  horizonMin,
  setHorizonMin,
  selectedLocation,
  selectedRegion
}) {
  // Use areaData timeline if present, or forecastData evolution
  const evolutionList = 
    areaData?.area_nowcast_timeline || 
    forecastData?.forecast_evolution || 
    [];

  if (evolutionList.length === 0) {
    return (
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl shadow-xs font-sans text-xs text-[#64829E]">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-[#0284C7] animate-spin" />
          <span>Calculating multi-horizon forecast evolution...</span>
        </div>
      </div>
    );
  }

  // Determine peak convective horizon for operational insight string
  let peakItem = evolutionList[0];
  for (const item of evolutionList) {
    const thu = item.thunderstorm_prob_pct || item.p_thunderstorm || 0;
    const peakThu = peakItem.thunderstorm_prob_pct || peakItem.p_thunderstorm || 0;
    if (thu > peakThu) {
      peakItem = item;
    }
  }

  const locationName = selectedLocation?.name || selectedRegion || 'Selected Region';
  const peakTimeLabel = peakItem.label || (peakItem.horizon_min === 0 ? 'NOW' : `+${peakItem.horizon_min}m`);
  const peakThuVal = peakItem.thunderstorm_prob_pct ?? peakItem.p_thunderstorm ?? 0;
  const peakDbzVal = peakItem.max_dbz ?? peakItem.pred_dbz ?? 0;
  const peakRainVal = peakItem.rainfall_rate_mmh ?? peakItem.rainfall_mmh ?? 0;

  const getThreatBadge = (levelStr) => {
    switch (levelStr) {
      case 'CRITICAL':
      case 'IMPACT':
        return <span className="px-1.5 py-0.5 rounded text-[8px] font-bold font-mono bg-[#FEF2F2] text-[#DC2626] border border-[#FEE2E2]">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-1.5 py-0.5 rounded text-[8px] font-bold font-mono bg-[#FFFBEB] text-[#D97706] border border-[#FEF3C7]">HIGH</span>;
      case 'MODERATE':
        return <span className="px-1.5 py-0.5 rounded text-[8px] font-bold font-mono bg-[#F0F9FF] text-[#0284C7] border border-[#E0F2FE]">MODERATE</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[8px] font-bold font-mono bg-[#F0FDF4] text-[#16A34A] border border-[#DCFCE7]">LOW</span>;
    }
  };

  return (
    <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl shadow-xs font-sans space-y-3 select-none">
      
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#E2EAF0] pb-2.5 gap-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-[#EEF6FB] border border-[#D0E3F0] text-[#0284C7]">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#0F2942] uppercase tracking-wider font-mono flex items-center gap-2">
              Forecast Evolution Sequence
              <span className="text-[9px] px-2 py-0.5 rounded bg-[#0284C7] text-white font-bold">
                0m → +180m PROJECTION
              </span>
            </h3>
            <p className="text-[10px] text-[#47637E] font-medium">
              Multimodal Nowcast progression for <strong className="font-mono text-[#0F2942]">{locationName}</strong>. Click any horizon to select.
            </p>
          </div>
        </div>

        <div className="text-[10px] font-mono text-[#47637E] flex items-center space-x-2">
          <span>Active Lead Time:</span>
          <span className="px-2 py-0.5 rounded bg-[#0284C7] text-white font-bold">
            {horizonMin === 0 ? 'NOW' : `+${horizonMin}m`}
          </span>
        </div>
      </div>

      {/* Dynamic Operational Evolution Summary */}
      <div className="bg-[#EEF6FB] p-2.5 rounded-lg border border-[#D0E3F0] text-xs font-mono text-[#0F2942] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="w-3.5 h-3.5 text-[#0284C7] shrink-0" />
          <span className="text-[11px]">
            Peak convective threat predicted at <strong className="text-[#DC2626] font-bold">{peakTimeLabel}</strong> ({peakThuVal}% storm prob, {peakDbzVal} dBZ, {peakRainVal} mm/h rain).
          </span>
        </div>
        <span className="text-[9px] text-[#64829E] font-sans shrink-0 hidden md:inline">
          Syncs with spatial nowcast grid
        </span>
      </div>

      {/* 8-Horizon Card Array */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 font-mono">
        {evolutionList.map((item) => {
          const hVal = item.horizon_min;
          const isSelected = horizonMin === hVal;

          const thu = item.thunderstorm_prob_pct ?? item.p_thunderstorm ?? 0;
          const lig = item.lightning_prob_pct ?? item.p_lightning ?? 0;
          const rain = item.rainfall_rate_mmh ?? item.rainfall_mmh ?? 0;
          const dbz = item.max_dbz ?? item.pred_dbz ?? 0;

          const threatLvl = item.threat_level || (thu > 70 ? 'CRITICAL' : thu > 40 ? 'HIGH' : thu > 20 ? 'MODERATE' : 'LOW');

          return (
            <div
              key={hVal}
              onClick={() => setHorizonMin && setHorizonMin(hVal)}
              className={`p-2.5 rounded-xl border cursor-pointer transition-all space-y-2 text-xs relative ${
                isSelected
                  ? 'bg-[#D4E6F5] border-[#0284C7] shadow-xs ring-2 ring-[#0284C7] z-10'
                  : 'bg-[#EEF6FB]/80 border-[#D0E3F0] hover:bg-[#E5F0F7] hover:border-[#0284C7]/50'
              }`}
            >
              {/* Card Header: Horizon Label & Threat Badge */}
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isSelected ? 'text-[#0284C7]' : 'text-[#0F2942]'}`}>
                  {item.label || (hVal === 0 ? 'NOW' : `+${hVal}m`)}
                </span>
                {getThreatBadge(threatLvl)}
              </div>

              {/* Variable metrics list */}
              <div className="space-y-1.5 pt-1 text-[10px] border-t border-[#D0E3F0]/60">
                {/* Thunderstorm Prob */}
                <div className="flex items-center justify-between">
                  <span className="text-[#47637E] font-sans flex items-center gap-1">
                    <Flame className="w-2.5 h-2.5 text-[#DC2626]" />
                    Storm:
                  </span>
                  <span className="font-bold text-[#0F2942]">{thu}%</span>
                </div>

                {/* Lightning Risk */}
                <div className="flex items-center justify-between">
                  <span className="text-[#47637E] font-sans flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5 text-[#D97706]" />
                    Lightning:
                  </span>
                  <span className="font-bold text-[#D97706]">{lig}%</span>
                </div>

                {/* Rainfall Rate */}
                <div className="flex items-center justify-between">
                  <span className="text-[#47637E] font-sans flex items-center gap-1">
                    <CloudRain className="w-2.5 h-2.5 text-[#0284C7]" />
                    Rain:
                  </span>
                  <span className="font-bold text-[#0284C7]">{rain} mm/h</span>
                </div>

                {/* Max dBZ */}
                <div className="flex items-center justify-between">
                  <span className="text-[#47637E] font-sans flex items-center gap-1">
                    <Radio className="w-2.5 h-2.5 text-[#DC2626]" />
                    Reflect:
                  </span>
                  <span className="font-bold text-[#DC2626]">{dbz} dBZ</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
