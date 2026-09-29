import React from 'react';
import { 
  Radio, 
  Satellite, 
  Zap, 
  Activity, 
  ShieldAlert, 
  CloudRain, 
  Thermometer, 
  Wind,
  Layers,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

export default function SpatialLayerControls({
  activeLayers,
  toggleLayer,
  channelProvenance = {},
  channelStatus = {}
}) {
  const layerConfigs = [
    { 
      key: 'radar', 
      label: 'Radar Reflectivity (dBZ)', 
      icon: Radio, 
      activeColor: 'bg-[#DC2626] text-white border-[#DC2626]',
      provKey: 'radar_dbz',
      desc: 'Doppler Radar Reflectivity 0-70 dBZ'
    },
    { 
      key: 'aiRisk', 
      label: 'Thunderstorm Prob (%)', 
      icon: Activity, 
      activeColor: 'bg-[#0284C7] text-white border-[#0284C7]',
      provKey: 'pred_thunderstorm_prob',
      desc: 'Spatiototemporal Deep Learning Storm Risk Index'
    },
    { 
      key: 'lightningRisk', 
      label: 'Lightning Prob (%)', 
      icon: ShieldAlert, 
      activeColor: 'bg-[#EA580C] text-white border-[#EA580C]',
      provKey: 'pred_lightning_prob',
      desc: 'Convective Charge & Flash Occurrence Risk'
    },
    { 
      key: 'rainfall', 
      label: 'Rainfall Rate (mm/h)', 
      icon: CloudRain, 
      activeColor: 'bg-[#0284C7] text-white border-[#0284C7]',
      provKey: 'pred_rainfall_mmh',
      desc: 'Z-R Estimated Instantaneous Precipitation Rate'
    },
    { 
      key: 'lightning', 
      label: 'Lightning Strikes (LLN)', 
      icon: Zap, 
      activeColor: 'bg-[#D97706] text-white border-[#D97706]',
      provKey: 'lightning_density',
      desc: 'Ground Lightning Sensors & Density Feed'
    },
    { 
      key: 'satellite', 
      label: 'Satellite IR (MOSDAC)', 
      icon: Satellite, 
      activeColor: 'bg-[#4F46E5] text-white border-[#4F46E5]',
      provKey: 'sat_tir1_k',
      desc: 'INSAT-3D Thermal InfraRed Cloud Top Canopy'
    },
    { 
      key: 'cloudTop', 
      label: 'Cloud Top Temp (°C)', 
      icon: Thermometer, 
      activeColor: 'bg-[#7C3AED] text-white border-[#7C3AED]',
      provKey: 'cloud_top',
      desc: 'Infrared Brightness Temp Brightness Index'
    },
    { 
      key: 'wind', 
      label: '10m Wind Vectors', 
      icon: Wind, 
      activeColor: 'bg-[#0D9488] text-white border-[#0D9488]',
      provKey: 'nwp_shear',
      desc: 'Atmospheric Motion Vectors & Steering Current'
    }
  ];

  const getChannelStatusBadge = (provKey) => {
    const statusText = channelProvenance[provKey] || channelStatus[provKey] || '';
    const uppercaseStatus = String(statusText).toUpperCase();

    if (uppercaseStatus.includes('REAL') || uppercaseStatus.includes('IMD') || uppercaseStatus.includes('MOSDAC') || uppercaseStatus.includes('ECMWF')) {
      return { label: 'REAL', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    } else if (uppercaseStatus.includes('FALLBACK') || uppercaseStatus.includes('SYNTHETIC')) {
      return { label: 'SYNTHETIC', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    } else if (uppercaseStatus.includes('UNAVAILABLE') || uppercaseStatus.includes('MISSING')) {
      return { label: 'UNAVAILABLE', color: 'bg-red-100 text-red-800 border-red-300' };
    } else {
      return { label: 'SYNTHETIC', color: 'bg-[#EEF6FB] text-[#0284C7] border-[#D0E3F0]' };
    }
  };

  return (
    <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-3 rounded-xl shadow-xs space-y-2 font-sans">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold text-[#0F2942] uppercase flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-[#0284C7]" /> Dynamic Spatial Layers
        </span>
        <span className="text-[10px] text-[#47637E] font-mono">
          Click layer button to toggle visibility on Map
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-1">
        {layerConfigs.map((layer) => {
          const Icon = layer.icon;
          const isActive = activeLayers[layer.key];
          const badge = getChannelStatusBadge(layer.provKey);

          return (
            <button
              key={layer.key}
              onClick={() => toggleLayer(layer.key)}
              title={layer.desc}
              className={`flex flex-col items-start justify-between p-2 rounded-lg border text-xs transition-all relative group ${
                isActive
                  ? `${layer.activeColor} shadow-2xs font-semibold scale-[1.02]`
                  : 'bg-white text-[#47637E] border-[#D0E3F0] hover:bg-[#EEF6FB] hover:text-[#0F2942]'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#0284C7]'}`} />
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                  isActive ? 'bg-black/20 text-white border-transparent' : badge.color
                }`}>
                  {badge.label}
                </span>
              </div>

              <span className="text-[11px] font-sans font-medium line-clamp-1 leading-tight text-left">
                {layer.label}
              </span>

              {/* Eye Indicator */}
              <div className="mt-1 flex items-center space-x-1 text-[10px] opacity-80">
                {isActive ? (
                  <>
                    <Eye className="w-3 h-3 text-white" />
                    <span className="text-white text-[9px] font-mono">Active</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3 h-3 text-[#47637E]" />
                    <span className="text-[#47637E] text-[9px] font-mono">Hidden</span>
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
