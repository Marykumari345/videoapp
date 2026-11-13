import React, { useRef, useState } from 'react';
import { 
  Play, 
  Pause, 
  Scissors, 
  Trash2, 
  Copy, 
  ZoomIn, 
  ZoomOut, 
  Music, 
  Type, 
  Film, 
  Volume2, 
  VolumeX, 
  RotateCcw,
  Sparkles,
  Layers
} from 'lucide-react';
import { TimelineClip, AudioTrackClip, TextOverlay } from '../types/editor';

interface TimelineProps {
  clips: TimelineClip[];
  audioClips: AudioTrackClip[];
  textOverlays: TextOverlay[];
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  selectedClipId: string | null;
  onSelectClip: (id: string | null) => void;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onSplitClip: (clipId: string, time: number) => void;
  onDeleteClip: (clipId: string) => void;
  onDuplicateClip: (clipId: string) => void;
  onDeleteAudioClip: (id: string) => void;
  onDeleteText: (id: string) => void;
  onOpenAudioModal: () => void;
  onOpenTextToVideo: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  clips,
  audioClips,
  textOverlays,
  currentTime,
  totalDuration,
  isPlaying,
  selectedClipId,
  onSelectClip,
  onSeek,
  onTogglePlay,
  onSplitClip,
  onDeleteClip,
  onDuplicateClip,
  onDeleteAudioClip,
  onDeleteText,
  onOpenAudioModal,
  onOpenTextToVideo,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(30); // pixels per second
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Format seconds to MM:SS.S
  const formatTimecode = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  const timelineWidth = Math.max(900, totalDuration * zoomLevel + 200);

  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + timelineRef.current.scrollLeft;
    const newTime = Math.max(0, Math.min(totalDuration, clickX / zoomLevel));
    onSeek(newTime);
    setIsScrubbing(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!timelineRef.current) return;
      const moveRect = timelineRef.current.getBoundingClientRect();
      const moveX = moveEvent.clientX - moveRect.left + timelineRef.current.scrollLeft;
      const scrubTime = Math.max(0, Math.min(totalDuration, moveX / zoomLevel));
      onSeek(scrubTime);
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleSplitCurrent = () => {
    if (!selectedClipId) return;
    onSplitClip(selectedClipId, currentTime);
  };

  return (
    <div className="h-64 flex flex-col bg-neutral-950 border-t border-neutral-800 select-none">
      
      {/* Timeline Controls & Action Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800 bg-neutral-900/80">
        
        {/* Playback Controls & Timecode */}
        <div className="flex items-center gap-3">
          <button
            onClick={onTogglePlay}
            className="w-8 h-8 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 flex items-center justify-center transition-colors shadow-sm"
            title="Play / Pause (Spacebar)"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-neutral-950" /> : <Play className="w-4 h-4 fill-neutral-950 translate-x-0.5" />}
          </button>

          <button
            onClick={() => onSeek(0)}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            title="Return to Start"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 font-mono text-xs font-semibold tabular-nums">
            <span className="text-white">{formatTimecode(currentTime)}</span>
            <span className="text-neutral-500">/</span>
            <span className="text-neutral-400">{formatTimecode(totalDuration)}</span>
          </div>
        </div>

        {/* Editing Tools (Split, Duplicate, Delete) */}
        <div className="flex items-center gap-1.5 bg-neutral-950/60 p-1 rounded-xl border border-neutral-800">
          <button
            onClick={handleSplitCurrent}
            disabled={!selectedClipId}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-300 hover:text-white disabled:opacity-40 rounded-lg hover:bg-neutral-800 transition-colors"
            title="Split selected clip at current playhead"
          >
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            <span>Split</span>
          </button>

          <button
            onClick={() => selectedClipId && onDuplicateClip(selectedClipId)}
            disabled={!selectedClipId}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-300 hover:text-white disabled:opacity-40 rounded-lg hover:bg-neutral-800 transition-colors"
            title="Duplicate selected clip"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate</span>
          </button>

          <button
            onClick={() => selectedClipId && onDeleteClip(selectedClipId)}
            disabled={!selectedClipId}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-300 hover:text-red-400 disabled:opacity-40 rounded-lg hover:bg-neutral-800 transition-colors"
            title="Delete clip"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>

        {/* Quick Add Tracks & Zoom Slider */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAudioModal}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors border border-neutral-700"
          >
            <Music className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Audio</span>
          </button>

          <button
            onClick={onOpenTextToVideo}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors border border-amber-500/30"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Scene</span>
          </button>

          <div className="flex items-center gap-1 pl-2 border-l border-neutral-800 text-neutral-400">
            <button
              onClick={() => setZoomLevel((z) => Math.max(15, z - 8))}
              className="p-1 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.min(80, z + 8))}
              className="p-1 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Interactive Timeline Tracks Viewport */}
      <div
        ref={timelineRef}
        onMouseDown={handleTimelineMouseDown}
        className="flex-1 overflow-x-auto overflow-y-hidden relative bg-neutral-950 cursor-pointer"
      >
        <div
          className="relative h-full"
          style={{ width: `${timelineWidth}px` }}
        >
          {/* 1. Time Ruler */}
          <div className="h-6 border-b border-neutral-800 bg-neutral-900/40 relative">
            {Array.from({ length: Math.ceil(totalDuration) + 5 }).map((_, sec) => (
              <div
                key={sec}
                className="absolute top-0 bottom-0 border-l border-neutral-800 flex items-start pl-1 text-[10px] font-mono text-neutral-500"
                style={{ left: `${sec * zoomLevel}px` }}
              >
                {sec % 2 === 0 ? `${sec}s` : ''}
              </div>
            ))}
          </div>

          {/* 2. Track 1: Visual / Video Clips */}
          <div className="h-20 relative border-b border-neutral-800/80 bg-neutral-900/20 py-1.5">
            <span className="absolute left-2 top-2 z-10 text-[10px] uppercase font-bold tracking-wider text-neutral-500 pointer-events-none flex items-center gap-1">
              <Film className="w-3 h-3" /> Video Track
            </span>

            {clips.map((clip) => {
              const left = clip.startSec * zoomLevel;
              const width = clip.durationSec * zoomLevel;
              const isSelected = selectedClipId === clip.id;

              return (
                <div
                  key={clip.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectClip(clip.id);
                  }}
                  className={`absolute top-1.5 bottom-1.5 rounded-lg overflow-hidden border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-amber-400 bg-amber-400/20 shadow-md ring-2 ring-amber-400/30'
                      : 'border-neutral-700 bg-neutral-800/90 hover:border-neutral-500'
                  }`}
                  style={{ left: `${left}px`, width: `${width}px` }}
                >
                  {/* Thumbnail background banner */}
                  {clip.thumbnail && (
                    <img
                      src={clip.thumbnail}
                      alt={clip.name}
                      className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none"
                    />
                  )}

                  <div className="relative z-10 p-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-white truncate max-w-[120px] drop-shadow">
                      {clip.name}
                    </span>
                    <span className="font-mono text-[10px] text-neutral-300 bg-black/50 px-1 rounded">
                      {clip.durationSec.toFixed(1)}s
                    </span>
                  </div>

                  {clip.isAiGenerated && (
                    <div className="relative z-10 px-1.5 pb-1 flex items-center gap-1 text-[9px] text-amber-300 font-medium">
                      <Sparkles className="w-2.5 h-2.5" /> AI Generated
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 3. Track 2: Audio / Background Music Track */}
          <div className="h-16 relative border-b border-neutral-800/80 bg-neutral-900/10 py-1.5">
            <span className="absolute left-2 top-2 z-10 text-[10px] uppercase font-bold tracking-wider text-neutral-500 pointer-events-none flex items-center gap-1">
              <Music className="w-3 h-3" /> Audio Track
            </span>

            {audioClips.map((ac) => {
              const left = ac.startSec * zoomLevel;
              const width = ac.durationSec * zoomLevel;

              return (
                <div
                  key={ac.id}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-1.5 bottom-1.5 rounded-lg overflow-hidden border border-emerald-500/40 bg-emerald-950/40 hover:border-emerald-400 flex flex-col justify-between p-1.5 cursor-pointer"
                  style={{ left: `${left}px`, width: `${width}px` }}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-emerald-300 truncate">
                      <Music className="w-3 h-3 shrink-0" />
                      <span className="font-medium truncate">{ac.title}</span>
                    </div>
                    <button
                      onClick={() => onDeleteAudioClip(ac.id)}
                      className="text-neutral-400 hover:text-red-400 p-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Synthetic Soundwave lines */}
                  <div className="flex items-end gap-0.5 h-5 opacity-70">
                    {Array.from({ length: Math.min(30, Math.floor(width / 6)) }).map((_, i) => (
                      <span
                        key={i}
                        className="w-1 bg-emerald-400/80 rounded-full"
                        style={{ height: `${Math.sin(i * 0.8) * 10 + 12}px` }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 4. Track 3: Text & Captions Track */}
          <div className="h-14 relative bg-neutral-900/5 py-1">
            <span className="absolute left-2 top-2 z-10 text-[10px] uppercase font-bold tracking-wider text-neutral-500 pointer-events-none flex items-center gap-1">
              <Type className="w-3 h-3" /> Captions Track
            </span>

            {textOverlays.map((to) => {
              const left = to.startSec * zoomLevel;
              const width = to.durationSec * zoomLevel;

              return (
                <div
                  key={to.id}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-1.5 bottom-1.5 rounded-lg overflow-hidden border border-amber-500/40 bg-amber-950/40 hover:border-amber-400 flex items-center justify-between px-2 text-xs text-amber-200"
                  style={{ left: `${left}px`, width: `${width}px` }}
                >
                  <span className="truncate font-medium">{to.text}</span>
                  <button
                    onClick={() => onDeleteText(to.id)}
                    className="text-neutral-400 hover:text-red-400 p-0.5 ml-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Red Playhead Cursor Line with Scrub Handle */}
          <div
            className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center"
            style={{ left: `${currentTime * zoomLevel}px` }}
          >
            <div className="w-3 h-3 bg-red-500 rounded-sm rotate-45 -translate-y-1 shadow-md ring-2 ring-red-400/40" />
            <div className="w-0.5 flex-1 bg-red-500 shadow-sm" />
          </div>

        </div>
      </div>

    </div>
  );
};
