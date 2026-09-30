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
  Radio,
  FlaskConical,
  ShieldCheck,
  LogOut,
  User,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LeftSidebar({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen
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

  // Only the internal admin portal tab is restricted to ADMIN
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

  const navSections = rawNavSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => isAllowed(item.id))
    }))
    .filter(section => section.items.length > 0);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  const currentUser = user || { full_name: 'VAJRA User', role: 'USER', email: 'user@vajra.gov.in' };

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden transition-opacity"
          onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        aria-label="Application Navigation Sidebar"
        className={`bg-[#0B3552] border-r border-[#0C4F78] flex flex-col justify-between h-[calc(100vh-53px)] select-none font-sans shrink-0 sticky top-[53px] transition-all duration-300 z-30 ${
          isMobileOpen
            ? 'fixed inset-y-0 left-0 top-[53px] w-64 translate-x-0 shadow-2xl'
            : isCollapsed
            ? 'w-16'
            : 'w-60'
        }`}
      >
        {/* Navigation Section Container with Independent Scrolling */}
        <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">

          {/* VAJRA Workstation Branding & Mobile Dismiss Button */}
          <div className="border-b border-[#0C4F78] pb-2.5 px-1 flex items-center justify-between">
            {(!isCollapsed || isMobileOpen) && (
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

            {/* Desktop Collapse Button */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex p-1 rounded-md hover:bg-[#0C4F78] text-[#90CAF9] hover:text-white transition-colors ml-auto cursor-pointer"
              aria-label={isCollapsed ? 'Open navigation' : 'Close navigation'}
              title={isCollapsed ? 'Open navigation' : 'Close navigation'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Mobile Close Button */}
            {isMobileOpen && (
              <button
                onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
                className="md:hidden p-1 rounded-md hover:bg-[#0C4F78] text-[#90CAF9] hover:text-white transition-colors ml-auto"
                aria-label="Close navigation"
                title="Close navigation"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Categorized Navigation Links */}
          <div className="space-y-3">
            {navSections.map((section) => (
              <div key={section.title} className="space-y-1">
                {(!isCollapsed || isMobileOpen) && (
                  <div className="px-2 text-[9px] font-mono font-bold text-[#19BCE8] uppercase tracking-wider">
                    {section.title}
                  </div>
                )}
                <nav className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const isIconOnly = isCollapsed && !isMobileOpen;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleTabClick(item.id)}
                        title={isIconOnly ? item.label : undefined}
                        className={`w-full flex items-center ${isIconOnly ? 'justify-center px-0 py-2' : 'space-x-2.5 px-2.5 py-2'} rounded-md text-xs font-sans transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#19BCE8] text-[#0E2C45] font-bold shadow-md'
                            : 'text-[#E5EAF0] hover:text-white hover:bg-[#0C4F78] font-medium'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#0E2C45]' : 'text-[#90CAF9]'}`} />
                        {(!isCollapsed || isMobileOpen) && <span className="truncate">{item.label}</span>}
                      </button>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>

          {/* User Account Profile & Logout (Below Data Sources) */}
          <div className="pt-3 border-t border-[#0C4F78] mt-2">
            {(!isCollapsed || isMobileOpen) ? (
              <div className="bg-[#0E2C45] border border-[#0C4F78] rounded-xl p-2.5 space-y-2.5 shadow-md">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#19BCE8] text-[#0E2C45] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm font-mono">
                    {currentUser.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate font-sans" title={currentUser.full_name}>
                      {currentUser.full_name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#19BCE8]/20 text-[#19BCE8] border border-[#19BCE8]/30 uppercase">
                        {getRoleLabel(currentUser.role)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-xs font-sans text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 transition-colors font-semibold shadow-xs cursor-pointer"
                  title={`Sign out of ${currentUser.email || 'account'}`}
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2 pt-1">
                <div
                  className="w-8 h-8 rounded-lg bg-[#19BCE8] text-[#0E2C45] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm font-mono cursor-default"
                  title={`${currentUser.full_name} (${getRoleLabel(currentUser.role)})`}
                >
                  {currentUser.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-900/50 transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        {(!isCollapsed || isMobileOpen) && (
          <div className="p-3 border-t border-[#0C4F78] text-[10px] text-[#90CAF9] font-mono text-center bg-[#0E2C45]/80 shrink-0">
            VAJRA Workstation v1.0.0 • OPERATIONAL
          </div>
        )}
      </aside>
    </>
  );
}
