import React from 'react';
import { 
  Sparkles, 
  BrainCircuit
} from 'lucide-react';

export default function ExplainableAIPanel({ 
  xaiData, 
  selectedCell,
  summaryMetrics 
}) {
  const data = xaiData || {
    p_thunderstorm_percent: 88.5,
    p_lightning_percent: 91.2,
    confidence_index_percent: 88.5,
    drivers: [
      { feature: "Radar Reflectivity (dBZ)", value: "56.2 dBZ", impact_percent: 92, trend: "High Convective Core Density", status: "CRITICAL" },
      { feature: "Lightning Flash Acceleration", value: "+28.4 flashes/min", impact_percent: 84, trend: "Updraft Intensification", status: "CRITICAL" },
      { feature: "Cloud-Top Brightness Temp", value: "-68.4 °C", impact_percent: 91, trend: "Rapid Overshooting Tops", status: "CRITICAL" },
      { feature: "Convective Available Energy (CAPE)", value: "2450 J/kg", impact_percent: 78, trend: "Extreme Thermodynamic Instability", status: "HIGH" },
      { feature: "0-6 km Deep Layer Wind Shear", value: "24.0 kts", impact_percent: 68, trend: "Multicell Organization Favorable", status: "FAVORABLE" }
    ],
    meteorological_rationale: "Strong convective radar core exceeding 56 dBZ with heavy hydrometeor loading. Vigorous mixed-phase updraft indicated by elevated lightning flash rate of 28 flashes/min. INSAT-3D TIR channel detects deep tropospheric penetration with cloud-top temperature of -68.4°C.",
    recommended_action: "Issue Tier-1 Red Convective Warning for downstream municipal sectors."
  };

  return (
    <div className="glass-panel p-4 rounded-2xl border border-slate-800/90 shadow-xl flex flex-col h-full">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              Explainable AI (XAI)
              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                SHAP Attributions
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">
              Thermodynamic & Multi-Sensor Convective Drivers
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 block font-sans">Confidence</span>
          <span className="text-xs font-mono font-bold text-emerald-400">
            {data.confidence_index_percent || 88.5}%
          </span>
        </div>
      </div>

      {/* Probability Dual Gauges */}
      <div className="grid grid-cols-2 gap-3 mb-3.5">
        <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
          <span className="text-[10px] font-bold text-red-300 block uppercase tracking-wider">
            Thunderstorm Risk
          </span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-2xl font-bold font-mono text-red-400 tracking-tight">
              {data.p_thunderstorm_percent}%
            </span>
            <span className="text-[9px] font-bold text-red-400 font-mono px-1 rounded bg-red-500/20">EXTREME</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-orange-500 to-red-500 h-1.5 rounded-full transition-all duration-500 shadow-[0_0_8px_#ef4444]" 
              style={{ width: `${data.p_thunderstorm_percent}%` }}
            ></div>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
          <span className="text-[10px] font-bold text-amber-300 block uppercase tracking-wider">
            Lightning Risk (0-30m)
          </span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-2xl font-bold font-mono text-amber-400 tracking-tight">
              {data.p_lightning_percent}%
            </span>
            <span className="text-[9px] font-bold text-amber-400 font-mono px-1 rounded bg-amber-500/20">SEVERE</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-yellow-400 to-amber-500 h-1.5 rounded-full transition-all duration-500 shadow-[0_0_8px_#f59e0b]" 
              style={{ width: `${data.p_lightning_percent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Atmospheric Driver Attribution Bars */}
      <div className="space-y-2 mb-3.5 flex-1 overflow-y-auto pr-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          Key Atmospheric Triggers:
        </span>
        {data.drivers?.map((driver, i) => (
          <div key={i} className="p-2 rounded-lg bg-slate-900/70 border border-slate-800 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-200 text-[11px]">{driver.feature}</span>
              <span className="font-mono font-bold text-cyan-400 text-[11px]">{driver.value}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-1.5 rounded-full shadow-[0_0_8px_#38bdf8]" 
                style={{ width: `${driver.impact_percent}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-[9px] text-slate-400 mt-1 font-medium">
              <span>{driver.trend}</span>
              <span className="font-mono text-indigo-400 font-bold">{driver.impact_percent}% Impact</span>
            </div>
          </div>
        ))}
      </div>

      {/* Meteorological AI Rationale Box */}
      <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs shadow-[0_0_15px_rgba(59,130,246,0.1)]">
        <div className="flex items-center space-x-1.5 font-bold text-blue-300 mb-1 text-[11px]">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Meteorological AI Synthesis</span>
        </div>
        <p className="text-[11px] text-blue-200 leading-relaxed font-normal">
          "{data.meteorological_rationale}"
        </p>
      </div>
    </div>
  );
}
