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
  Database,
  ChevronLeft,
  ChevronRight,
  Radio,
  FlaskConical,
  ShieldCheck,
  LogOut,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LeftSidebar({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed
}) {
  const { user, logout } = useAuth();
  const role = user?.role || 'USER';

  const getRoleLabel = (r) => {
    switch (r) {
      case 'ADMIN':
        return 'Chief Admin';
      case 'WEATHER_FORECASTER':
        return 'Weather Forecaster';
      case 'ELECTRICAL_INFRASTRUCTURE':
        return 'Electrical & Infra';
      case 'USER':
        return 'Standard User';
      default:
        return r;
    }
  };

  // Navigation permissions:
  // All meteorological and operational tabs are available for all authenticated users
  // Only the 'admin' tab is restricted exclusively to ADMIN
  const isAllowed = (id) => {
    if (id === 'admin') return role === 'ADMIN';
    return true;
  };

  const rawNavSections = [
    ...(role === 'ADMIN' ? [{
      title: 'ADMINISTRATION',
      items: [
        { id: 'admin', label: 'Admin & Approvals', icon: ShieldCheck }
      ]
    }] : []),
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
        { id: 'whatif', label: 'What-If Scenario', icon: FlaskConical },
      ]
    },
    {
      title: 'DATA',
      items: [
        { id: 'datasources', label: 'Data Sources', icon: Database }
      ]
    }
  ];

  const navSections = rawNavSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => isAllowed(item.id))
    }))
    .filter(section => section.items.length > 0);

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

        {/* User Account Profile & Logout (Below Data Sources) */}
        {user && (
          <div className="pt-3 border-t border-[#D0E3F0] mt-2">
            {!isCollapsed ? (
              <div className="bg-[#EEF6FB] border border-[#D0E3F0] rounded-xl p-2.5 space-y-2.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#0284C7] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs font-mono">
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-[#0F2942] truncate font-sans" title={user.full_name}>
                      {user.full_name || 'VAJRA User'}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#0284C7]/15 text-[#0284C7] border border-[#0284C7]/20 uppercase">
                        {getRoleLabel(user.role)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-xs font-sans text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 transition-colors font-semibold shadow-2xs cursor-pointer"
                  title={`Sign out of ${user.email}`}
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2 pt-1">
                <div
                  className="w-8 h-8 rounded-lg bg-[#0284C7] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs font-mono cursor-default"
                  title={`${user.full_name} (${getRoleLabel(user.role)})`}
                >
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
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
