import React from 'react';
import { 
  FileText, 
  Printer, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Award,
  RefreshCw
} from 'lucide-react';

export default function ReportHeader({ 
  reportData, 
  systemStatus, 
  onRefresh, 
  isRefreshing 
}) {
  const auditTimestamp = reportData?.audit_timestamp || new Date().toISOString();
  const statusStr = reportData?.status || 'MATHEMATICALLY_VERIFIED_NUMERICAL_AUDIT';
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl shadow-xs space-y-3 font-sans text-[#12324E]">
      
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-[#EEF6FB] border border-[#D0E3F0] text-[#0284C7] shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-bold text-[#0F2942] tracking-tight font-mono uppercase">
                SCIENTIFIC MODEL VALIDATION & PERFORMANCE AUDIT REPORT
              </h1>

              {/* Validation Status Badge */}
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-[#D97706]" />
                PARTIALLY VALIDATED (SINGLE-DATE AUDIT)
              </span>

              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#15803D]" />
                MATHEMATICALLY AUDITED
              </span>
            </div>

            <p className="text-xs text-[#47637E] font-sans mt-0.5">
              SIH 2026 Atmospheric Nowcasting Model Architecture, Empirical Validation Metrics, and Data Provenance Audit
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#EEF6FB] border border-[#D0E3F0] text-[#0284C7] hover:bg-[#0284C7] hover:text-white transition-all text-xs font-mono font-bold shadow-2xs disabled:opacity-50 cursor-pointer"
            title="Refresh validation metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Audit</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#0284C7] text-white font-mono text-xs font-bold hover:bg-[#0369A1] transition-all shadow-2xs cursor-pointer"
            title="Export / Print PDF Technical Validation Report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report (PDF)</span>
          </button>
        </div>

      </div>

      {/* Audit Metadata Summary Bar */}
      <div className="flex flex-wrap items-center justify-between text-xs font-mono text-[#47637E] pt-2.5 border-t border-[#D0E3F0] gap-2">
        <div className="flex items-center space-x-4">
          <div>
            <span className="text-[#0F2942] font-semibold">Audit Timestamp:</span>{' '}
            {new Date(auditTimestamp).toUTCString()}
          </div>
          <div>
            <span className="text-[#0F2942] font-semibold">Evaluation Engine:</span> Scikit-Learn / PyTorch Audit Pipeline
          </div>
        </div>

        <div className="text-[11px] text-[#47637E]">
          MoES / IMD SIH Problem Statement 26072
        </div>
      </div>

    </div>
  );
}
