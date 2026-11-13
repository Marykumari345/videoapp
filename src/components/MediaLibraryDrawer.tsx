import React, { useRef } from 'react';
import { 
  Upload, 
  Film, 
  Image as ImageIcon, 
  Plus, 
  Sparkles, 
  Trash2, 
  Clock,
  Play
} from 'lucide-react';
import { MediaItem, TimelineClip } from '../types/editor';

interface MediaLibraryDrawerProps {
  mediaItems: MediaItem[];
  onUploadMedia: (files: FileList) => void;
  onAddMediaToTimeline: (media: MediaItem) => void;
  onDeleteMedia: (id: string) => void;
  onOpenTextToVideo: () => void;
}

export const MediaLibraryDrawer: React.FC<MediaLibraryDrawerProps> = ({
  mediaItems,
  onUploadMedia,
  onAddMediaToTimeline,
  onDeleteMedia,
  onOpenTextToVideo,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadMedia(e.target.files);
    }
  };

  return (
    <div className="h-full flex flex-col bg-neutral-900/60 p-4 space-y-4 overflow-y-auto">
      {/* Header & Upload Buttons */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
        <div>
          <h3 className="text-sm font-semibold text-white">Media Bin</h3>
          <p className="text-[11px] text-neutral-400">Videos, photos & AI clips</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg flex items-center gap-1 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" /> Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*,image/*,audio/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Quick AI Video Generator Banner */}
      <div
        onClick={onOpenTextToVideo}
        className="p-3.5 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent hover:border-amber-400/60 cursor-pointer transition-all group"
      >
        <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
          <span>Generate Video with AI</span>
          <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400 text-neutral-950">20s</span>
        </div>
        <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
          Upload photos, videos, select audio soundtracks & direct 20-second cinematic scenes
        </p>
      </div>

      {/* Media Items Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span>Project Assets ({mediaItems.length})</span>
          <span className="text-[10px] text-neutral-500">Tap to place on timeline</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {mediaItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onAddMediaToTimeline(item)}
              className="group relative rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950/60 hover:border-amber-400/70 hover:shadow-lg transition-all cursor-pointer flex flex-col"
            >
              {/* Media Thumbnail */}
              <div className="relative aspect-video bg-neutral-900 overflow-hidden">
                {item.type === 'image' || item.thumbnail ? (
                  <img
                    src={item.thumbnail || item.url}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-neutral-600">
                    <Film className="w-8 h-8" />
                  </div>
                )}

                {/* Type Badge */}
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase bg-black/60 backdrop-blur-md rounded text-white flex items-center gap-1">
                  {item.type === 'video' ? <Film className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}
                  {item.type}
                </span>

                {/* Duration Badge */}
                <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 text-[10px] font-mono bg-black/70 backdrop-blur-md rounded text-neutral-200">
                  {Math.round(item.duration)}s
                </span>

                {/* Hover Add Button Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <span className="p-1.5 rounded-full bg-amber-400 text-neutral-950 font-bold shadow-md">
                    <Plus className="w-4 h-4" />
                  </span>
                </div>
              </div>

              {/* Title & Delete Action */}
              <div className="p-2 flex items-center justify-between text-xs">
                <span className="font-medium text-neutral-200 truncate group-hover:text-amber-300 transition-colors">
                  {item.name}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteMedia(item.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 p-0.5 transition-opacity"
                  title="Remove asset"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
