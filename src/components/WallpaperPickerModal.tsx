import React, { useState } from 'react';
import { X, Check, Image as ImageIcon, Sparkles, Sliders, Palette } from 'lucide-react';

export interface WallpaperOption {
  id: string;
  name: string;
  description: string;
  previewBg: string;
  type: 'pattern' | 'gradient' | 'solid' | 'custom';
  cssClass: string;
}

export const WALLPAPER_PRESETS: WallpaperOption[] = [
  {
    id: 'whatsapp_dark',
    name: 'WhatsApp Dark Doodle',
    description: 'Iconic slate doodle pattern with subtle football motifs',
    previewBg: 'bg-[#0b141a]',
    type: 'pattern',
    cssClass: 'wallpaper-whatsapp-dark'
  },
  {
    id: 'telegram_space',
    name: 'Telegram Nebula',
    description: 'Deep cosmic gradient with celestial starry accents',
    previewBg: 'bg-gradient-to-b from-[#0f172a] via-[#1e1b4b] to-[#0f172a]',
    type: 'gradient',
    cssClass: 'wallpaper-telegram-space'
  },
  {
    id: 'emerald_pitch',
    name: 'Tactical Pitch',
    description: 'Lush football pitch tactical turf grid',
    previewBg: 'bg-gradient-to-b from-[#064e3b] via-[#022c22] to-[#06201b]',
    type: 'pattern',
    cssClass: 'wallpaper-emerald-pitch'
  },
  {
    id: 'oled_black',
    name: 'Pure Midnight OLED',
    description: 'True black battery saver with cyber highlights',
    previewBg: 'bg-[#000000]',
    type: 'solid',
    cssClass: 'wallpaper-oled-black'
  },
  {
    id: 'cyber_grid',
    name: 'Cyber Neon Arena',
    description: 'Futuristic stadium neon wireframe grid',
    previewBg: 'bg-[#090d16]',
    type: 'pattern',
    cssClass: 'wallpaper-cyber-grid'
  },
  {
    id: 'ocean_deep',
    name: 'Oceanic Sapphire',
    description: 'Fluid teal and sapphire gradient with soft refraction',
    previewBg: 'bg-gradient-to-br from-[#0c2340] via-[#081726] to-[#040d16]',
    type: 'gradient',
    cssClass: 'wallpaper-ocean-deep'
  }
];

interface WallpaperPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWallpaper: string;
  onSelectWallpaper: (wallpaperId: string, customUrl?: string) => void;
}

export const WallpaperPickerModal: React.FC<WallpaperPickerModalProps> = ({
  isOpen,
  onClose,
  currentWallpaper,
  onSelectWallpaper
}) => {
  const [selectedId, setSelectedId] = useState(currentWallpaper || 'whatsapp_dark');
  const [customUrl, setCustomUrl] = useState('');
  const [opacity, setOpacity] = useState(70);

  if (!isOpen) return null;

  const handleApply = () => {
    onSelectWallpaper(selectedId, selectedId === 'custom' ? customUrl : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[140] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-[#091220] border border-slate-700/80 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl shadow-black/80">
        
        {/* Header */}
        <div className="px-5 py-4 bg-[#0c1728] border-b border-slate-800/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white font-['Orbitron'] tracking-wider">
                CHAT WALLPAPER THEMES
              </h3>
              <p className="text-[11px] text-slate-400">Personalize your WhatsApp & Telegram chat ambiance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wallpaper Grid */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {WALLPAPER_PRESETS.map((wp) => {
              const isSelected = selectedId === wp.id;
              return (
                <button
                  key={wp.id}
                  onClick={() => setSelectedId(wp.id)}
                  className={`group text-left p-2.5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between h-36 ${
                    isSelected
                      ? 'border-emerald-400 ring-2 ring-emerald-500/30 bg-[#0e1d32]'
                      : 'border-slate-800/80 hover:border-slate-700 bg-[#070e1a]'
                  }`}
                >
                  {/* Miniature Chat Preview in Card */}
                  <div className={`w-full h-20 rounded-xl overflow-hidden relative p-1.5 flex flex-col justify-between ${wp.previewBg}`}>
                    {/* Fake Incoming Bubble */}
                    <div className="w-3/4 bg-slate-800/90 border border-slate-700/50 rounded-lg p-1 text-[8px] text-slate-300">
                      Match tonight?
                    </div>
                    {/* Fake Outgoing Bubble */}
                    <div className="w-2/3 ml-auto bg-emerald-600/90 rounded-lg p-1 text-[8px] text-white text-right font-medium">
                      3-1 MTL Win!
                    </div>

                    {isSelected && (
                      <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-[1px] flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Label */}
                  <div className="pt-2">
                    <p className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                      {wp.name}
                    </p>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{wp.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Image URL Option */}
          <div className="p-3.5 rounded-2xl bg-[#060d18] border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              <span>Custom Image URL (Optional)</span>
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://example.com/stadium-wallpaper.jpg"
                value={customUrl}
                onChange={(e) => {
                  setCustomUrl(e.target.value);
                  setSelectedId('custom');
                }}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              {customUrl && (
                <button
                  onClick={() => setSelectedId('custom')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedId === 'custom'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  Use URL
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#0c1728] border-t border-slate-800/90 flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              setSelectedId('whatsapp_dark');
              onSelectWallpaper('whatsapp_dark');
              onClose();
            }}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Reset to Default
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs font-['Orbitron'] tracking-wide shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
            >
              Apply Wallpaper
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default WallpaperPickerModal;
