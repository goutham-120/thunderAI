import React from 'react';
import { 
  CloudLightning, 
  Radio, 
  Satellite, 
  Zap, 
  Activity, 
  Layers, 
  History, 
  BarChart3, 
  AlertTriangle,
  Compass,
  CheckCircle2
} from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab,
  activeAlertCount,
  selectedRegion,
  setSelectedRegion
}) {
  const tabs = [
    { id: 'live', label: 'Live View' },
    { id: 'forecast', label: 'Forecast' },
    { id: 'tracks', label: 'Storm Tracks' },
    { id: 'replay', label: 'Historical Replay' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'alerts', label: 'Alerts', badge: activeAlertCount }
  ];

  return (
    <header className="bg-[#090D1A] border-b border-slate-800 px-4 py-2.5 flex items-center justify-between shadow-md z-30 sticky top-0">
      {/* Brand Identity */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] ring-1 ring-cyan-400/40">
          <CloudLightning className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold text-white tracking-wider flex items-center gap-1.5 font-sans">
              VAJRA AI
            </h1>
            <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
              v1.0
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium tracking-tight">
            Multimodal AI for Thunderstorm & Lightning Nowcasting
          </p>
        </div>
      </div>

      {/* Top Navigation Tabs */}
      <nav className="flex items-center space-x-1 bg-[#060913] p-1 rounded-xl border border-slate-800">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.5)] border border-blue-400/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="bg-red-500 text-white font-mono text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Right Time & Live Status Indicator */}
      <div className="flex items-center space-x-3">
        <div className="hidden xl:flex items-center space-x-2 text-xs font-mono text-slate-300 bg-[#060913] px-3 py-1.5 rounded-xl border border-slate-800">
          <span>16 JUL 2024</span>
          <span className="text-cyan-400 font-bold">15:40 IST</span>
        </div>

        <div className="flex items-center space-x-1.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-bold font-mono shadow-[0_0_12px_rgba(16,185,129,0.2)]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"></span>
          <span>LIVE</span>
        </div>
      </div>
    </header>
  );
}
