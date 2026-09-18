import React, { useState } from 'react';
import { Settings2, Music, Video, Scissors, Volume2, Sliders, ArrowRight } from 'lucide-react';

export default function ConversionSettings({
  settings,
  onUpdateSettings,
  totalDuration,
  onStartConvert,
  isConverting,
}) {
  const [enableTrim, setEnableTrim] = useState(false);

  const formats = [
    { id: 'mp3', label: 'MP3', type: 'Audio', desc: 'Universal audio, highest compatibility', icon: Music, badge: 'Popular' },
    { id: 'mp4', label: 'MP4', type: 'Video', desc: 'Standard H.264 video with AAC audio', icon: Video },
    { id: 'wav', label: 'WAV', type: 'Audio', desc: 'Lossless studio uncompressed audio', icon: Music },
    { id: 'aac', label: 'AAC', type: 'Audio', desc: 'High-efficiency streaming audio', icon: Music },
  ];

  const bitrates = [
    { value: '128', label: '128 kbps', desc: 'Standard / Smaller file' },
    { value: '192', label: '192 kbps', desc: 'High Quality (Default)' },
    { value: '320', label: '320 kbps', desc: 'Ultra Hi-Fi Studio' },
  ];

  const resolutions = [
    { value: 'original', label: 'Original' },
    { value: '1080p', label: '1080p FHD' },
    { value: '720p', label: '720p HD' },
    { value: '480p', label: '480p SD' },
  ];

  const volumes = [
    { value: 50, label: '50%' },
    { value: 100, label: '100% (Normal)' },
    { value: 125, label: '125%' },
    { value: 150, label: '150%' },
    { value: 200, label: '200% (2x Boost)' },
  ];

  const handleToggleTrim = (checked) => {
    setEnableTrim(checked);
    if (!checked) {
      onUpdateSettings({ startTime: 0, endTime: null });
    } else if (totalDuration > 0) {
      onUpdateSettings({ startTime: 0, endTime: Math.floor(totalDuration) });
    }
  };

  const isAudioFormat = ['mp3', 'wav', 'aac'].includes(settings.targetFormat);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2 text-white font-semibold text-base sm:text-lg">
          <Settings2 className="w-5 h-5 text-brand-400" />
          <span>Conversion Settings</span>
        </div>
        <span className="text-xs text-slate-400">WebAssembly Engine</span>
      </div>

      {/* Target Format Selection */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
          Output Format
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {formats.map((fmt) => {
            const Icon = fmt.icon;
            const isSelected = settings.targetFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                type="button"
                onClick={() => onUpdateSettings({ targetFormat: fmt.id })}
                disabled={isConverting}
                className={`relative flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/10'
                    : 'border-slate-800 bg-slate-850 hover:border-slate-700 hover:bg-slate-800'
                } ${isConverting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {fmt.badge && (
                  <span className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-500/20 text-brand-400 border border-brand-500/30">
                    {fmt.badge}
                  </span>
                )}
                <div className={`p-2 rounded-lg mb-2 ${isSelected ? 'bg-brand-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-base font-bold text-white mb-0.5">{fmt.label}</div>
                <div className="text-[11px] text-slate-400 leading-tight">{fmt.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bitrate Selector (for Audio and MP3/AAC) */}
      {(settings.targetFormat === 'mp3' || settings.targetFormat === 'aac') && (
        <div className="pt-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
            Audio Quality / Bitrate
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {bitrates.map((br) => {
              const isSelected = settings.bitrate === br.value;
              return (
                <button
                  key={br.value}
                  type="button"
                  onClick={() => onUpdateSettings({ bitrate: br.value })}
                  disabled={isConverting}
                  className={`py-2.5 px-4 rounded-xl border text-center transition-all ${
                    isSelected
                      ? 'border-brand-500 bg-brand-500/15 text-brand-300 font-semibold'
                      : 'border-slate-800 bg-slate-850 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="text-sm font-semibold">{br.label}</div>
                  <div className="text-[11px] text-slate-400">{br.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Video Resolution (if MP4 is selected) */}
      {settings.targetFormat === 'mp4' && (
        <div className="pt-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
            Video Output Resolution
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {resolutions.map((res) => {
              const isSelected = settings.resolution === res.value;
              return (
                <button
                  key={res.value}
                  type="button"
                  onClick={() => onUpdateSettings({ resolution: res.value })}
                  disabled={isConverting}
                  className={`py-2.5 px-3 rounded-xl border text-center transition-all ${
                    isSelected
                      ? 'border-brand-500 bg-brand-500/15 text-brand-300 font-semibold'
                      : 'border-slate-800 bg-slate-850 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="text-sm font-semibold">{res.label}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Audio Volume Modifier */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wider">
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            Audio Volume
          </label>
          <span className="text-xs text-brand-400 font-mono">{settings.volume}%</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {volumes.map((vol) => (
            <button
              key={vol.value}
              type="button"
              onClick={() => onUpdateSettings({ volume: vol.value })}
              disabled={isConverting}
              className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                settings.volume === vol.value
                  ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                  : 'border-slate-800 bg-slate-850 hover:border-slate-700 text-slate-400'
              }`}
            >
              {vol.label}
            </button>
          ))}
        </div>
      </div>

      {/* Optional Trimmer Slicer */}
      <div className="pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="trim-toggle"
              checked={enableTrim}
              onChange={(e) => handleToggleTrim(e.target.checked)}
              disabled={isConverting}
              className="w-4 h-4 rounded border-slate-700 text-brand-600 focus:ring-brand-500 bg-slate-800"
            />
            <label htmlFor="trim-toggle" className="text-sm font-medium text-slate-200 cursor-pointer flex items-center gap-1.5">
              <Scissors className="w-4 h-4 text-brand-400" />
              Trim / Cut Media Clip
            </label>
          </div>
          {enableTrim && totalDuration > 0 && (
            <span className="text-xs text-slate-400 font-mono">
              Total: {Math.floor(totalDuration)}s
            </span>
          )}
        </div>

        {enableTrim && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Start Time (seconds)</label>
              <input
                type="number"
                min="0"
                max={settings.endTime ? settings.endTime - 1 : totalDuration || 9999}
                value={settings.startTime || 0}
                onChange={(e) => onUpdateSettings({ startTime: Math.max(0, Number(e.target.value)) })}
                disabled={isConverting}
                className="w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">End Time (seconds)</label>
              <input
                type="number"
                min={settings.startTime ? settings.startTime + 1 : 1}
                max={totalDuration || 9999}
                value={settings.endTime || Math.floor(totalDuration) || ''}
                onChange={(e) => onUpdateSettings({ endTime: e.target.value ? Number(e.target.value) : null })}
                placeholder={totalDuration ? `${Math.floor(totalDuration)}` : 'End of file'}
                disabled={isConverting}
                className="w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 font-mono"
              />
            </div>
          </div>
        )}
      </div>

      {/* Convert Action Button */}
      <div className="pt-4">
        <button
          type="button"
          onClick={onStartConvert}
          disabled={isConverting}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-brand-600 via-emerald-500 to-teal-500 hover:from-brand-500 hover:to-teal-400 text-slate-950 font-extrabold text-base sm:text-lg flex items-center justify-center gap-3 shadow-lg shadow-brand-500/20 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <span>Convert Now to {settings.targetFormat.toUpperCase()}</span>
          <ArrowRight className="w-5 h-5 text-slate-950 stroke-[2.5]" />
        </button>
        <p className="text-center text-[11px] text-slate-500 mt-2">
          Runs 100% client-side inside WebAssembly. No server queues or wait times.
        </p>
      </div>
    </div>
  );
}
