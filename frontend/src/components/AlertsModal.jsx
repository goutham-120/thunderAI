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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="bg-[#0B1120] w-full max-w-3xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-950 via-rose-900 to-red-950 text-white flex items-center justify-between border-b border-red-800/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-500/20 border border-red-500/40 rounded-xl text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Common Alerting Protocol (CAP - ITU-T X.1303)
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-mono border border-red-500/30">
                  Live Early Warnings
                </span>
              </h2>
              <p className="text-xs text-red-200/80">
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
        <div className="px-6 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('structured')}
              className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'structured' 
                  ? 'bg-red-600 text-white shadow-xs' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Structured View</span>
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'raw' 
                  ? 'bg-red-600 text-white shadow-xs' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Raw CAP JSON Payload</span>
            </button>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {alerts?.length || 0} Active Warning Payload(s)
          </span>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {(!alerts || alerts.length === 0) ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No active emergency CAP warnings currently active for this region.
            </div>
          ) : activeTab === 'raw' ? (
            /* RAW JSON VIEW */
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.identifier} className="bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs text-emerald-400 relative">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400 text-[11px]">
                    <span>Identifier: {alert.identifier}</span>
                    <button
                      onClick={() => handleCopyCAP(alert)}
                      className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all"
                    >
                      {copiedId === alert.identifier ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-300">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="overflow-x-auto text-[11px] leading-relaxed text-emerald-300 font-mono">
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
                className="p-4 rounded-xl border border-red-500/30 bg-red-950/20 space-y-3"
              >
                {/* Alert Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-red-400 uppercase px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30">
                      {alert.info?.severity || 'SEVERE'} • {alert.info?.urgency || 'IMMEDIATE'} • {alert.info?.certainty || 'OBSERVED'}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1">
                      {alert.info?.headline}
                    </h3>
                    <span className="text-[11px] font-mono text-slate-400">
                      ID: {alert.identifier} • Sender: {alert.sender}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopyCAP(alert)}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all"
                  >
                    {copiedId === alert.identifier ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Description */}
                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  <p className="font-semibold text-slate-100 mb-1">Meteorological Hazard Summary:</p>
                  <p>{alert.info?.description}</p>
                </div>

                {/* Multi-Sector Targeted Advisories */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                    <span className="font-bold text-slate-200 flex items-center gap-1 mb-1 text-[11px]">
                      <Plane className="w-3.5 h-3.5 text-cyan-400" /> Aviation
                    </span>
                    <span className="text-[10px] text-slate-400">Low-level wind shear & microburst alert.</span>
                  </div>

                  <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                    <span className="font-bold text-slate-200 flex items-center gap-1 mb-1 text-[11px]">
                      <Zap className="w-3.5 h-3.5 text-amber-400" /> Power Grid
                    </span>
                    <span className="text-[10px] text-slate-400">Sub-station surge & line isolation protocol.</span>
                  </div>

                  <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                    <span className="font-bold text-slate-200 flex items-center gap-1 mb-1 text-[11px]">
                      <Users className="w-3.5 h-3.5 text-red-400" /> Public
                    </span>
                    <span className="text-[10px] text-slate-400">Evacuate open grounds & tall structures.</span>
                  </div>

                  <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                    <span className="font-bold text-slate-200 flex items-center gap-1 mb-1 text-[11px]">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400" /> NDRF/Civic
                    </span>
                    <span className="text-[10px] text-slate-400">Prepare pump deployment for flash flooding.</span>
                  </div>
                </div>

                {/* Safety Instructions */}
                <div className="text-[11px] text-red-300 bg-red-950/40 p-2.5 rounded-lg border border-red-500/30 font-mono whitespace-pre-line">
                  {alert.info?.instruction}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Standards Compliance: ITU-T X.1303 / NDMA CAP Server</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-all border border-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

