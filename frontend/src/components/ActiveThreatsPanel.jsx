import React from 'react';
import { Activity, ShieldAlert, Zap, Compass, ChevronRight } from 'lucide-react';

export default function ActiveThreatsPanel({ forecastData, selectedCell, onSelectCell, onNavigateTab }) {
  const cells = forecastData?.storm_cells || [];
  const capAlerts = forecastData?.cap_alerts || [];

  return (
    <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-lg shadow-2xs font-sans space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#D0E3F0] pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-md bg-[#FEF2F2] text-[#DC2626] border border-[#FEE2E2]">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#12324E] uppercase tracking-wider font-sora flex items-center gap-2">
              Active Threat Sectors & Cells
              <span className="text-[9px] px-2 py-0.5 rounded bg-[#DC2626] text-white font-bold font-mono">
                {cells.length} TRACKED CELLS
              </span>
            </h3>
            <p className="text-[10px] text-[#5E82A6] font-medium font-sans">
              Select a cell to inspect and center map on convective core
            </p>
          </div>
        </div>

        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('cells')}
            className="text-xs text-[#0284C7] font-semibold hover:underline flex items-center gap-1 font-sans"
          >
            <span>View All Cells</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Grid of Active Cells & CAP Warnings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 font-mono">
        {cells.length > 0 ? (
          cells.map((cell) => {
            const isSelected = selectedCell?.cell_id === cell.cell_id;
            return (
              <div
                key={cell.cell_id}
                onClick={() => onSelectCell && onSelectCell(cell)}
                className={`p-3 rounded-md border cursor-pointer transition-all space-y-2 ${
                  isSelected
                    ? 'bg-[#E0F2FE] border-[#0284C7] shadow-2xs ring-1 ring-[#0284C7]'
                    : 'bg-[#EEF6FB] border-[#D0E3F0] hover:bg-[#E5F0F7]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0284C7] font-sans">{cell.cell_id}</span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#FEF2F2] text-[#991B1B] border border-[#FEE2E2]">
                    {cell.lifecycle_state || 'MATURE'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[9px] text-[#5E82A6] block font-sans">Core Reflectivity</span>
                    <span className="font-bold text-[#DC2626]">{cell.max_dbz} dBZ</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-[#5E82A6] block font-sans">Flash Rate</span>
                    <span className="font-bold text-[#D97706]">{cell.lightning_flash_rate_min} /min</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#5E82A6] pt-1.5 border-t border-[#D0E3F0]">
                  <span className="flex items-center gap-1 font-sans">
                    <Compass className="w-3 h-3 text-[#0284C7]" />
                    {cell.movement?.direction_compass} @ {cell.movement?.speed_kmh} km/h
                  </span>
                  {cell.is_lightning_jump && (
                    <span className="text-[8px] font-bold text-[#D97706] bg-[#FFFBEB] px-1.5 py-0.2 rounded border border-[#FEF3C7] flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5 text-[#D97706]" />
                      JUMP
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-4 text-center text-[#5E82A6] text-xs italic col-span-3 font-sans">
            No active severe storm cells detected in selected area footprint.
          </div>
        )}
      </div>

      {/* CAP Warning Strip if active alerts exist */}
      {capAlerts.length > 0 && (
        <div className="bg-[#FFFBEB] p-2.5 rounded-md border border-[#FEF3C7] flex items-center justify-between text-xs font-sans">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-[#D97706] shrink-0" />
            <span className="font-bold text-[#92400E] truncate max-w-lg">
              {capAlerts[0].headline || 'SEVERE CONVECTIVE STORM WARNING ISSUED'}
            </span>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('alerts')}
              className="text-[10px] font-bold text-[#D97706] hover:underline shrink-0 font-mono"
            >
              View CAP Warning →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
