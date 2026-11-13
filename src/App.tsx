import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Film, 
  Sparkles, 
  Music, 
  Sliders, 
  Type, 
  Upload, 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  Maximize, 
  Volume2, 
  VolumeX, 
  Camera, 
  Square,
  Smartphone,
  Tv,
  Check,
  ChevronRight
} from 'lucide-react';
import { 
  AspectRatio, 
  FilterSettings, 
  MediaItem, 
  TextOverlay, 
  TimelineClip, 
  AudioTrackClip 
} from './types/editor';
import { CanvasRenderer } from './utils/canvasRenderer';
import { audioEngine, ROYALTY_FREE_LIBRARY } from './utils/audioEngine';
import { InstagramAudioModal } from './components/InstagramAudioModal';
import { TextToVideoModal } from './components/TextToVideoModal';
import { EffectsFiltersPanel } from './components/EffectsFiltersPanel';
import { TextOverlayEditor } from './components/TextOverlayEditor';
import { MediaLibraryDrawer } from './components/MediaLibraryDrawer';
import { Timeline } from './components/Timeline';
import { ExportModal } from './components/ExportModal';

// Pre-seeded high quality starter media items using our generated artwork
const INITIAL_MEDIA_ITEMS: MediaItem[] = [
  {
    id: 'media-fjord-1',
    name: 'Nordic Fjord Sunrise',
    type: 'image',
    url: '/src/assets/images/cinematic_fjord_dawn_1794403514830.jpg',
    thumbnail: '/src/assets/images/cinematic_fjord_dawn_1794403514830.jpg',
    duration: 6,
    width: 1920,
    height: 1080,
    size: '4.2 MB',
  },
  {
    id: 'media-urban-2',
    name: 'Tokyo Neon Twilight',
    type: 'image',
    url: '/src/assets/images/urban_night_story_1794403516448.jpg',
    thumbnail: '/src/assets/images/urban_night_story_1794403516448.jpg',
    duration: 6,
    width: 1080,
    height: 1920,
    size: '3.8 MB',
  },
];

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'media' | 'ai' | 'audio' | 'effects' | 'text'>('media');
  
  // Project settings
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Timeline state
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(INITIAL_MEDIA_ITEMS);
  const [clips, setClips] = useState<TimelineClip[]>([
    {
      id: 'clip-1',
      mediaId: 'media-fjord-1',
      name: 'Nordic Fjord Sunrise',
      type: 'image',
      startSec: 0,
      durationSec: 6,
      trimStart: 0,
      trimEnd: 6,
      volume: 1,
      speed: 1,
      thumbnail: '/src/assets/images/cinematic_fjord_dawn_1794403514830.jpg',
    },
    {
      id: 'clip-2',
      mediaId: 'media-urban-2',
      name: 'Tokyo Neon Twilight',
      type: 'image',
      startSec: 6,
      durationSec: 6,
      trimStart: 0,
      trimEnd: 6,
      volume: 1,
      speed: 1,
      thumbnail: '/src/assets/images/urban_night_story_1794403516448.jpg',
    },
  ]);

  const [audioClips, setAudioClips] = useState<AudioTrackClip[]>([
    {
      id: 'audio-1',
      trackId: 'rf-lofi-1',
      title: 'Midnight Coffee & Rain',
      artist: 'Velvet Tape Collective',
      coverUrl: '/src/assets/images/cover_lofi_vibes_1794403516536.jpg',
      startSec: 0,
      durationSec: 12,
      trimStart: 5,
      volume: 0.8,
    },
  ]);

  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([
    {
      id: 'text-1',
      text: 'CHASING HORIZONS',
      startSec: 0.5,
      durationSec: 4.5,
      x: 50,
      y: 48,
      fontSize: 36,
      fontFamily: 'Plus Jakarta Sans',
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      animation: 'slide_up',
      align: 'center',
      bold: true,
    },
    {
      id: 'text-2',
      text: 'TOKYO NIGHTS',
      startSec: 6.5,
      durationSec: 4.5,
      x: 50,
      y: 50,
      fontSize: 38,
      fontFamily: 'Impact',
      color: '#fbbf24',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      animation: 'pop',
      align: 'center',
      bold: true,
    },
  ]);

  const [selectedClipId, setSelectedClipId] = useState<string | null>(clips[0]?.id || null);

  // Filters & Adjustments
  const [filters, setFilters] = useState<FilterSettings>({
    preset: 'none',
    brightness: 100,
    contrast: 105,
    saturate: 105,
    temperature: 0,
    sepia: 0,
    blur: 0,
    grain: 12,
    vignette: 15,
    letterbox: false,
    speed: 1,
  });

  // Modal triggers
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [isTextToVideoOpen, setIsTextToVideoOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Canvas and hidden media refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const hiddenImageRef = useRef<HTMLImageElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number>(performance.now());

  // Image element cache for multi-photo and photo AI clips
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Calculate project total duration
  const totalDuration = Math.max(
    clips.reduce((max, c) => Math.max(max, c.startSec + c.durationSec), 6),
    audioClips.reduce((max, a) => Math.max(max, a.startSec + a.durationSec), 0)
  );

  // Find active clip at current playhead
  const currentActiveClip = clips.find(
    (c) => currentTime >= c.startSec && currentTime < c.startSec + c.durationSec
  ) || clips[clips.length - 1] || null;

  // Render loop
  const renderCurrentFrame = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    let mediaEl: HTMLVideoElement | HTMLImageElement | null = null;
    let multiImages: HTMLImageElement[] | undefined = undefined;

    if (currentActiveClip) {
      if (currentActiveClip.sourceMediaType === 'image' && currentActiveClip.sourceMediaUrls && currentActiveClip.sourceMediaUrls.length > 0) {
        multiImages = currentActiveClip.sourceMediaUrls
          .map((url) => imageCacheRef.current.get(url))
          .filter((img): img is HTMLImageElement => !!img && img.complete);
      } else if (currentActiveClip.type === 'video' || currentActiveClip.sourceMediaType === 'video') {
        mediaEl = hiddenVideoRef.current;
      } else {
        mediaEl = hiddenImageRef.current;
      }
    }

    CanvasRenderer.renderFrame(canvas, {
      currentTime,
      totalDuration,
      activeClip: currentActiveClip,
      mediaElement: mediaEl,
      multiImageElements: multiImages,
      textOverlays,
      filters,
      aspectRatio,
    });
  }, [currentTime, totalDuration, currentActiveClip, textOverlays, filters, aspectRatio]);

  // Adjust canvas dimensions when aspect ratio changes
  useEffect(() => {
    if (!canvasRef.current) return;
    const { width, height } = CanvasRenderer.getDimensions(aspectRatio);
    canvasRef.current.width = width;
    canvasRef.current.height = height;
    renderCurrentFrame();
  }, [aspectRatio, renderCurrentFrame]);

  // Pre-load images & videos for active clip compositing
  useEffect(() => {
    if (!currentActiveClip) return;

    // Load multi-photo AI sequences
    if (currentActiveClip.sourceMediaUrls && currentActiveClip.sourceMediaUrls.length > 0) {
      currentActiveClip.sourceMediaUrls.forEach((url) => {
        if (!imageCacheRef.current.has(url)) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = url;
          img.onload = () => {
            renderCurrentFrame();
          };
          imageCacheRef.current.set(url, img);
        }
      });
    }

    // Load single image
    if (currentActiveClip.type === 'image') {
      const media = mediaItems.find((m) => m.id === currentActiveClip.mediaId);
      const url = currentActiveClip.thumbnail || media?.url || currentActiveClip.sourceMediaUrls?.[0];
      if (url && hiddenImageRef.current) {
        hiddenImageRef.current.src = url;
        hiddenImageRef.current.onload = () => {
          renderCurrentFrame();
        };
      }
    }

    // Synchronize video element if active clip is a video
    if (currentActiveClip.type === 'video' || currentActiveClip.sourceMediaType === 'video') {
      const media = mediaItems.find((m) => m.id === currentActiveClip.mediaId);
      const url = currentActiveClip.sourceMediaUrls?.[0] || media?.url;
      if (url && hiddenVideoRef.current) {
        if (hiddenVideoRef.current.src !== url) {
          hiddenVideoRef.current.src = url;
          hiddenVideoRef.current.load();
        }
        const targetSec = Math.max(0, currentTime - currentActiveClip.startSec + (currentActiveClip.trimStart || 0));
        if (Math.abs(hiddenVideoRef.current.currentTime - targetSec) > 0.3) {
          hiddenVideoRef.current.currentTime = targetSec;
        }
        if (isPlaying && hiddenVideoRef.current.paused) {
          hiddenVideoRef.current.play().catch(() => {});
        } else if (!isPlaying && !hiddenVideoRef.current.paused) {
          hiddenVideoRef.current.pause();
        }
      }
    }
  }, [currentActiveClip, currentTime, isPlaying, mediaItems, renderCurrentFrame]);

  // Timeline playback ticker
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      audioEngine.stopPreview();
      return;
    }

    lastTickTimeRef.current = performance.now();

    // Start background audio if present
    const activeAudio = audioClips.find(
      (a) => currentTime >= a.startSec && currentTime < a.startSec + a.durationSec
    );
    if (activeAudio && !isMuted) {
      const offset = activeAudio.trimStart + (currentTime - activeAudio.startSec);
      audioEngine.playPreview(activeAudio.trackId, offset, activeAudio.durationSec);
    }

    const tick = () => {
      const now = performance.now();
      const deltaSec = ((now - lastTickTimeRef.current) / 1000) * filters.speed;
      lastTickTimeRef.current = now;

      setCurrentTime((prev) => {
        const next = prev + deltaSec;
        if (next >= totalDuration) {
          setIsPlaying(false);
          audioEngine.stopPreview();
          return 0;
        }
        return next;
      });

      renderCurrentFrame();
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      audioEngine.stopPreview();
    };
  }, [isPlaying, totalDuration, filters.speed, isMuted, renderCurrentFrame]);

  // Keyboard shortcut listener (Spacebar for play/pause)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowLeft') {
        setCurrentTime((t) => Math.max(0, t - 0.5));
      } else if (e.code === 'ArrowRight') {
        setCurrentTime((t) => Math.min(totalDuration, t + 0.5));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalDuration]);

  // Seeking
  const handleSeek = (time: number) => {
    setCurrentTime(time);
    renderCurrentFrame();
  };

  // Add media to timeline
  const handleAddMediaToTimeline = (item: MediaItem) => {
    const newClip: TimelineClip = {
      id: `clip-${Date.now()}`,
      mediaId: item.id,
      name: item.name,
      type: item.type,
      startSec: clips.reduce((acc, c) => Math.max(acc, c.startSec + c.durationSec), 0),
      durationSec: item.duration || 5,
      trimStart: 0,
      trimEnd: item.duration || 5,
      volume: 1,
      speed: 1,
      thumbnail: item.thumbnail || item.url,
      isAiGenerated: item.isAiGenerated,
      aiSceneData: item.aiSceneData,
    };
    setClips((prev) => [...prev, newClip]);
    setSelectedClipId(newClip.id);
  };

  // Upload user files
  const handleUploadMedia = (files: FileList) => {
    Array.from(files).forEach((file) => {
      const isVideo = file.type.startsWith('video');
      const isImage = file.type.startsWith('image');
      const isAudio = file.type.startsWith('audio');
      const url = URL.createObjectURL(file);

      if (isAudio) {
        setIsAudioModalOpen(true);
        return;
      }

      const newItem: MediaItem = {
        id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        type: isVideo ? 'video' : 'image',
        url,
        duration: isVideo ? 8 : 5,
        thumbnail: isImage ? url : undefined,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      };

      setMediaItems((prev) => [newItem, ...prev]);
      handleAddMediaToTimeline(newItem);
    });
  };

  // Split clip at playhead
  const handleSplitClip = (clipId: string, splitTime: number) => {
    const clipIndex = clips.findIndex((c) => c.id === clipId);
    if (clipIndex === -1) return;
    const target = clips[clipIndex];

    if (splitTime <= target.startSec || splitTime >= target.startSec + target.durationSec) return;

    const firstDuration = splitTime - target.startSec;
    const secondDuration = target.durationSec - firstDuration;

    const firstClip: TimelineClip = {
      ...target,
      durationSec: firstDuration,
      trimEnd: target.trimStart + firstDuration,
    };

    const secondClip: TimelineClip = {
      ...target,
      id: `clip-${Date.now()}`,
      startSec: splitTime,
      durationSec: secondDuration,
      trimStart: target.trimStart + firstDuration,
    };

    const newClips = [...clips];
    newClips.splice(clipIndex, 1, firstClip, secondClip);
    setClips(newClips);
    setSelectedClipId(secondClip.id);
  };

  // Delete clip
  const handleDeleteClip = (clipId: string) => {
    setClips((prev) => prev.filter((c) => c.id !== clipId));
    if (selectedClipId === clipId) setSelectedClipId(null);
  };

  // Duplicate clip
  const handleDuplicateClip = (clipId: string) => {
    const target = clips.find((c) => c.id === clipId);
    if (!target) return;
    const duplicate: TimelineClip = {
      ...target,
      id: `clip-${Date.now()}`,
      startSec: clips.reduce((acc, c) => Math.max(acc, c.startSec + c.durationSec), 0),
    };
    setClips((prev) => [...prev, duplicate]);
    setSelectedClipId(duplicate.id);
  };

  // Add Audio from Instagram Audio Picker
  const handleSelectAudioTrack = (trackData: any) => {
    const newAudio: AudioTrackClip = {
      id: `audio-${Date.now()}`,
      trackId: trackData.trackId,
      title: trackData.title,
      artist: trackData.artist,
      coverUrl: trackData.coverUrl,
      startSec: 0,
      durationSec: trackData.durationSec,
      trimStart: trackData.trimStart,
      volume: 0.8,
      isVoiceover: trackData.isVoiceover,
      audioBuffer: trackData.audioBuffer,
    };
    setAudioClips([newAudio]); // Single primary background track
  };

  // Snapshot frame still
  const handleTakeSnapshot = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `cineflow-frame-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-neutral-950 text-neutral-100 overflow-hidden font-sans select-none">
      
      {/* Hidden media elements for canvas compositing */}
      <video ref={hiddenVideoRef} className="hidden" crossOrigin="anonymous" playsInline />
      <img ref={hiddenImageRef} className="hidden" crossOrigin="anonymous" alt="composite source" />

      {/* TOP BAR CONTRACT:
          Zone 1: Wordmark brand
          Zone 2: 4-5 single line nav links
          Zone 3: 1 primary action button */}
      <header className="h-14 border-b border-neutral-800 bg-neutral-950 px-6 flex items-center justify-between gap-8 shrink-0 z-40">
        
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-amber-400 text-neutral-950 flex items-center justify-center font-black shadow-md">
            <Film className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
            CineFlow Studio
          </span>
        </div>

        {/* Zone 2: Navigation & Mode Tabs */}
        <nav className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
          <button
            onClick={() => setActiveTab('media')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'media' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Media
          </button>
          
          <button
            onClick={() => {
              setActiveTab('ai');
              setIsTextToVideoOpen(true);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'ai' ? 'bg-amber-400/20 text-amber-300 font-semibold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> AI Video
          </button>

          <button
            onClick={() => {
              setActiveTab('audio');
              setIsAudioModalOpen(true);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'audio' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Music className="w-3.5 h-3.5 text-emerald-400" /> Music & Audio
          </button>

          <button
            onClick={() => setActiveTab('effects')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'effects' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-sky-400" /> Effects & Filters
          </button>

          <button
            onClick={() => setActiveTab('text')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'text' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5 text-purple-400" /> Captions
          </button>
        </nav>

        {/* Zone 3: Aspect Ratio & Primary CTA */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Aspect Ratio Switcher */}
          <div className="flex items-center gap-0.5 bg-neutral-900 p-0.5 rounded-lg border border-neutral-800 text-xs text-neutral-400">
            <button
              onClick={() => setAspectRatio('16:9')}
              className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                aspectRatio === '16:9' ? 'bg-neutral-800 text-white font-medium' : 'hover:text-white'
              }`}
              title="16:9 Widescreen"
            >
              <Tv className="w-3 h-3" /> 16:9
            </button>
            <button
              onClick={() => setAspectRatio('9:16')}
              className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                aspectRatio === '9:16' ? 'bg-neutral-800 text-white font-medium' : 'hover:text-white'
              }`}
              title="9:16 Vertical Story / Reel"
            >
              <Smartphone className="w-3 h-3" /> 9:16
            </button>
            <button
              onClick={() => setAspectRatio('1:1')}
              className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                aspectRatio === '1:1' ? 'bg-neutral-800 text-white font-medium' : 'hover:text-white'
              }`}
              title="1:1 Square Feed"
            >
              <Square className="w-3 h-3" /> 1:1
            </button>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export Movie
          </button>
        </div>

      </header>

      {/* Main Studio Middle Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side Editing Drawer */}
        <aside className="w-80 border-r border-neutral-800 bg-neutral-900/30 flex flex-col shrink-0 overflow-hidden">
          {activeTab === 'media' && (
            <MediaLibraryDrawer
              mediaItems={mediaItems}
              onUploadMedia={handleUploadMedia}
              onAddMediaToTimeline={handleAddMediaToTimeline}
              onDeleteMedia={(id) => setMediaItems((prev) => prev.filter((m) => m.id !== id))}
              onOpenTextToVideo={() => setIsTextToVideoOpen(true)}
            />
          )}

          {activeTab === 'ai' && (
            <div className="p-4 space-y-4">
              <div className="p-4 border border-amber-500/30 bg-amber-500/10 rounded-xl space-y-2">
                <h4 className="text-sm font-semibold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Generate Video with AI
                </h4>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Upload photos & videos, choose matching soundtracks, and direct 20-second cinematic scenes with Gemini 3.8 Flash.
                </p>
                <button
                  onClick={() => setIsTextToVideoOpen(true)}
                  className="w-full py-2.5 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg mt-2 transition-colors flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Open AI Video Studio (20s)
                </button>
              </div>
            </div>
          )}

          {activeTab === 'audio' && (
            <div className="p-4 space-y-4">
              <div className="p-4 border border-emerald-500/30 bg-emerald-500/10 rounded-xl space-y-2">
                <h4 className="text-sm font-semibold text-emerald-300 flex items-center gap-1.5">
                  <Music className="w-4 h-4" /> Instagram Audio Picker
                </h4>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Choose from royalty-free trending tracks, upload your own songs with waveform trimming, or record live voiceover.
                </p>
                <button
                  onClick={() => setIsAudioModalOpen(true)}
                  className="w-full py-2 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg mt-2 transition-colors"
                >
                  Browse Music & Songs
                </button>
              </div>
            </div>
          )}

          {activeTab === 'effects' && (
            <EffectsFiltersPanel
              filters={filters}
              onChange={setFilters}
            />
          )}

          {activeTab === 'text' && (
            <TextOverlayEditor
              texts={textOverlays}
              currentTime={currentTime}
              totalDuration={totalDuration}
              onAddText={(t) => setTextOverlays((prev) => [...prev, t])}
              onUpdateText={(id, updates) =>
                setTextOverlays((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
              }
              onDeleteText={(id) => setTextOverlays((prev) => prev.filter((t) => t.id !== id))}
            />
          )}
        </aside>

        {/* Center Canvas Preview Viewport */}
        <main className="flex-1 flex flex-col bg-neutral-950 relative overflow-hidden items-center justify-center p-4">
          
          {/* Main Rendering Canvas Container */}
          <div className="relative flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl border border-neutral-800 bg-black">
            <canvas
              ref={canvasRef}
              className="max-h-[50vh] max-w-full object-contain"
            />

            {/* Quick floating snapshot button */}
            <button
              onClick={handleTakeSnapshot}
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/90 backdrop-blur-md rounded-xl text-neutral-300 hover:text-white transition-colors"
              title="Capture PNG Still"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* Floating Player Transport Bar */}
          <div className="mt-4 flex items-center gap-4 bg-neutral-900/90 border border-neutral-800 px-5 py-2.5 rounded-2xl shadow-xl backdrop-blur-md">
            
            <button
              onClick={() => handleSeek(0)}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              title="Return to start"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="w-10 h-10 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 flex items-center justify-center transition-colors shadow-md"
              title="Play / Pause (Spacebar)"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-neutral-950" /> : <Play className="w-5 h-5 fill-neutral-950 translate-x-0.5" />}
            </button>

            {/* Timecode */}
            <div className="font-mono text-xs tabular-nums text-neutral-300 font-semibold px-2">
              <span>{Math.floor(currentTime / 60).toString().padStart(2, '0')}:{(currentTime % 60).toFixed(1).padStart(4, '0')}</span>
              <span className="text-neutral-600 mx-1">/</span>
              <span className="text-neutral-500">{Math.floor(totalDuration / 60).toString().padStart(2, '0')}:{(totalDuration % 60).toFixed(1).padStart(4, '0')}</span>
            </div>

            {/* Mute Toggle */}
            <button
              onClick={() => setIsMuted((m) => !m)}
              className={`p-1.5 rounded-lg transition-colors ${
                isMuted ? 'text-red-400 hover:bg-neutral-800' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

          </div>

        </main>

      </div>

      {/* Bottom Multi-Track Timeline */}
      <Timeline
        clips={clips}
        audioClips={audioClips}
        textOverlays={textOverlays}
        currentTime={currentTime}
        totalDuration={totalDuration}
        isPlaying={isPlaying}
        selectedClipId={selectedClipId}
        onSelectClip={setSelectedClipId}
        onSeek={handleSeek}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        onSplitClip={handleSplitClip}
        onDeleteClip={handleDeleteClip}
        onDuplicateClip={handleDuplicateClip}
        onDeleteAudioClip={(id) => setAudioClips((prev) => prev.filter((a) => a.id !== id))}
        onDeleteText={(id) => setTextOverlays((prev) => prev.filter((t) => t.id !== id))}
        onOpenAudioModal={() => setIsAudioModalOpen(true)}
        onOpenTextToVideo={() => setIsTextToVideoOpen(true)}
      />

      {/* Instagram Music & Audio Modal */}
      <InstagramAudioModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
        onSelectTrack={handleSelectAudioTrack}
      />

      {/* AI Generate Video Modal */}
      <TextToVideoModal
        isOpen={isTextToVideoOpen}
        onClose={() => setIsTextToVideoOpen(false)}
        aspectRatio={aspectRatio}
        projectMedia={mediaItems}
        onVideoGenerated={(newClip, selectedAudio, newMediaItems) => {
          if (newMediaItems && newMediaItems.length > 0) {
            setMediaItems((prev) => [...newMediaItems, ...prev]);
          }

          // Calculate sequential timeline start
          const nextStart = clips.reduce((acc, c) => Math.max(acc, c.startSec + c.durationSec), 0);
          const positionedClip: TimelineClip = {
            ...newClip,
            startSec: nextStart,
          };

          setClips((prev) => [...prev, positionedClip]);
          setSelectedClipId(positionedClip.id);
          setCurrentTime(nextStart);

          // Add synchronized soundtrack audio track if selected
          if (selectedAudio) {
            const newAudioClip: AudioTrackClip = {
              id: `audio-${Date.now()}`,
              trackId: selectedAudio.trackId,
              title: selectedAudio.title,
              artist: selectedAudio.artist,
              coverUrl: selectedAudio.coverUrl,
              startSec: nextStart,
              durationSec: positionedClip.durationSec, // Synced to 20s
              trimStart: selectedAudio.trimStart || 0,
              volume: 0.8,
              audioBuffer: selectedAudio.audioBuffer,
            };
            setAudioClips((prev) => [...prev, newAudioClip]);
          }
        }}
      />

      {/* Video Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        aspectRatio={aspectRatio}
        clips={clips}
        textOverlays={textOverlays}
        filters={filters}
        totalDuration={totalDuration}
        previewCanvas={canvasRef.current}
      />

    </div>
  );
}
