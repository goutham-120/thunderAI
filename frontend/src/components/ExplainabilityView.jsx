import React from 'react';
import { HelpCircle, Radio, Zap, Satellite, Layers, Wind, Droplets } from 'lucide-react';

export default function ExplainabilityView({ xaiData }) {
  const drivers = xaiData?.drivers || [
    { feature: "RADAR REFLECTIVITY", value: "56.2 dBZ", impact_percent: 92, status: "CRITICAL", icon: Radio, color: "text-[#DC2626]" },
    { feature: "LIGHTNING FLASH ACCELERATION", value: "+28.4 /min", impact_percent: 84, status: "CRITICAL", icon: Zap, color: "text-[#D97706]" },
    { feature: "ISRO SATELLITE CLOUD-TOP TEMP", value: "-68.4 °C", impact_percent: 91, status: "CRITICAL", icon: Satellite, color: "text-[#4F46E5]" },
    { feature: "NWP CAPE INSTABILITY", value: "2450 J/kg", impact_percent: 78, status: "HIGH", icon: Layers, color: "text-[#0D9488]" },
    { feature: "0-6 KM WIND SHEAR", value: "24.0 kts", impact_percent: 68, status: "FAVORABLE", icon: Wind, color: "text-[#059669]" },
    { feature: "INTEGRATED WATER VAPOUR", value: "54.2 mm", impact_percent: 62, status: "HIGH", icon: Droplets, color: "text-[#0284C7]" }
  ];

  return (
    <div className="space-y-4 font-sans text-[#0F2942]">
      {/* Header */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl flex items-center justify-between shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-[#0F2942] flex items-center gap-2 font-mono">
            <HelpCircle className="w-4 h-4 text-[#0284C7]" />
            FEATURE ATTRIBUTION & EXPLAINABILITY (XAI DRIVERS)
          </h2>
          <p className="text-xs text-[#47637E] font-mono">
            Feature Attribution Breakdown for Convective Initiation & Intensity
          </p>
        </div>
      </div>

      {/* Drivers List */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl space-y-3 font-mono shadow-xs">
        <h3 className="text-xs font-bold text-[#0F2942] uppercase tracking-wider mb-2 font-sans">
          Feature Impact Scores
        </h3>

        <div className="space-y-3">
          {drivers.map((d, i) => {
            const Icon = d.icon || Radio;
            return (
              <div key={i} className="bg-[#EEF6FB] border border-[#D0E3F0] p-3 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <Icon className={`w-4 h-4 ${d.color || 'text-[#0284C7]'}`} />
                    <span className="font-bold text-[#0F2942]">{d.feature}</span>
                    <span className="text-[#47637E]">({d.value})</span>
                  </div>
                  <span className="text-[#0284C7] font-bold">{d.impact_percent}% Impact</span>
                </div>

                <div className="w-full bg-[#E2EAF0] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#0284C7] h-2 rounded-full"
                    style={{ width: `${d.impact_percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
