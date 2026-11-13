import React, { useState } from 'react';
import { 
  Type, 
  Plus, 
  Trash2, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Sparkles,
  Move
} from 'lucide-react';
import { TextOverlay } from '../types/editor';

interface TextOverlayEditorProps {
  texts: TextOverlay[];
  currentTime: number;
  totalDuration: number;
  onAddText: (text: TextOverlay) => void;
  onUpdateText: (id: string, updates: Partial<TextOverlay>) => void;
  onDeleteText: (id: string) => void;
}

export const TextOverlayEditor: React.FC<TextOverlayEditorProps> = ({
  texts,
  currentTime,
  totalDuration,
  onAddText,
  onUpdateText,
  onDeleteText,
}) => {
  const [selectedTextId, setSelectedTextId] = useState<string | null>(texts[0]?.id || null);

  const handleCreateNew = () => {
    const newText: TextOverlay = {
      id: `text-${Date.now()}`,
      text: 'Add Title Here',
      startSec: Math.floor(currentTime),
      durationSec: 3,
      x: 50,
      y: 50,
      fontSize: 32,
      fontFamily: 'Plus Jakarta Sans',
      color: '#ffffff',
      animation: 'slide_up',
      align: 'center',
      bold: true,
    };
    onAddText(newText);
    setSelectedTextId(newText.id);
  };

  const selectedText = texts.find((t) => t.id === selectedTextId) || texts[0];

  return (
    <div className="h-full flex flex-col bg-neutral-900/60 p-4 space-y-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Titles & Captions</h3>
        </div>
        <button
          onClick={handleCreateNew}
          className="px-2.5 py-1 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Title
        </button>
      </div>

      {/* Text List */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-400">Active Text Layers</label>
        {texts.length === 0 ? (
          <div className="p-4 text-center border border-dashed border-neutral-800 rounded-xl text-neutral-500 text-xs">
            No text layers added yet. Tap "Add Title" to create one.
          </div>
        ) : (
          <div className="space-y-1">
            {texts.map((t) => {
              const isSelected = selectedText?.id === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTextId(t.id)}
                  className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-neutral-800 border-amber-400/80 text-white'
                      : 'bg-neutral-950/40 border-neutral-800/80 text-neutral-400 hover:text-white'
                  }`}
                >
                  <span className="truncate max-w-[140px] font-medium">{t.text || 'Untitled Text'}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {t.startSec}s - {t.startSec + t.durationSec}s
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteText(t.id);
                      }}
                      className="text-neutral-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Editor Properties for Selected Text */}
      {selectedText && (
        <div className="space-y-3 pt-2 border-t border-neutral-800">
          <label className="text-xs font-medium text-neutral-300">Style & Placement</label>
          
          {/* Text String Input */}
          <div className="space-y-1">
            <span className="text-[11px] text-neutral-400">Content</span>
            <input
              type="text"
              value={selectedText.text}
              onChange={(e) => onUpdateText(selectedText.id, { text: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-neutral-950/70 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Font Family & Size */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-[11px] text-neutral-400">Font</span>
              <select
                value={selectedText.fontFamily}
                onChange={(e) => onUpdateText(selectedText.id, { fontFamily: e.target.value as any })}
                className="w-full px-2.5 py-1.5 text-xs bg-neutral-950/70 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-amber-400"
              >
                <option value="Plus Jakarta Sans">Modern Sans</option>
                <option value="Impact">Bold Impact</option>
                <option value="Playfair Display">Editorial Serif</option>
                <option value="JetBrains Mono">Monospace</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-neutral-400">Size ({selectedText.fontSize}px)</span>
              <input
                type="range"
                min={18}
                max={64}
                value={selectedText.fontSize}
                onChange={(e) => onUpdateText(selectedText.id, { fontSize: Number(e.target.value) })}
                className="w-full accent-amber-400 mt-2"
              />
            </div>
          </div>

          {/* Colors & Background */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-[11px] text-neutral-400">Text Color</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={selectedText.color}
                  onChange={(e) => onUpdateText(selectedText.id, { color: e.target.value })}
                  className="w-7 h-7 rounded border border-neutral-700 bg-transparent cursor-pointer"
                />
                <span className="text-xs font-mono text-neutral-300">{selectedText.color}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-neutral-400">Background Pill</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateText(selectedText.id, {
                      backgroundColor: selectedText.backgroundColor ? undefined : 'rgba(0,0,0,0.65)',
                    })
                  }
                  className={`px-3 py-1 text-xs rounded border transition-colors ${
                    selectedText.backgroundColor
                      ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-400'
                  }`}
                >
                  {selectedText.backgroundColor ? 'Solid Pill' : 'None'}
                </button>
              </div>
            </div>
          </div>

          {/* Alignment & Animation */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="space-y-1">
              <span className="text-[11px] text-neutral-400">Alignment</span>
              <div className="flex items-center gap-1 bg-neutral-950/70 p-0.5 rounded-lg border border-neutral-800">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() => onUpdateText(selectedText.id, { align })}
                    className={`flex-1 py-1 flex items-center justify-center rounded text-neutral-400 ${
                      selectedText.align === align ? 'bg-neutral-800 text-white' : 'hover:text-white'
                    }`}
                  >
                    {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                    {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                    {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-neutral-400">Entrance FX</span>
              <select
                value={selectedText.animation}
                onChange={(e) => onUpdateText(selectedText.id, { animation: e.target.value as any })}
                className="w-full px-2.5 py-1 text-xs bg-neutral-950/70 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-amber-400"
              >
                <option value="none">None (Static)</option>
                <option value="fade">Smooth Fade</option>
                <option value="slide_up">Slide Up</option>
                <option value="pop">Pop In</option>
              </select>
            </div>
          </div>

          {/* Position Coordinates Sliders (X & Y %) */}
          <div className="space-y-2 pt-2">
            <span className="text-[11px] text-neutral-400 flex items-center gap-1">
              <Move className="w-3 h-3 text-amber-400" /> Screen Position (X / Y)
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-neutral-500">Horizontal ({selectedText.x}%)</span>
                <input
                  type="range"
                  min={10}
                  max={90}
                  value={selectedText.x}
                  onChange={(e) => onUpdateText(selectedText.id, { x: Number(e.target.value) })}
                  className="w-full accent-amber-400"
                />
              </div>
              <div>
                <span className="text-[10px] text-neutral-500">Vertical ({selectedText.y}%)</span>
                <input
                  type="range"
                  min={10}
                  max={90}
                  value={selectedText.y}
                  onChange={(e) => onUpdateText(selectedText.id, { y: Number(e.target.value) })}
                  className="w-full accent-amber-400"
                />
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
