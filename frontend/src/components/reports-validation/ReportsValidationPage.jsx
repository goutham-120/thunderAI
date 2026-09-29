import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import ReportHeader from './ReportHeader';
import ModelStatusSection from './ModelStatusSection';
import DataSourcesSection from './DataSourcesSection';
import ValidationMetricsSection from './ValidationMetricsSection';
import LimitationsSection from './LimitationsSection';
import { RefreshCw, AlertCircle } from 'lucide-react';

export default function ReportsValidationPage() {
  const [reportData, setReportData] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [statusRes, metricsRes] = await Promise.allSettled([
        api.getSystemStatus(),
        api.getModelMetricsReport(),
      ]);

      if (statusRes.status === 'fulfilled') {
        setSystemStatus(statusRes.value);
      } else {
        console.warn('System status API call rejected:', statusRes.reason);
      }

      if (metricsRes.status === 'fulfilled') {
        setReportData(metricsRes.value);
      } else {
        console.warn('Model metrics API call rejected:', metricsRes.reason);
      }
    } catch (err) {
      console.error('Failed loading model validation data:', err);
      setError('Unable to reach live validation engine endpoints. Displaying offline audited benchmark cache.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-[#F0F6FA] p-4 md:p-6 text-[#12324E] font-sans">
      
      {/* Print Specific CSS Override */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .shadow-xs, .shadow-2xs, .shadow-md {
            box-shadow: none !important;
          }
          .border {
            border-color: #cbd5e1 !important;
          }
          h1, h2, h3 {
            color: black !important;
          }
          table {
            font-size: 10px !important;
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-4 print-full-width">
        
        {/* Header */}
        <ReportHeader 
          reportData={reportData} 
          systemStatus={systemStatus} 
          onRefresh={() => loadData(true)}
          isRefreshing={isRefreshing}
        />

        {/* Global Loading Spinner */}
        {loading && (
          <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-12 rounded-xl text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#0284C7] animate-spin mx-auto" />
            <div className="text-sm font-bold font-mono text-[#0F2942] uppercase">
              Ingesting Model Validation Checkpoints & Empirical Audit Metrics...
            </div>
            <p className="text-xs text-[#47637E]">
              Connecting to VAJRA-AI Backend evaluation pipeline
            </p>
          </div>
        )}

        {/* Non-blocking API warning notice if needed */}
        {error && !loading && (
          <div className="bg-[#FEF2F2] border border-[#FCA5A5] p-3 rounded-lg text-xs font-sans text-[#991B1B] flex items-center justify-between">
            <div className="flex items-center space-x-2 font-mono">
              <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
              <span>{error}</span>
            </div>
            <button 
              onClick={() => loadData(true)}
              className="px-2.5 py-1 bg-[#DC2626] text-white rounded text-[10px] font-mono font-bold hover:bg-[#B91C1C] cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Main Content Sections */}
        {!loading && (
          <>
            {/* 1. Model Architecture & Runtime */}
            <ModelStatusSection 
              systemStatus={systemStatus} 
              reportData={reportData} 
            />

            {/* 2. Data Sources & Provenance */}
            <DataSourcesSection 
              systemStatus={systemStatus} 
            />

            {/* 3. Audited Numerical Metrics (+30m, +60m, +90m) */}
            <ValidationMetricsSection 
              reportData={reportData} 
            />

            {/* 4. Limitations & Disclaimers */}
            <LimitationsSection 
              reportData={reportData} 
            />
          </>
        )}

        {/* Footer Audit Signature */}
        <div className="text-center text-xs font-mono text-[#47637E] pt-4 border-t border-[#D0E3F0]">
          VAJRA-AI / ThunderAI SIH 2026 • MoES / IMD Radar & Satellite Nowcasting Validation Audit Report
        </div>

      </div>
    </div>
  );
}
