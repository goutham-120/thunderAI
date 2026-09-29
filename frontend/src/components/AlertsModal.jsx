import React, { useState } from 'react';
import { 
  X, 
  ShieldAlert, 
  Plane, 
  Zap, 
  Users, 
  Building2,
  Copy,
  Check,
  Code,
  FileText
} from 'lucide-react';

export default function AlertsModal({ 
  isOpen, 
  onClose, 
  alerts 
}) {
  const [copiedId, setCopiedId] = useState(null);
  const [activeTab, setActiveTab] = useState('structured'); // 'structured' | 'raw'

  if (!isOpen) return null;

  const handleCopyCAP = (alert) => {
    navigator.clipboard.writeText(JSON.stringify(alert, null, 2));
    setCopiedId(alert.identifier);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#12324E]/40 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="bg-[#F8FCFE] w-full max-w-3xl rounded-2xl border border-[#D0E3F0] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#12324E] text-white flex items-center justify-between border-b border-[#12324E]/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-500/20 border border-red-400/30 rounded-xl text-red-300">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-sora font-semibold flex items-center gap-2">
                Common Alerting Protocol (CAP - ITU-T X.1303)
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-200 font-mono border border-red-400/30">
                  Live Early Warnings
                </span>
              </h2>
              <p className="text-xs text-blue-100 font-sans">
                Automated multi-sector disaster management & public warning broadcast
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher Bar (Structured vs Raw JSON) */}
        <div className="px-6 py-2 bg-[#EEF6FB] border-b border-[#D0E3F0] flex items-center justify-between text-xs font-sans">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('structured')}
              className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'structured' 
                  ? 'bg-[#12324E] text-white shadow-xs' 
                  : 'text-[#5E82A6] hover:text-[#12324E] hover:bg-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Structured View</span>
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'raw' 
                  ? 'bg-[#12324E] text-white shadow-xs' 
                  : 'text-[#5E82A6] hover:text-[#12324E] hover:bg-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Raw CAP JSON Payload</span>
            </button>
          </div>
          <span className="text-[11px] font-mono text-[#5E82A6]">
            {alerts?.length || 0} Active Warning Payload(s)
          </span>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {(!alerts || alerts.length === 0) ? (
            <div className="text-center py-12 text-[#5E82A6] text-sm font-sans">
              No active emergency CAP warnings currently active for this region.
            </div>
          ) : activeTab === 'raw' ? (
            /* RAW JSON VIEW */
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.identifier} className="bg-white rounded-xl border border-[#D0E3F0] p-4 font-mono text-xs text-[#12324E] relative">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#D0E3F0] text-[#5E82A6] text-[11px]">
                    <span>Identifier: {alert.identifier}</span>
                    <button
                      onClick={() => handleCopyCAP(alert)}
                      className="flex items-center space-x-1 px-2 py-0.5 rounded bg-[#EEF6FB] hover:bg-sky-100 text-[#12324E] border border-[#D0E3F0] transition-all"
                    >
                      {copiedId === alert.identifier ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700 font-sans">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-[#5E82A6]" />
                          <span className="font-sans">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="overflow-x-auto text-[11px] leading-relaxed text-[#12324E] font-mono bg-[#F8FCFE] p-3 rounded-lg border border-[#EAF0F6]">
                    {JSON.stringify(alert, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          ) : (
            /* STRUCTURED VIEW */
            alerts.map((alert) => (
              <div 
                key={alert.identifier}
                className="p-4 rounded-xl border border-red-200 bg-red-50/50 space-y-3 font-sans"
              >
                {/* Alert Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-red-700 uppercase px-2 py-0.5 rounded-full bg-red-100 border border-red-200">
                      {alert.info?.severity || 'SEVERE'} • {alert.info?.urgency || 'IMMEDIATE'} • {alert.info?.certainty || 'OBSERVED'}
                    </span>
                    <h3 className="text-sm font-sora font-semibold text-[#12324E] mt-1">
                      {alert.info?.headline}
                    </h3>
                    <span className="text-[11px] font-mono text-[#5E82A6]">
                      ID: {alert.identifier} • Sender: {alert.sender}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopyCAP(alert)}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white border border-[#D0E3F0] hover:bg-[#EEF6FB] text-xs font-semibold text-[#12324E] transition-all"
                  >
                    {copiedId === alert.identifier ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-sans">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#5E82A6]" />
                        <span className="font-sans">Copy JSON</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Description */}
                <div className="p-3 bg-white rounded-lg border border-[#D0E3F0] text-xs text-[#12324E] leading-relaxed">
                  <p className="font-semibold font-sora text-[#12324E] mb-1">Meteorological Hazard Summary:</p>
                  <p>{alert.info?.description}</p>
                </div>

                {/* Multi-Sector Targeted Advisories */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-sans">
                  <div className="p-2 bg-white rounded-lg border border-[#D0E3F0]">
                    <span className="font-semibold text-[#12324E] flex items-center gap-1 mb-1 text-[11px]">
                      <Plane className="w-3.5 h-3.5 text-[#0284C7]" /> Aviation
                    </span>
                    <span className="text-[10px] text-[#5E82A6]">Low-level wind shear & microburst alert.</span>
                  </div>

                  <div className="p-2 bg-white rounded-lg border border-[#D0E3F0]">
                    <span className="font-semibold text-[#12324E] flex items-center gap-1 mb-1 text-[11px]">
                      <Zap className="w-3.5 h-3.5 text-amber-600" /> Power Grid
                    </span>
                    <span className="text-[10px] text-[#5E82A6]">Sub-station surge & line isolation protocol.</span>
                  </div>

                  <div className="p-2 bg-white rounded-lg border border-[#D0E3F0]">
                    <span className="font-semibold text-[#12324E] flex items-center gap-1 mb-1 text-[11px]">
                      <Users className="w-3.5 h-3.5 text-red-600" /> Public
                    </span>
                    <span className="text-[10px] text-[#5E82A6]">Evacuate open grounds & tall structures.</span>
                  </div>

                  <div className="p-2 bg-white rounded-lg border border-[#D0E3F0]">
                    <span className="font-semibold text-[#12324E] flex items-center gap-1 mb-1 text-[11px]">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" /> NDRF/Civic
                    </span>
                    <span className="text-[10px] text-[#5E82A6]">Prepare pump deployment for flash flooding.</span>
                  </div>
                </div>

                {/* Safety Instructions */}
                <div className="text-[11px] text-red-900 bg-red-100/70 p-2.5 rounded-lg border border-red-200 font-mono whitespace-pre-line">
                  {alert.info?.instruction}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#EEF6FB] border-t border-[#D0E3F0] flex items-center justify-between text-xs text-[#5E82A6] font-sans">
          <span>Standards Compliance: ITU-T X.1303 / NDMA CAP Server</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#12324E] hover:bg-[#12324E]/90 text-white font-semibold transition-all border border-[#12324E]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

