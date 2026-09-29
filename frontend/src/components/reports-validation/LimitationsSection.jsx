import React from 'react';
import { 
  AlertOctagon, 
  CheckSquare, 
  HelpCircle, 
  ShieldAlert, 
  TrendingUp, 
  FileCheck,
  Zap,
  Info
} from 'lucide-react';

export default function LimitationsSection({ reportData }) {
  const limitations = reportData?.audit_conclusions_and_limitations || {};
  
  return (
    <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl shadow-xs space-y-4 font-sans text-[#12324E]">
      
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-[#D0E3F0] pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-[#EEF6FB] border border-[#D0E3F0] text-[#0284C7]">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold font-mono text-[#0F2942] uppercase tracking-tight">
              4. SCIENTIFIC AUDIT LIMITATIONS & OPERATIONAL DISCLAIMERS
            </h2>
            <p className="text-[11px] text-[#47637E] font-sans">
              Honest disclosure of evaluation scope, proxy ground truth limitations, and required validation steps
            </p>
          </div>
        </div>

        <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5 text-[#D97706]" />
          SINGLE-DATE AUDIT SCOPE
        </span>
      </div>

      {/* Disclaimers & Limitations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-sans">
        
        {/* Card 1: Single Date Dataset Split */}
        <div className="bg-white border border-[#D0E3F0] p-3 rounded-lg space-y-2 shadow-2xs">
          <div className="flex items-center space-x-2 text-[#B45309] font-mono font-bold text-[11px] uppercase">
            <Info className="w-4 h-4 text-[#D97706] shrink-0" />
            <span>Single-Date Dataset Limitation</span>
          </div>
          <p className="text-[11px] text-[#47637E] leading-relaxed">
            The numerical evaluation metrics in this audit report were computed on a single-date convective storm sequence (Sept 28, 2026; scans 0-5 train, scans 6-8 validation). While mathematically rigorous for this test split, performance may vary across different seasonal regimes.
          </p>
        </div>

        {/* Card 2: Ground Truth Proxy */}
        <div className="bg-white border border-[#D0E3F0] p-3 rounded-lg space-y-2 shadow-2xs">
          <div className="flex items-center space-x-2 text-[#0284C7] font-mono font-bold text-[11px] uppercase">
            <FileCheck className="w-4 h-4 text-[#0284C7] shrink-0" />
            <span>Proxy Ground Truth Labels</span>
          </div>
          <p className="text-[11px] text-[#47637E] leading-relaxed">
            Target ground-truth labels for convective cell detection were derived via composite reflectivity thresholding (&gt;35 dBZ). Direct point-observation calibration using ground IMD rain-gauge networks is required for official operational certification.
          </p>
        </div>

        {/* Card 3: Inference Engine Fallback */}
        <div className="bg-white border border-[#D0E3F0] p-3 rounded-lg space-y-2 shadow-2xs">
          <div className="flex items-center space-x-2 text-[#15803D] font-mono font-bold text-[11px] uppercase">
            <Zap className="w-4 h-4 text-[#15803D] shrink-0" />
            <span>Fallback Engine Disclosure</span>
          </div>
          <p className="text-[11px] text-[#47637E] leading-relaxed">
            When PyTorch deep learning weights are uninitialized or running in fallback demo mode, the system smoothly defaults to Heuristic Optical Flow / Semi-Lagrangian advection to preserve operational payload uptime without misrepresenting model capability.
          </p>
        </div>

      </div>

      {/* Required Validation Steps for Operational Certification */}
      <div className="bg-white border border-[#D0E3F0] p-3.5 rounded-lg space-y-2.5 shadow-2xs font-sans">
        <h3 className="text-xs font-bold text-[#0F2942] font-mono uppercase tracking-wider flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-[#0284C7]" />
          Required Next Steps for Full IMD/MOSDAC Operational Certification
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
          <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-2.5 rounded-lg flex items-start space-x-2">
            <span className="font-mono font-bold text-[#0284C7] shrink-0">01.</span>
            <div className="text-[#47637E]">
              <strong className="text-[#0F2942] block font-sans">Multi-Date MOSDAC Ingestion</strong>
              Ingest multi-season INSAT-3DS archive cases covering pre-monsoon, monsoonal, and post-monsoon events.
            </div>
          </div>

          <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-2.5 rounded-lg flex items-start space-x-2">
            <span className="font-mono font-bold text-[#0284C7] shrink-0">02.</span>
            <div className="text-[#47637E]">
              <strong className="text-[#0F2942] block font-sans">AWS Gauge Station Integration</strong>
              Perform point-to-grid calibration using real-time IMD Automatic Weather Station (AWS) precipitation data.
            </div>
          </div>

          <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-2.5 rounded-lg flex items-start space-x-2">
            <span className="font-mono font-bold text-[#0284C7] shrink-0">03.</span>
            <div className="text-[#47637E]">
              <strong className="text-[#0F2942] block font-sans">Distributed GPU Fine-Tuning</strong>
              Execute multi-GPU ConvLSTM training on extended spatiotemporal sequences across all Indian subcontinent sub-regions.
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
