import React from 'react';
import { 
  LayoutDashboard, 
  Map, 
  CloudLightning,
  ShieldAlert, 
  TrendingUp,
  RotateCcw,
  HelpCircle,
  Cpu, 
  FileText,
  Database,
  ChevronLeft,
  ChevronRight,
  Radio
} from 'lucide-react';

export default function LeftSidebar({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed
}) {
  const navSections = [
    {
      title: 'OPERATIONS',
      items: [
        { id: 'live', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'spatial', label: 'Spatial Nowcast', icon: Map },
        { id: 'cells', label: 'Storm Cells', icon: CloudLightning },
        { id: 'storm-tracking', label: 'Storm Tracking', icon: Radio },
        { id: 'alerts', label: 'CAP Alerts', icon: ShieldAlert },
      ]
    },
    {
      title: 'ANALYSIS & FORECASTING',
      items: [
        { id: 'forecast', label: 'Forecast Matrix', icon: TrendingUp },
        { id: 'replay', label: 'Historical Replay', icon: RotateCcw },
        { id: 'explainability', label: 'Explainability (XAI)', icon: HelpCircle },
        { id: 'model', label: 'Model Performance', icon: Cpu },
        { id: 'reports', label: 'Reports & Validation', icon: FileText },
      ]
    },
    {
      title: 'DATA',
      items: [
        { id: 'datasources', label: 'Data Sources', icon: Database }
      ]
    }
  ];

  return (
    <aside
      className={`bg-[#F8FCFE] border-r border-[#D0E3F0] flex flex-col justify-between h-[calc(100vh-53px)] select-none font-sans shrink-0 sticky top-[53px] transition-all duration-300 z-20 ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Top Branding & Navigation List */}
      <div className="p-3 space-y-3 overflow-y-auto">

        {/* VAJRA Workstation Branding */}
        <div className="border-b border-[#D0E3F0] pb-2.5 px-1 flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h2 className="text-sm font-bold text-[#12324E] font-sora tracking-tight flex items-center space-x-1.5">
                <span className="text-base text-[#0284C7]">VAJRA</span>
                <span className="text-xs font-sans text-[#5E82A6] font-semibold">WORKSTATION</span>
              </h2>
              <p className="text-[10px] text-[#5E82A6] font-medium tracking-tight mt-0.5 uppercase font-sans">
                Thunderstorm & Lightning Nowcasting
              </p>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md hover:bg-[#EEF6FB] text-[#5E82A6] hover:text-[#12324E] transition-colors ml-auto"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Categorized Navigation Links */}
        <div className="space-y-3">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              {!isCollapsed && (
                <div className="px-2 text-[9px] font-mono font-bold text-[#5E82A6] uppercase tracking-wider">
                  {section.title}
                </div>
              )}
              <nav className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      title={isCollapsed ? item.label : undefined}
                      className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0 py-2' : 'space-x-2.5 px-2.5 py-1.5'} rounded-md text-xs font-sans transition-all ${
                        isActive
                          ? 'bg-[#0284C7] text-white font-bold shadow-2xs'
                          : 'text-[#12324E] hover:text-[#0284C7] hover:bg-[#EEF6FB] font-medium'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#5E82A6]'}`} />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>

      {/* Footer info */}
      {!isCollapsed && (
        <div className="p-3 border-t border-[#D0E3F0] text-[10px] text-[#5E82A6] font-mono text-center bg-[#EEF6FB]/50">
          VAJRA Workstation v1.0.0 • OPERATIONAL
        </div>
      )}
    </aside>
  );
}
