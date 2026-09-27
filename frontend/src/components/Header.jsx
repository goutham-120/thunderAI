import React, { useState, useEffect } from 'react';
import { Database, Clock } from 'lucide-react';

export default function Header({ 
  activeTab,
  onOpenProvenance
}) {
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setUtcTime(now.toISOString().substring(11, 19) + ' UTC');
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const pageDescriptions = {
    live: { title: 'Overview', desc: 'Real-time multimodal atmospheric nowcasting dashboard' },
    spatial: { title: 'Spatial Nowcast', desc: 'AI-based thunderstorm and lightning prediction maps' },
    cells: { title: 'Storm Cells', desc: 'TITAN/SCIT segmented convective clusters & velocity vectors' },
    forecast: { title: 'Forecast Matrix', desc: '2-Layer ConvLSTM multi-horizon prediction grid (15–180 min)' },
    alerts: { title: 'Alerts', desc: 'Common Alerting Protocol (CAP) automated severe storm warnings' },
    replay: { title: 'Historical Replay', desc: 'Archive event replay & ground-truth validation' },
    explainability: { title: 'Explainability', desc: 'SHAP feature attribution breakdown & atmospheric drivers' },
    model: { title: 'Model Performance', desc: 'ConvLSTM architecture specs & validation benchmark metrics' },
    datasources: { title: 'Data Sources', desc: 'Multimodal observation feed provenance & sensor quality' }
  };

  const currentMeta = pageDescriptions[activeTab] || pageDescriptions.live;

  return (
    <header className="bg-[#F8FCFE] border-b border-[#D0E3F0] px-5 py-2.5 flex items-center justify-between sticky top-0 z-30 font-sans shadow-2xs">
      {/* Page Title & Contextual Subtitle */}
      <div>
        <h1 className="text-sm font-bold text-[#0F2942] tracking-tight font-mono flex items-center space-x-2">
          <span>{currentMeta.title}</span>
        </h1>
        <p className="text-[11px] text-[#47637E] font-medium tracking-tight">
          {currentMeta.desc}
        </p>
      </div>

      {/* Right Compact System State & Time */}
      <div className="flex items-center space-x-3">
        {/* Live Indicator */}
        <div className="flex items-center space-x-2 bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] px-2.5 py-1 rounded-full text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse inline-block" />
          <span>LIVE ●</span>
        </div>

        {/* UTC Clock */}
        <div className="hidden sm:flex items-center space-x-1.5 text-xs text-[#47637E] font-mono bg-[#EEF6FB] px-2.5 py-1 rounded-md border border-[#D0E3F0]">
          <Clock className="w-3.5 h-3.5 text-[#0284C7]" />
          <span>{utcTime}</span>
        </div>

        {/* Data Provenance Log Button */}
        {onOpenProvenance && (
          <button
            onClick={onOpenProvenance}
            className="text-xs font-mono text-[#0F2942] hover:text-[#0284C7] bg-[#EEF6FB] hover:bg-[#E5F0F7] px-2.5 py-1 rounded-md border border-[#D0E3F0] transition-colors flex items-center gap-1.5"
            title="View Multimodal Data Provenance Log"
          >
            <Database className="w-3.5 h-3.5 text-[#0284C7]" />
            <span>Data Log</span>
          </button>
        )}
      </div>
    </header>
  );
}
