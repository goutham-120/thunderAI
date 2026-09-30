import React from 'react';
import { 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Database, 
  Code,
  HardDrive,
  Layers
} from 'lucide-react';

export default function ModelStatusSection({ systemStatus, reportData }) {
  const aiModel = systemStatus?.ai_model || {};
  const isTorchAvailable = aiModel.torch_available !== undefined ? aiModel.torch_available : true;
  const inferenceMode = aiModel.inference_mode || 'HEURISTIC_FALLBACK';
  const modelStatus = aiModel.model_status || 'TRAINED';
  const backbone = aiModel.backbone || '2-Layer ConvLSTM Encoder-Decoder (0-180 min)';

  const isConvLstmRunning = inferenceMode === 'CONVLSTM' && isTorchAvailable;
  const isFallbackActive = inferenceMode === 'HEURISTIC_FALLBACK';

  return (
    <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl shadow-xs space-y-4 font-sans text-[#12324E]">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#D0E3F0] pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-[#EEF6FB] border border-[#D0E3F0] text-[#0284C7]">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold font-mono text-[#0F2942] uppercase tracking-tight">
              1. MODEL ARCHITECTURE & INFERENCE RUNTIME AUDIT
            </h2>
            <p className="text-[11px] text-[#47637E] font-sans">
              Neural network framework availability, checkpoint verification, and active inference engine
            </p>
          </div>
        </div>

        {/* Runtime Engine Badge */}
        <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border flex items-center gap-1 ${
          isConvLstmRunning
            ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]'
            : 'bg-[#FFEDD5] text-[#C2410C] border-[#FED7AA]'
        }`}>
          {isConvLstmRunning ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-[#15803D]" />
              CONVLSTM NEURAL ENGINE ACTIVE
            </>
          ) : (
            <>
              <AlertTriangle className="w-3 h-3 text-[#C2410C]" />
              HEURISTIC ADVECTION FALLBACK
            </>
          )}
        </span>
      </div>

      {/* Fallback Disclaimer Banner if active */}
      {isFallbackActive && (
        <div className="bg-[#FFFBEB] border border-[#FDE68A] p-3 rounded-lg text-xs font-sans text-[#92400E] space-y-1">
          <div className="font-mono font-bold uppercase flex items-center gap-1.5 text-[#B45309]">
            <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />
            INFERENCE ENGINE NOTICE: HEURISTIC ADVECTION FALLBACK ACTIVE
          </div>
          <p className="text-[11px] text-[#B45309] leading-relaxed">
            The system is currently utilizing an optimized Heuristic Optical Flow / Semi-Lagrangian Advection engine for forecast generation. This mode ensures continuous operational payload delivery when PyTorch ConvLSTM weight checkpoints are uninitialized or in fallback demo mode. <strong>This fallback prediction is clearly distinguished from neural-network tensor inference.</strong>
          </p>
        </div>
      )}

      {/* Model Spec Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
        
        {/* Model Backbone */}
        <div className="bg-white border border-[#D0E3F0] p-3 rounded-lg space-y-1 shadow-2xs">
          <span className="text-[10px] text-[#47637E] font-sans uppercase font-bold block">MODEL ARCHITECTURE</span>
          <span className="text-xs font-bold text-[#0F2942] block font-mono">2-Layer ConvLSTM</span>
          <span className="text-[10px] text-[#47637E] font-sans block">Encoder-Decoder Spatiotemporal Net</span>
        </div>

        {/* PyTorch Availability */}
        <div className="bg-white border border-[#D0E3F0] p-3 rounded-lg space-y-1 shadow-2xs">
          <span className="text-[10px] text-[#47637E] font-sans uppercase font-bold block">PYTORCH FRAMEWORK</span>
          <span className={`text-xs font-bold block ${isTorchAvailable ? 'text-[#15803D]' : 'text-[#DC2626]'}`}>
            {isTorchAvailable ? 'INSTALLED & READY' : 'NOT INSTALLED'}
          </span>
          <span className="text-[10px] text-[#47637E] font-sans block">Deep Learning Engine</span>
        </div>

        {/* Checkpoint Status */}
        <div className="bg-white border border-[#D0E3F0] p-3 rounded-lg space-y-1 shadow-2xs">
          <span className="text-[10px] text-[#47637E] font-sans uppercase font-bold block">CHECKPOINT VERIFICATION</span>
          <span className="text-xs font-bold text-[#0284C7] block">{modelStatus}</span>
          <span className="text-[10px] text-[#47637E] font-sans block">vajra_spatiotemporal_v1.pt</span>
        </div>

        {/* Active Engine */}
        <div className="bg-white border border-[#D0E3F0] p-3 rounded-lg space-y-1 shadow-2xs">
          <span className="text-[10px] text-[#47637E] font-sans uppercase font-bold block">ACTIVE INFERENCE ENGINE</span>
          <span className="text-xs font-bold text-[#0F2942] block">{inferenceMode}</span>
          <span className="text-[10px] text-[#47637E] font-sans block">0-180 Min Lead Time Pipeline</span>
        </div>

      </div>

      {/* Model Artifact File Specs */}
      <div className="bg-white border border-[#D0E3F0] p-3 rounded-lg text-xs font-mono space-y-2">
        <div className="text-[11px] font-bold text-[#0F2942] uppercase font-sans border-b border-[#D0E3F0] pb-1">
          Registered Repository Model Weights & Checkpoint Artifacts
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-[#47637E]">
          <div className="flex items-center justify-between bg-[#F8FCFE] p-2 rounded border border-[#D0E3F0]">
            <span className="flex items-center gap-1.5 text-[#0F2942]">
              <HardDrive className="w-3.5 h-3.5 text-[#0284C7]" /> vajra_spatiotemporal_v1.pt
            </span>
            <span className="text-[10px] bg-[#EEF6FB] px-2 py-0.5 rounded text-[#0284C7] font-bold">PyTorch ConvLSTM Checkpoint</span>
          </div>

          <div className="flex items-center justify-between bg-[#F8FCFE] p-2 rounded border border-[#D0E3F0]">
            <span className="flex items-center gap-1.5 text-[#0F2942]">
              <HardDrive className="w-3.5 h-3.5 text-[#047857]" /> vajra_hgb_nowcast_v2.joblib
            </span>
            <span className="text-[10px] bg-[#ECFDF5] px-2 py-0.5 rounded text-[#047857] font-bold">HistGradientBoosting Weights</span>
          </div>
        </div>
      </div>

    </div>
  );
}
