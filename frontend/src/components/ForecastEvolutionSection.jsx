import React from 'react';
import { TrendingUp, Clock, Zap, Flame, CloudRain, Radio, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';

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
          <span>Calculating multi-horizon forecast evolution for selected target...</span>
        </div>
      </div>
    );
  }

  // Determine peak convective horizon and overall trend
  let peakItem = evolutionList[0];
  let firstItem = evolutionList[0];
  let lastItem = evolutionList[evolutionList.length - 1];

  for (const item of evolutionList) {
    const thu = item.thunderstorm_prob_pct ?? item.p_thunderstorm ?? 0;
    const peakThu = peakItem.thunderstorm_prob_pct ?? peakItem.p_thunderstorm ?? 0;
    if (thu > peakThu) {
      peakItem = item;
    }
  }

  const locationName = selectedLocation?.name || selectedRegion || 'Selected Target';
  const peakTimeLabel = peakItem.label || (peakItem.horizon_min === 0 ? 'NOW' : `+${peakItem.horizon_min}m`);
  const peakThuVal = peakItem.thunderstorm_prob_pct ?? peakItem.p_thunderstorm ?? 0;
  const peakDbzVal = peakItem.max_dbz ?? peakItem.pred_dbz ?? 0;
  const peakRainVal = peakItem.rainfall_rate_mmh ?? peakItem.rainfall_mmh ?? 0;
  const firstThuVal = firstItem.thunderstorm_prob_pct ?? firstItem.p_thunderstorm ?? 0;
  const lastThuVal = lastItem.thunderstorm_prob_pct ?? lastItem.p_thunderstorm ?? 0;

  let trendSummary = 'Stable atmospheric baseline';
  if (peakThuVal > firstThuVal && peakThuVal > 50) {
    trendSummary = `Convective intensification peaking at ${peakTimeLabel} (${peakThuVal}% storm prob, ${peakDbzVal} dBZ), followed by gradual dissipation toward +180m (${lastThuVal}%).`;
  } else if (firstThuVal > 50 && lastThuVal < firstThuVal) {
    trendSummary = `High convective activity currently active (${firstThuVal}%), expected to gradually decay through +180m (${lastThuVal}%).`;
  } else if (peakThuVal > 30) {
    trendSummary = `Moderate convective instability predicted with maximum storm probability ${peakThuVal}% around ${peakTimeLabel}.`;
  } else {
    trendSummary = `Atmospheric conditions expected to remain mostly quiescent (storm probability < ${Math.max(peakThuVal, 10)}% across all lead times).`;
  }

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
    <section aria-label="Forecast Evolution" className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl shadow-xs font-sans space-y-3 select-none">
      
      {/* 1. Header with Title & Lead Time Selector Indicator */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#E2EAF0] pb-2.5 gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-[#EEF6FB] border border-[#D0E3F0] text-[#0284C7]">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#0F2942] uppercase tracking-wider font-mono flex items-center gap-2">
              <span>FORECAST EVOLUTION</span>
              <span className="text-[9px] px-2 py-0.5 rounded bg-[#0284C7] text-white font-bold tracking-tight">
                NOW → +180m PROJECTION
              </span>
            </h2>
            <p className="text-[10px] text-[#47637E] font-medium">
              Multimodal Nowcast Progression for <strong className="font-mono text-[#0F2942]">{locationName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-[10px] font-mono">
          <span className="text-[#47637E] hidden sm:inline">Selected Horizon:</span>
          <span className="px-2 py-0.5 rounded bg-[#0284C7] text-white font-bold shadow-2xs">
            {horizonMin === 0 ? 'NOW (T+0m)' : `+${horizonMin} min`}
          </span>
        </div>
      </div>

      {/* 2. Step-by-Step Evolution Flow Bar (NOW -> +15 -> +30 -> +60 -> +120 -> +180m) */}
      <div className="bg-[#EEF6FB] p-2.5 rounded-lg border border-[#D0E3F0] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center space-x-1.5 overflow-x-auto text-[11px] text-[#0F2942]">
          <span className="font-bold text-[#47637E] text-[10px] uppercase tracking-wider shrink-0 mr-1">Progression:</span>
          {evolutionList.map((item, idx) => {
            const hVal = item.horizon_min;
            const isSelected = horizonMin === hVal;
            const thu = item.thunderstorm_prob_pct ?? item.p_thunderstorm ?? 0;
            const lbl = item.label || (hVal === 0 ? 'NOW' : `+${hVal}m`);

            return (
              <React.Fragment key={`prog-${hVal}`}>
                <button
                  type="button"
                  onClick={() => setHorizonMin && setHorizonMin(hVal)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-[#0284C7] text-white shadow-2xs ring-1 ring-[#0284C7]'
                      : 'bg-white hover:bg-[#D4E6F5] text-[#0F2942] border border-[#D0E3F0]'
                  }`}
                  title={`Select ${lbl} horizon (${thu}% storm probability)`}
                >
                  <span>{lbl}</span>
                  <span className={`text-[8px] font-normal ${isSelected ? 'text-white/90' : thu > 50 ? 'text-[#DC2626] font-bold' : 'text-[#47637E]'}`}>
                    ({thu}%)
                  </span>
                </button>
                {idx < evolutionList.length - 1 && (
                  <ArrowRight className="w-2.5 h-2.5 text-[#64829E] shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="text-[10px] text-[#47637E] font-sans flex items-center space-x-1 shrink-0">
          <Sparkles className="w-3 h-3 text-[#0284C7]" />
          <span>Click any step to sync map & sensors</span>
        </div>
      </div>

      {/* 3. Operational Trend Insight Banner */}
      <div className="bg-white p-2.5 rounded-lg border border-[#D0E3F0] text-xs font-mono text-[#0F2942] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="w-3.5 h-3.5 text-[#0284C7] shrink-0" />
          <span className="text-[11px]">
            <strong className="text-[#0284C7]">Evolution Trend:</strong> {trendSummary}
          </span>
        </div>
        <span className="text-[9px] text-[#64829E] font-sans shrink-0 hidden md:inline">
          Peak threat: <strong className="text-[#DC2626]">{peakTimeLabel}</strong> ({peakDbzVal} dBZ, {peakRainVal} mm/h)
        </span>
      </div>

      {/* 4. Compact 8-Horizon Card Array (15, 30, 45, 60, 90, 120, 180 min) */}
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
                  <span className={`font-bold ${thu > 50 ? 'text-[#DC2626]' : 'text-[#0F2942]'}`}>{thu}%</span>
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

              {/* Active Horizon Pulse Dot */}
              {isSelected && (
                <div className="flex items-center justify-center pt-1 border-t border-[#0284C7]/20">
                  <span className="text-[8px] font-bold text-[#0284C7] uppercase tracking-wider">
                    ● ACTIVE HORIZON
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

