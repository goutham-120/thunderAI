import React from 'react';
import { 
  LayoutDashboard, 
  Map, 
  Flame, 
  TrendingUp, 
  ShieldAlert, 
  RotateCcw, 
  HelpCircle, 
  Cpu, 
  Database 
} from 'lucide-react';

export default function LeftSidebar({
  activeTab,
  setActiveTab
}) {
  const navSections = [
    {
      title: 'OPERATIONS',
      items: [
        { id: 'live', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'spatial', label: 'Spatial Nowcast', icon: Map },
        { id: 'cells', label: 'Storm Cells', icon: Flame },
        { id: 'alerts', label: 'CAP Alerts', icon: ShieldAlert },
      ]
    },
    {
      title: 'ANALYSIS & AI',
      items: [
        { id: 'forecast', label: 'Forecast Matrix', icon: TrendingUp },
        { id: 'replay', label: 'Historical Replay', icon: RotateCcw },
        { id: 'explainability', label: 'Explainability (XAI)', icon: HelpCircle },
        { id: 'model', label: 'Model Performance', icon: Cpu },
      ]
    },
    {
      title: 'DATA & INFRASTRUCTURE',
      items: [
        { id: 'datasources', label: 'Data Sources', icon: Database }
      ]
    }
  ];

  return (
    <aside className="w-56 bg-[#E5F0F7] border-r border-[#D0E3F0] flex flex-col justify-between h-[calc(100vh-53px)] select-none font-sans shrink-0 sticky top-[53px]">
      
      {/* Top Header & Navigation */}
      <div className="p-3.5 space-y-3.5 overflow-y-auto">
        
        {/* VAJRA AI Branding */}
        <div className="border-b border-[#D0E3F0] pb-3 px-1">
          <h2 className="text-sm font-bold text-[#0F2942] font-mono tracking-tight flex items-center space-x-1.5">
            <span className="text-base text-[#0284C7]">VAJRA</span>
            <span className="text-xs font-sans text-[#0369A1] font-semibold">AI</span>
          </h2>
          <p className="text-[11px] text-[#47637E] font-medium tracking-tight mt-0.5">
            Thunderstorm & Lightning Nowcasting
          </p>
        </div>

        {/* Categorized Navigation List */}
        <div className="space-y-3">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-2 text-[9px] font-mono font-bold text-[#64829E] uppercase tracking-wider">
                {section.title}
              </div>
              <nav className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                        isActive
                          ? 'bg-[#D4E6F5] text-[#0284C7] font-semibold border-l-2 border-[#0284C7] shadow-2xs'
                          : 'text-[#47637E] hover:text-[#0F2942] hover:bg-[#DCEDF8]/60 font-normal'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#0284C7]' : 'text-[#7B96B0]'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>

      {/* Footer info */}
      <div className="p-3 border-t border-[#D0E3F0] text-[10px] text-[#64829E] font-mono text-center">
        Operational Workstation • v1.0
      </div>
    </aside>
  );
}
