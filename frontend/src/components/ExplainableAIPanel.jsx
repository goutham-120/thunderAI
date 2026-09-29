import React from 'react';
import { Activity, Gauge, Info } from 'lucide-react';

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
    <div className="bg-[#F8FCFE] p-4 rounded-lg border border-[#D0E3F0] shadow-2xs flex flex-col h-full font-sans text-[#12324E]">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#D0E3F0] mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-md bg-[#EEF6FB] text-[#0284C7] border border-[#D0E3F0]">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#12324E] uppercase tracking-wider font-sora flex items-center gap-1.5">
              Physical Driver Attribution
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#EEF6FB] text-[#0284C7] font-mono border border-[#D0E3F0]">
                SHAP Weights
              </span>
            </h3>
            <p className="text-[10px] text-[#5E82A6] font-medium font-sans">
              Thermodynamic & Multi-Sensor Convective Drivers
            </p>
          </div>
        </div>
        <div className="text-right font-mono">
          <span className="text-[10px] text-[#5E82A6] block font-sans">Confidence</span>
          <span className="text-xs font-bold text-[#047857]">
            {data.confidence_index_percent || 88.5}%
          </span>
        </div>
      </div>

      {/* Probability Dual Gauges */}
      <div className="grid grid-cols-2 gap-3 mb-3.5 font-mono">
        <div className="p-2.5 rounded-md bg-[#FEF2F2] border border-[#FEE2E2]">
          <span className="text-[10px] font-bold text-[#991B1B] block uppercase tracking-wider font-sans">
            Thunderstorm Risk
          </span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-2xl font-bold text-[#991B1B] tracking-tight">
              {data.p_thunderstorm_percent}%
            </span>
          </div>
          <div className="w-full bg-[#E2EAF0] rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-[#DC2626] h-1.5 rounded-full" 
              style={{ width: `${data.p_thunderstorm_percent}%` }}
            ></div>
          </div>
        </div>

        <div className="p-2.5 rounded-md bg-[#FFFBEB] border border-[#FEF3C7]">
          <span className="text-[10px] font-bold text-[#92400E] block uppercase tracking-wider font-sans">
            Lightning Risk
          </span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-2xl font-bold text-[#92400E] tracking-tight">
              {data.p_lightning_percent}%
            </span>
          </div>
          <div className="w-full bg-[#E2EAF0] rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-[#D97706] h-1.5 rounded-full" 
              style={{ width: `${data.p_lightning_percent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Atmospheric Driver Attribution Bars */}
      <div className="space-y-2 mb-3.5 flex-1 overflow-y-auto pr-1">
        <span className="text-[10px] font-bold text-[#5E82A6] uppercase tracking-wider block font-sans">
          Key Atmospheric Triggers:
        </span>
        {data.drivers?.map((driver, i) => (
          <div key={i} className="p-2 rounded-md bg-[#EEF6FB] border border-[#D0E3F0] text-xs">
            <div className="flex items-center justify-between mb-1 font-sans">
              <span className="font-semibold text-[#12324E] text-[11px]">{driver.feature}</span>
              <span className="font-mono font-bold text-[#0284C7] text-[11px]">{driver.value}</span>
            </div>
            <div className="w-full bg-[#E2EAF0] rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-[#0284C7] h-1.5 rounded-full" 
                style={{ width: `${driver.impact_percent}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-[9px] text-[#5E82A6] mt-1 font-medium font-sans">
              <span>{driver.trend}</span>
              <span className="font-mono text-[#0284C7] font-bold">{driver.impact_percent}% Weight</span>
            </div>
          </div>
        ))}
      </div>

      {/* Meteorological Rationale Box */}
      <div className="p-3 rounded-md bg-[#EEF6FB] border border-[#D0E3F0] text-xs font-sans">
        <div className="flex items-center space-x-1.5 font-bold text-[#0284C7] mb-1 text-[11px] font-sora">
          <Info className="w-3.5 h-3.5 text-[#0284C7]" />
          <span>Meteorological Synthesis</span>
        </div>
        <p className="text-[11px] text-[#5E82A6] leading-relaxed italic font-normal">
          "{data.meteorological_rationale}"
        </p>
      </div>
    </div>
  );
}
