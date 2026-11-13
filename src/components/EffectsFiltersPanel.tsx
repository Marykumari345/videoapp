import React from 'react';
import { 
  Sliders, 
  RotateCcw, 
  Sun, 
  Contrast, 
  Droplet, 
  Thermometer, 
  Sparkles, 
  Focus, 
  Film,
  Gauge
} from 'lucide-react';
import { FilterSettings } from '../types/editor';

interface EffectsFiltersPanelProps {
  filters: FilterSettings;
  onChange: (filters: FilterSettings) => void;
}

const FILTER_PRESETS = [
  { id: 'none', label: 'Original', desc: 'Natural color' },
  { id: 'teal_orange', label: 'Teal & Orange', desc: 'Blockbuster movie contrast' },
  { id: 'noir', label: 'Noir 35mm', desc: 'High-contrast monochrome' },
  { id: 'vintage_70s', label: 'Vintage 70s', desc: 'Warm analog warmth' },
  { id: 'cyber_neon', label: 'Cyber Neon', desc: 'Vibrant neon aesthetic' },
  { id: 'golden_hour', label: 'Golden Hour', desc: 'Warm sunset glow' },
  { id: 'nordic_fjord', label: 'Nordic Fjord', desc: 'Cool arctic tones' },
  { id: 'retro_vhs', label: 'Retro VHS', desc: 'Analog scanlines & grain' },
];

export const EffectsFiltersPanel: React.FC<EffectsFiltersPanelProps> = ({
  filters,
  onChange,
}) => {
  const update = (key: keyof FilterSettings, value: any) => {
    onChange({ ...filters, [key]: value });
  };

  const handleReset = () => {
    onChange({
      preset: 'none',
      brightness: 100,
      contrast: 100,
      saturate: 100,
      temperature: 0,
      sepia: 0,
      blur: 0,
      grain: 0,
      vignette: 0,
      letterbox: false,
      speed: 1,
    });
  };

  return (
    <div className="h-full flex flex-col bg-neutral-900/60 p-4 space-y-5 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Effects & Filters</h3>
        </div>
        <button
          onClick={handleReset}
          className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>

      {/* Preset Grids */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-neutral-300">Cinematic Presets</label>
        <div className="grid grid-cols-2 gap-2">
          {FILTER_PRESETS.map((p) => {
            const isActive = filters.preset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => update('preset', p.id)}
                className={`p-2.5 text-left rounded-xl border transition-all ${
                  isActive
                    ? 'bg-neutral-800 border-amber-400 text-white shadow-sm'
                    : 'bg-neutral-950/40 border-neutral-800 text-neutral-300 hover:bg-neutral-800/40 hover:border-neutral-700'
                }`}
              >
                <div className="text-xs font-semibold">{p.label}</div>
                <div className="text-[10px] text-neutral-400 truncate">{p.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Precision Sliders */}
      <div className="space-y-4 pt-2">
        <label className="text-xs font-medium text-neutral-300">Grading & Optical Adjustments</label>
        
        {/* Brightness */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-neutral-400" /> Brightness
            </span>
            <span className="font-mono text-neutral-200">{filters.brightness}%</span>
          </div>
          <input
            type="range"
            min={50}
            max={150}
            value={filters.brightness}
            onChange={(e) => update('brightness', Number(e.target.value))}
            className="w-full accent-amber-400"
          />
        </div>

        {/* Contrast */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <Contrast className="w-3.5 h-3.5 text-neutral-400" /> Contrast
            </span>
            <span className="font-mono text-neutral-200">{filters.contrast}%</span>
          </div>
          <input
            type="range"
            min={50}
            max={150}
            value={filters.contrast}
            onChange={(e) => update('contrast', Number(e.target.value))}
            className="w-full accent-amber-400"
          />
        </div>

        {/* Saturation */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <Droplet className="w-3.5 h-3.5 text-neutral-400" /> Saturation
            </span>
            <span className="font-mono text-neutral-200">{filters.saturate}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={200}
            value={filters.saturate}
            onChange={(e) => update('saturate', Number(e.target.value))}
            className="w-full accent-amber-400"
          />
        </div>

        {/* Temperature */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-neutral-400" /> Warmth / Temperature
            </span>
            <span className="font-mono text-neutral-200">{filters.temperature > 0 ? `+${filters.temperature}` : filters.temperature}</span>
          </div>
          <input
            type="range"
            min={-50}
            max={50}
            value={filters.temperature}
            onChange={(e) => update('temperature', Number(e.target.value))}
            className="w-full accent-amber-400"
          />
        </div>

        {/* Film Grain */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-neutral-400" /> 35mm Film Grain
            </span>
            <span className="font-mono text-neutral-200">{filters.grain}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={filters.grain}
            onChange={(e) => update('grain', Number(e.target.value))}
            className="w-full accent-amber-400"
          />
        </div>

        {/* Vignette */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <Focus className="w-3.5 h-3.5 text-neutral-400" /> Lens Vignette
            </span>
            <span className="font-mono text-neutral-200">{filters.vignette}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={filters.vignette}
            onChange={(e) => update('vignette', Number(e.target.value))}
            className="w-full accent-amber-400"
          />
        </div>

        {/* Letterbox Bars Toggle */}
        <div className="pt-2">
          <button
            onClick={() => update('letterbox', !filters.letterbox)}
            className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-colors ${
              filters.letterbox
                ? 'bg-amber-400/10 border-amber-400/40 text-amber-300'
                : 'bg-neutral-950/40 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Film className="w-4 h-4" /> 2.39:1 Cinema Letterbox Bars
            </span>
            <span className="text-[11px] font-semibold">{filters.letterbox ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Speed Controls */}
        <div className="space-y-2 pt-2">
          <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-amber-400" /> Playback Speed Ramping
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[0.5, 1, 1.5, 2].map((s) => (
              <button
                key={s}
                onClick={() => update('speed', s)}
                className={`py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  filters.speed === s
                    ? 'bg-amber-400 text-neutral-950 border-amber-400 font-semibold'
                    : 'bg-neutral-950/40 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
