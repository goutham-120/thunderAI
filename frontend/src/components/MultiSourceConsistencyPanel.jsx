import React from 'react';
import { 
  Layers, 
  Radio, 
  Zap, 
  Satellite, 
  Wind, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  Info,
  Crosshair
} from 'lucide-react';

export default function MultiSourceConsistencyPanel({
  consistencyData,
  selectedLocation,
  selectedCell,
  onFocusTarget
}) {
  if (!consistencyData) {
    return (
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl shadow-xs font-sans text-xs text-[#64829E] animate-pulse">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-[#0284C7] animate-spin" />
          <span className="font-mono font-medium">Analyzing available observations...</span>
        </div>
      </div>
    );
  }

  const {
    overall_status,
    overall_status_label,
    overall_summary,
    has_divergence,
    sources = [],
    selected_location
  } = consistencyData;

  const getStatusBadge = (statusStr) => {
    switch (statusStr) {
      case 'Strong agreement':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
            Strong agreement
          </span>
        );
      case 'Moderate agreement':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
            Moderate agreement
          </span>
        );
      case 'Weak agreement':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
            Weak agreement
          </span>
        );
      case 'Divergence detected':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-[#FEF2F2] text-[#B91C1C] border border-[#FCA5A5] flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-[#DC2626]" />
            Divergence
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]">
            Insufficient data
          </span>
        );
    }
  };

  const getSourceIcon = (sourceId) => {
    switch (sourceId) {
      case 'radar':
        return <Radio className="w-3.5 h-3.5 text-[#DC2626]" />;
      case 'lightning':
        return <Zap className="w-3.5 h-3.5 text-[#D97706]" />;
      case 'satellite':
        return <Satellite className="w-3.5 h-3.5 text-[#4F46E5]" />;
      case 'nwp':
        return <Wind className="w-3.5 h-3.5 text-[#0284C7]" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-[#0284C7]" />;
    }
  };

  const getOverallHeaderStyle = () => {
    if (has_divergence || overall_status === 'DIVERGENCE_DETECTED') {
      return {
        bg: 'bg-[#FEF2F2] border-[#FEE2E2] text-[#991B1B]',
        badgeBg: 'bg-[#DC2626] text-white',
        icon: <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
      };
    } else if (overall_status === 'STRONG_AGREEMENT') {
      return {
        bg: 'bg-[#F0FDF4] border-[#DCFCE7] text-[#166534]',
        badgeBg: 'bg-[#16A34A] text-white',
        icon: <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
      };
    } else if (overall_status === 'MODERATE_AGREEMENT') {
      return {
        bg: 'bg-[#F0F9FF] border-[#E0F2FE] text-[#0369A1]',
        badgeBg: 'bg-[#0284C7] text-white',
        icon: <CheckCircle2 className="w-4 h-4 text-[#0284C7] shrink-0" />
      };
    } else if (overall_status === 'WEAK_AGREEMENT') {
      return {
        bg: 'bg-[#FFFBEB] border-[#FEF3C7] text-[#92400E]',
        badgeBg: 'bg-[#D97706] text-white',
        icon: <Info className="w-4 h-4 text-[#D97706] shrink-0" />
      };
    } else {
      return {
        bg: 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569]',
        badgeBg: 'bg-[#64748B] text-white',
        icon: <AlertCircle className="w-4 h-4 text-[#64748B] shrink-0" />
      };
    }
  };

  const headerStyle = getOverallHeaderStyle();

  return (
    <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl shadow-xs font-sans space-y-3.5 select-none">
      
      {/* Title Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#E2EAF0] pb-2.5 gap-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-[#EEF6FB] border border-[#D0E3F0] text-[#0284C7]">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#0F2942] uppercase tracking-wider font-mono flex items-center gap-2">
              Multi-Source Consistency Analysis
              <span className="text-[9px] px-2 py-0.5 rounded bg-[#EEF6FB] text-[#0284C7] border border-[#D0E3F0] font-bold">
                REAL OBSERVATION FUSION
              </span>
            </h3>
            <p className="text-[10px] text-[#47637E] font-medium">
              Cross-comparing Radar, Satellite, Lightning, & NWP signal alignment for{' '}
              <strong className="font-mono text-[#0F2942]">{selected_location || selectedLocation?.name || 'Selected Target'}</strong>
            </p>
          </div>
        </div>

        {onFocusTarget && (
          <button
            onClick={onFocusTarget}
            className="text-[10px] text-[#0284C7] font-semibold hover:underline flex items-center gap-1 font-mono bg-[#EEF6FB] px-2.5 py-1 rounded-md border border-[#D0E3F0]"
            title="Focus spatial map on active target area"
          >
            <Crosshair className="w-3 h-3 text-[#0284C7]" />
            <span>Focus Map</span>
          </button>
        )}
      </div>

      {/* Sources Comparison Grid */}
      <div className="space-y-2 font-mono text-xs">
        {sources.length > 0 ? (
          sources.map((src) => {
            const barFillColor = 
              src.signal_level === 'STRONG' ? 'bg-[#DC2626]' :
              src.signal_level === 'MODERATE' ? 'bg-[#0284C7]' :
              src.signal_level === 'WEAK' ? 'bg-[#D97706]' : 'bg-[#94A3B8]';

            return (
              <div 
                key={src.source_id}
                className="p-2.5 rounded-lg bg-[#EEF6FB]/70 border border-[#D0E3F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors hover:bg-[#E5F0F7]"
              >
                {/* Source Name & Icon */}
                <div className="flex items-center space-x-2.5 min-w-[200px]">
                  <div className="p-1 rounded bg-white border border-[#D0E3F0] shrink-0">
                    {getSourceIcon(src.source_id)}
                  </div>
                  <div>
                    <span className="font-bold text-xs text-[#0F2942] font-sans block leading-tight">
                      {src.name}
                    </span>
                    <span className="text-[9px] text-[#64829E] block truncate max-w-[170px]" title={src.provenance}>
                      {src.provenance}
                    </span>
                  </div>
                </div>

                {/* Signal Bar & Raw Value */}
                <div className="flex-1 px-2 flex items-center space-x-3">
                  <div className="flex-1 bg-[#D0E3F0] h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${barFillColor}`}
                      style={{ width: `${src.is_available ? src.bar_percent : 0}%` }}
                    />
                  </div>
                  <span className="font-bold text-xs text-[#0F2942] w-28 text-right shrink-0">
                    {src.raw_signal}
                  </span>
                </div>

                {/* Status Badge & Timestamp */}
                <div className="flex items-center space-x-3 justify-between sm:justify-end shrink-0 pt-1 sm:pt-0 border-t sm:border-0 border-[#D0E3F0]">
                  <span className="text-[9px] text-[#64829E] flex items-center gap-1 font-mono">
                    <Clock className="w-2.5 h-2.5 text-[#64829E]" />
                    {src.timestamp}
                  </span>
                  {getStatusBadge(src.consistency_status)}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-3 text-center text-[#64829E] text-xs italic">
            Insufficient data for cross-source comparison.
          </div>
        )}
      </div>

      {/* Overall Assessment Banner */}
      <div className={`p-3 rounded-lg border flex items-start space-x-2.5 text-xs font-sans ${headerStyle.bg}`}>
        {headerStyle.icon}
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider font-mono ${headerStyle.badgeBg}`}>
              {overall_status_label}
            </span>
            {selectedCell && (
              <span className="text-[10px] font-mono text-[#0F2942] font-bold">
                Cell: {selectedCell.cell_id}
              </span>
            )}
          </div>
          <p className="text-xs font-medium leading-relaxed">
            {overall_summary}
          </p>
        </div>
      </div>
    </div>
  );
}
