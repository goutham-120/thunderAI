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
      className={`bg-[#0B3552] border-r border-[#0C4F78] flex flex-col justify-between h-[calc(100vh-53px)] select-none font-sans shrink-0 sticky top-[53px] transition-all duration-300 z-20 ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Top Branding & Navigation List */}
      <div className="p-3 space-y-3 overflow-y-auto">

        {/* VAJRA Workstation Branding */}
        <div className="border-b border-[#0C4F78] pb-2.5 px-1 flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center space-x-1.5">
                <span className="text-base text-[#19BCE8]">VAJRA</span>
                <span className="text-xs text-[#90CAF9] font-semibold">WORKSTATION</span>
              </h2>
              <p className="text-[10px] text-[#90CAF9]/80 font-medium tracking-tight mt-0.5 uppercase">
                Thunderstorm & Lightning Nowcasting
              </p>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md hover:bg-[#0C4F78] text-[#90CAF9] hover:text-white transition-colors ml-auto"
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
                <div className="px-2 text-[9px] font-mono font-bold text-[#19BCE8] uppercase tracking-wider">
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
                      className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0 py-2' : 'space-x-2.5 px-2.5 py-2'} rounded-md text-xs font-sans transition-all ${
                        isActive
                          ? 'bg-[#19BCE8] text-[#0E2C45] font-bold shadow-md'
                          : 'text-[#E5EAF0] hover:text-white hover:bg-[#0C4F78] font-medium'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#0E2C45]' : 'text-[#90CAF9]'}`} />
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
        <div className="p-3 border-t border-[#0C4F78] text-[10px] text-[#90CAF9] font-mono text-center bg-[#0E2C45]/80">
          VAJRA Workstation v1.0.0 • OPERATIONAL
        </div>
      )}
    </aside>
  );
}
