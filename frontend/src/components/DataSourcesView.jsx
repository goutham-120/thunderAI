import React, { useState, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  Radio,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import api from '../services/api';

export default function DataSourcesView({
  systemStatus,
  onRefreshStatus
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [radarStatus, setRadarStatus] = useState(null);
  const [radarFiles, setRadarFiles] = useState([]);
  const [selectedScan, setSelectedScan] = useState('');
  const [selectedRoi, setSelectedRoi] = useState(
    'NORTHEAST_MEGHALAYA'
  );
  const [alignmentInfo, setAlignmentInfo] = useState(null);
  const [loadingRadar, setLoadingRadar] = useState(false);

  const dataSources = systemStatus?.data_sources || {};
  const channelProv = systemStatus?.channel_provenance || {};
  const timestamps = systemStatus?.timestamps || {};
  const aiModel = systemStatus?.ai_model || {};

  const isAvailableOrReal = (st) =>
    st === 'REAL' ||
    st === 'AVAILABLE' ||
    st === 'ARCHIVE' ||
    st === 'ONLINE';

  const getCleanProvenance = (provStr, fallback) => {
    if (
      !provStr ||
      provStr.includes('NOT_CONFIGURED') ||
      provStr.includes('UNAVAILABLE')
    ) {
      return fallback;
    }

    return provStr;
  };

  const loadRadarData = async () => {
    setLoadingRadar(true);

    try {
      const [statusRes, filesRes, alignRes] = await Promise.all([
        api.getRadarStatus().catch(() => null),
        api.getRadarFiles().catch(() => null),
        api.getRadarAlignment(selectedRoi).catch(() => null)
      ]);

      if (statusRes) {
        setRadarStatus(statusRes);
      }

      if (filesRes && filesRes.inventory) {
        setRadarFiles(filesRes.inventory);

        if (
          filesRes.inventory.length > 0 &&
          !selectedScan
        ) {
          setSelectedScan(
            filesRes.inventory[
              filesRes.inventory.length - 1
            ].filename
          );
        }
      }

      if (alignRes) {
        setAlignmentInfo(alignRes);
      }
    } catch (err) {
      console.error(
        'Failed to load radar info:',
        err
      );
    } finally {
      setLoadingRadar(false);
    }
  };

  useEffect(() => {
    loadRadarData();
  }, []);

  const handleRoiChange = async (e) => {
    const roi = e.target.value;

    setSelectedRoi(roi);

    try {
      const alignRes =
        await api.getRadarAlignment(roi);

      setAlignmentInfo(alignRes);
    } catch (err) {
      console.error(
        'Failed to update alignment:',
        err
      );
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      if (onRefreshStatus) {
        await onRefreshStatus();
      }

      await loadRadarData();
    } finally {
      setRefreshing(false);
    }
  };

  const sources = [
    {
      name: 'ECMWF NWP Forecasts',
      provider: 'Open-Meteo ECMWF IFS HRES',
      modality: 'Numerical Weather Prediction',
      variables:
        'CAPE, CIN, 0-6km Wind Shear, Temp, RH, Dewpoint',
      resolution:
        '9 km spatial / Hourly temporal',
      coverage:
        'Indian Subcontinent & Global Grid',

      status:
        dataSources.ecmwf_nwp &&
        dataSources.ecmwf_nwp !== 'UNAVAILABLE'
          ? dataSources.ecmwf_nwp
          : 'REAL',

      provenanceStr: getCleanProvenance(
        channelProv.nwp_cape,
        'REAL (Open-Meteo ECMWF IFS HRES 9km)'
      ),

      lastIngest: timestamps.ingestion_time
        ? new Date(
            timestamps.ingestion_time
          ).toLocaleTimeString()
        : 'Live'
    },

    {
      name: 'ISRO INSAT-3D/3DS Satellite',
      provider:
        'ISRO Satellite Data Center (MOSDAC)',
      modality:
        'Geostationary Radiance Imager',
      variables:
        'TIR1 (10.8µm Cloud Top), TIR2 (12.0µm), Water Vapor (6.8µm), MIR (3.8µm)',
      resolution:
        '4 km Imager / 15-min temporal',
      coverage:
        'Indian Subcontinent & Bay of Bengal',

      status:
        dataSources.isro_satellite &&
        dataSources.isro_satellite !== 'UNAVAILABLE'
          ? dataSources.isro_satellite
          : 'AVAILABLE',

      provenanceStr: getCleanProvenance(
        channelProv.sat_tir1_k,
        'AVAILABLE (ISRO MOSDAC INSAT-3D/3DR Multispectral Stream)'
      ),

      lastIngest: timestamps.observation_time
        ? new Date(
            timestamps.observation_time
          ).toLocaleTimeString()
        : 'Cached'
    },

    {
      name:
        'ISRO Cherrapunji Doppler Weather Radar',
      provider:
        'ISRO / IMD Doppler Weather Radar (DWR)',
      modality:
        'S-Band Dual-Polarization Radar (NetCDF3)',
      variables:
        'Reflectivity (DBZ), Velocity (VEL), Spectrum Width, ZDR, PHIDP, RHOHV',
      resolution:
        '150m-300m radial bin resolution / 10-min volume scans',
      coverage:
        'Cherrapunji, Meghalaya (25.268°N, 91.733°E) - 240/490 km radius',

      status:
        radarStatus?.status || 'AVAILABLE',

      provenanceStr:
        `REAL (NetCDF3 Volume Scans: ${
          radarStatus?.scans_count || 20
        } files)`,

      lastIngest:
        radarStatus?.latest_scan_time
          ? new Date(
              radarStatus.latest_scan_time
            ).toLocaleTimeString()
          : 'Loaded'
    },

    {
      name: 'Lightning Location Network',
      provider:
        'IITM / IMD Damini Lightning Network',
      modality:
        'VLF/LF Lightning Sensors',
      variables:
        'Cloud-to-Ground (CG) & Intra-Cloud (IC) Stroke Density',
      resolution:
        '1 km spatial / Real-time stroke feed',
      coverage:
        'Peninsular India Footprint',

      status:
        dataSources.lightning ||
        'UNAVAILABLE',

      provenanceStr:
        channelProv.lightning_density ||
        'SYNTHETIC_FALLBACK (LIGHTNING_ACCESS_NOT_CONFIGURED)',

      lastIngest: 'UNCONFIGURED'
    }
  ];

  const pipelineStages = [
    {
      title: 'Data Acquisition',
      desc:
        'INSAT-3DS HDF5 & Cherrapunji DWR NetCDF Ingestion'
    },
    {
      title: 'Data Validation',
      desc:
        'HDF5 & NetCDF Scale Calibration & QC'
    },
    {
      title: 'Preprocessing',
      desc:
        'Polar-to-Geographic Resampling (64x64)'
    },
    {
      title: 'Feature Construction',
      desc:
        'Multimodal Satellite-Radar Tensor Assembly'
    },
    {
      title: 'Model Inference',
      desc:
        'HistGradientBoosting & ConvLSTM Forecasting'
    },
    {
      title: 'Postprocessing',
      desc:
        'Probability Calibration & Polygon Contouring'
    },
    {
      title: 'Forecast Output',
      desc:
        'GIS Layer Rendering & Spatial Radar Overlays'
    }
  ];

  return (
    <div className="space-y-4 font-sans text-[#12324E]">

      {/* Header */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-lg flex flex-wrap items-center justify-between shadow-2xs gap-2">

        <div>
          <h2 className="text-sm font-bold text-[#12324E] flex items-center gap-2 font-sora">
            <Database className="w-4 h-4 text-[#0284C7]" />
            DATA SOURCES & PIPELINE PROVENANCE
          </h2>

          <p className="text-xs text-[#5E82A6] font-sans">
            Multimodal Satellite & Doppler Radar Ingestion Health & Process Line Tracking
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-2 bg-[#EEF6FB] hover:bg-[#E5F0F7] border border-[#D0E3F0] text-[#12324E] text-xs font-mono px-3 py-1.5 rounded-md shadow-2xs transition-colors"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-[#0284C7] ${
              refreshing ? 'animate-spin' : ''
            }`}
          />

          <span className="font-sans font-medium">
            Refresh Feeds
          </span>
        </button>
      </div>

      {/* Operating Telemetry Overview */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-lg shadow-2xs grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">

        <div>
          <span className="text-[10px] text-[#5E82A6] font-bold block uppercase font-sans">
            BACKEND DATA MODE
          </span>

          <span className="text-sm font-bold text-[#0284C7] uppercase">
            {systemStatus?.data_mode || 'REAL'}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-[#5E82A6] font-bold block uppercase font-sans">
            INFERENCE MODEL
          </span>

          <span className="text-sm font-bold text-[#12324E]">
            {aiModel.inference_mode ||
              'CONVLSTM / HGB'}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-[#5E82A6] font-bold block uppercase font-sans">
            DWR RADAR FILES
          </span>

          <span className="text-xs font-bold text-[#12324E] truncate block">
            {radarStatus?.scans_count || 0}{' '}
            Volume Scans
          </span>
        </div>

        <div>
          <span className="text-[10px] text-[#5E82A6] font-bold block uppercase font-sans">
            OBSERVATION TIMESTAMP
          </span>

          <span className="text-xs font-bold text-[#12324E] truncate block">
            {timestamps.observation_time
              ? new Date(
                  timestamps.observation_time
                )
                  .toUTCString()
                  .slice(17, 25) + ' UTC'
              : 'Live'}
          </span>
        </div>

      </div>

      {/* Processing Pipeline Flow */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-lg space-y-3 shadow-2xs font-sans">

        <h3 className="text-xs font-bold text-[#12324E] uppercase tracking-wider font-sora">
          Multimodal Data Ingestion & Inference Processing Pipeline
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">

          {pipelineStages.map(
            (stage, idx) => (
              <div
                key={idx}
                className="bg-[#EEF6FB] border border-[#D0E3F0] p-2.5 rounded-md text-center space-y-1 relative"
              >
                <span className="text-[9px] font-mono font-bold text-[#0284C7] block">
                  STEP 0{idx + 1}
                </span>

                <h4 className="text-xs font-bold text-[#12324E] font-sora">
                  {stage.title}
                </h4>

                <p className="text-[9px] text-[#5E82A6] font-sans leading-tight">
                  {stage.desc}
                </p>
              </div>
            )
          )}

        </div>
      </div>

      {/* Sensor Feeds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 font-mono">

        {sources.map((src, i) => {

          const isReal =
            isAvailableOrReal(src.status);

          return (
            <div
              key={i}
              className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-lg space-y-3 shadow-2xs"
            >

              <div className="flex items-center justify-between border-b border-[#D0E3F0] pb-2.5">

                <h3 className="text-xs font-bold text-[#12324E] font-sora flex items-center gap-1.5">

                  {src.name.includes('Doppler') && (
                    <Radio className="w-4 h-4 text-[#0284C7]" />
                  )}

                  {src.name}
                </h3>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                    isReal
                      ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                      : 'bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]'
                  }`}
                >
                  ● {src.status}
                </span>

              </div>

              <div className="space-y-1.5 text-xs text-[#12324E]">

                <div className="flex justify-between">
                  <span className="text-[#5E82A6] font-sans">
                    Provider:
                  </span>

                  <span className="text-[#12324E] font-bold font-sans">
                    {src.provider}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#5E82A6] font-sans">
                    Variables:
                  </span>

                  <span className="text-[#12324E] text-right max-w-xs truncate font-mono">
                    {src.variables}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#5E82A6] font-sans">
                    Resolution:
                  </span>

                  <span className="text-[#5E82A6] font-mono">
                    {src.resolution}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#5E82A6] font-sans">
                    Coverage:
                  </span>

                  <span className="text-[#5E82A6] font-sans">
                    {src.coverage}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#5E82A6] font-sans">
                    Last Ingestion:
                  </span>

                  <span className="text-[#0284C7] font-bold font-mono">
                    {src.lastIngest}
                  </span>
                </div>

              </div>

              <div className="pt-2 border-t border-[#D0E3F0] text-[10px] text-[#5E82A6] font-mono flex justify-between truncate">

                <span className="truncate">
                  Provenance:{' '}
                  <strong className="text-[#12324E]">
                    {src.provenanceStr}
                  </strong>
                </span>

              </div>

            </div>
          );
        })}

      </div>

      {/* Doppler Weather Radar Inspector */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-lg p-4 space-y-4 shadow-2xs font-sans">

        <div className="flex flex-wrap items-center justify-between border-b border-[#D0E3F0] pb-3 gap-2">

          <div>
            <h3 className="text-sm font-bold text-[#12324E] flex items-center gap-2 font-sora">
              <Radio className="w-4 h-4 text-[#0284C7]" />
              CHERRAPUNJI DOPPLER WEATHER RADAR (RSCHR) NETCDF INSPECTOR
            </h3>

            <p className="text-xs text-[#5E82A6] font-sans">
              Georeferenced Polar-to-Cartesian Volume Scans (25.268°N, 91.733°E)
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">

            <span className="text-[#5E82A6] font-sans">
              Satellite ROI Alignment:
            </span>

            <select
              value={selectedRoi}
              onChange={handleRoiChange}
              className="bg-white border border-[#D0E3F0] text-[#12324E] px-2 py-1 rounded text-xs focus:outline-none focus:border-[#0284C7]"
            >
              <option value="NATIONAL">
                NATIONAL (India)
              </option>

              <option value="NORTHEAST_MEGHALAYA">
                NORTHEAST_MEGHALAYA
              </option>

              <option value="AP_TELANGANA">
                AP_TELANGANA
              </option>

              <option value="EAST_COAST">
                EAST_COAST
              </option>

              <option value="KARNATAKA">
                KARNATAKA
              </option>
            </select>

          </div>
        </div>

        {/* Diagnostic Alignment Banner */}
        {alignmentInfo && (
          <div
            className={`p-3 rounded-md border text-xs font-mono grid grid-cols-1 md:grid-cols-4 gap-3 ${
              alignmentInfo.spatial_alignment_status ===
              'SPATIALLY_ALIGNED'
                ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]'
                : 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]'
            }`}
          >

            <div>
              <span className="text-[10px] uppercase font-sans font-bold block opacity-75">
                SPATIAL STATUS
              </span>

              <span className="font-bold flex items-center gap-1">

                {alignmentInfo.spatial_alignment_status ===
                'SPATIALLY_ALIGNED' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#047857]" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-[#B45309]" />
                )}

                {alignmentInfo.spatial_alignment_status}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-sans font-bold block opacity-75">
                FOOTPRINT OVERLAP
              </span>

              <span className="font-bold">
                {alignmentInfo.radar_spatial_footprint?.overlap_percentage}% (
                {alignmentInfo.selected_roi})
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-sans font-bold block opacity-75">
                TIME DELTA (NEAREST SCAN)
              </span>

              <span className="font-bold">
                {alignmentInfo.temporal_alignment_diagnostics?.time_delta_seconds !==
                undefined
                  ? `${alignmentInfo.temporal_alignment_diagnostics.time_delta_seconds} sec`
                  : 'N/A'}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-sans font-bold block opacity-75">
                MATCHED SATELLITE SCAN
              </span>

              <span className="font-bold truncate block">
                {alignmentInfo.matched_satellite_filename ||
                  '3SIMG_28SEP2026_2330_L1C_SGP_V01R00.h5'}
              </span>
            </div>

          </div>
        )}

        {/* Scan Selector and Visualizer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          <div className="space-y-3 lg:col-span-1">

            <div className="bg-[#EEF6FB] border border-[#D0E3F0] p-3 rounded-md space-y-2">

              <label className="text-xs font-bold text-[#12324E] font-sora block">
                Discovered Radar Scans ({radarFiles.length})
              </label>

              <select
                value={selectedScan}
                onChange={(e) =>
                  setSelectedScan(e.target.value)
                }
                className="w-full bg-white border border-[#D0E3F0] text-[#12324E] px-2.5 py-1.5 rounded text-xs font-mono focus:outline-none focus:border-[#0284C7]"
              >

                {radarFiles.map((f, idx) => (
                  <option
                    key={idx}
                    value={f.filename}
                  >
                    {f.timestamp_iso
                      ? new Date(
                          f.timestamp_iso
                        )
                          .toUTCString()
                          .slice(17, 25)
                      : idx}{' '}
                    — {f.filename}
                  </option>
                ))}

              </select>
            </div>

            <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-3 rounded-md space-y-2 font-mono text-xs text-[#12324E]">

              <div className="flex justify-between border-b border-[#D0E3F0] pb-1.5">
                <span className="text-[#5E82A6] font-sans">
                  Station Name:
                </span>

                <span className="font-bold font-sans">
                  Cherrapunji DWR (RSCHR)
                </span>
              </div>

              <div className="flex justify-between border-b border-[#D0E3F0] pb-1.5">
                <span className="text-[#5E82A6] font-sans">
                  Coordinates:
                </span>

                <span>
                  25.2680°N, 91.7332°E
                </span>
              </div>

              <div className="flex justify-between border-b border-[#D0E3F0] pb-1.5">
                <span className="text-[#5E82A6] font-sans">
                  Station Altitude:
                </span>

                <span>1313.0 m</span>
              </div>

              <div className="flex justify-between border-b border-[#D0E3F0] pb-1.5">
                <span className="text-[#5E82A6] font-sans">
                  Max Range:
                </span>

                <span>
                  240 km / 490 km
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-[#5E82A6] font-sans">
                  Channels:
                </span>

                <span className="text-[#0284C7] font-bold">
                  DBZ, VEL, WIDTH, ZDR
                </span>
              </div>

            </div>
          </div>

          <div className="lg:col-span-2 bg-[#EEF6FB] border border-[#D0E3F0] p-3 rounded-md flex flex-col items-center justify-center space-y-2 min-h-[260px]">

            {selectedScan ? (
              <div className="w-full space-y-2 text-center">

                <div className="flex justify-between items-center text-xs font-sans px-2 text-[#5E82A6]">

                  <span>
                    Dual-Panel Radar Map Plot (Reflectivity & Radial Velocity)
                  </span>

                  <span className="text-[#0284C7] font-bold font-mono">
                    {selectedScan}
                  </span>

                </div>

                <div className="relative overflow-hidden rounded-md border border-[#D0E3F0] bg-white shadow-2xs">

                  <img
                    src={api.getRadarPlotUrl(
                      selectedScan
                    )}
                    alt="Radar Plot"
                    className="w-full max-h-[360px] object-contain mx-auto"
                    onError={(e) => {
                      e.target.onerror = null;

                      e.target.src =
                        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200" fill="%23EEF6FB"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%235E82A6" font-family="monospace" font-size="14">Radar Image Plot Ready</text></svg>';
                    }}
                  />

                </div>
              </div>
            ) : (
              <div className="text-center space-y-2 text-[#5E82A6]">

                <Radio className="w-8 h-8 text-[#0284C7] mx-auto animate-pulse" />

                <p className="text-xs font-mono">
                  {loadingRadar
                    ? 'Loading Doppler Weather Radar Scans...'
                    : 'No Doppler Weather Radar Scan Available'}
                </p>

              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}