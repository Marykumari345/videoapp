import React, { useState, useRef, useEffect } from 'react';
import { 
  Wand2, 
  X, 
  Sparkles, 
  Film, 
  Image as ImageIcon, 
  Upload, 
  Music, 
  Play, 
  Pause, 
  Maximize2, 
  Clock, 
  Compass, 
  Palette, 
  Loader2, 
  CheckCircle2, 
  Trash2, 
  Plus, 
  Volume2, 
  VolumeX, 
  Check, 
  FolderPlus,
  Sliders
} from 'lucide-react';
import { AspectRatio, TimelineClip, AiSceneData, MediaItem, RoyaltySong, AudioTrackClip } from '../types/editor';
import { ROYALTY_FREE_LIBRARY, audioEngine } from '../utils/audioEngine';

interface TextToVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  aspectRatio: AspectRatio;
  projectMedia?: MediaItem[];
  onVideoGenerated: (
    clip: TimelineClip,
    selectedAudio?: {
      trackId: string;
      title: string;
      artist: string;
      coverUrl?: string;
      trimStart: number;
      durationSec: number;
      audioBuffer?: AudioBuffer;
    },
    newMediaItems?: MediaItem[]
  ) => void;
}

interface UploadedMediaFile {
  id: string;
  file?: File;
  name: string;
  url: string;
  type: 'image' | 'video';
  duration?: number;
  size?: string;
}

const PRESET_IDEAS = [
  {
    title: 'Neon Tokyo Alley',
    prompt: 'Vertical neon alley in Tokyo after heavy rain, wet pavement reflections, atmospheric cyberpunk teal and amber rim lighting',
    style: 'Cyberpunk Neon',
    ratio: '9:16' as AspectRatio,
  },
  {
    title: 'Nordic Dawn Fjord',
    prompt: 'Cinematic wide fjord with morning mist rolling over calm deep water, rocky pine cliffs, golden sunrise breaking through clouds',
    style: 'Cinematic Film',
    ratio: '16:9' as AspectRatio,
  },
  {
    title: 'Retro Sunset Grid',
    prompt: 'Retro 80s synthwave horizon with glowing neon geometric sun, distant digital mountains, and perspective grid highway',
    style: 'Retro VHS',
    ratio: '16:9' as AspectRatio,
  },
  {
    title: 'Cosmic Nebula Flow',
    prompt: 'Deep interstellar cosmic nebula with swirling violet dust motes, radiant starlight bursts, and slow celestial drift',
    style: 'Cinematic Film',
    ratio: '1:1' as AspectRatio,
  },
];

export const TextToVideoModal: React.FC<TextToVideoModalProps> = ({
  isOpen,
  onClose,
  aspectRatio: initialRatio,
  projectMedia = [],
  onVideoGenerated,
}) => {
  // Visual Media Source Mode: Text only, Uploaded Photos, or Uploaded Video
  const [mediaMode, setMediaMode] = useState<'text' | 'photos' | 'video'>('photos');

  // Text Prompt & Presets
  const [prompt, setPrompt] = useState('Cinematic aerial flyover with golden morning sunlight reflecting on water, cinematic 35mm film grain');
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>(initialRatio);
  const [style, setStyle] = useState('Cinematic Film');
  const [cameraMotion, setCameraMotion] = useState<'slow_zoom_in' | 'pan_right' | 'drift_up'>('slow_zoom_in');
  const [particles, setParticles] = useState<AiSceneData['particles']>('glowing_embers');
  
  // Clip Duration: defaulted to 20 seconds as requested
  const [duration, setDuration] = useState<number>(20);

  // Uploaded Photos & Video
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedMediaFile[]>([]);
  const [uploadedVideo, setUploadedVideo] = useState<UploadedMediaFile | null>(null);

  // Audio Selection State
  const [audioMode, setAudioMode] = useState<'library' | 'upload' | 'none'>('library');
  const [selectedSong, setSelectedSong] = useState<RoyaltySong | null>(ROYALTY_FREE_LIBRARY[0]);
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const [uploadedAudio, setUploadedAudio] = useState<{
    id: string;
    file: File;
    name: string;
    duration: number;
    buffer?: AudioBuffer;
  } | null>(null);

  // UI Loaders
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');

  // Refs for hidden inputs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Cleanup audio preview on unmount or close
  useEffect(() => {
    return () => {
      audioEngine.stopPreview();
    };
  }, []);

  if (!isOpen) return null;

  // Handle Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    const newPhotos: UploadedMediaFile[] = files.map((file) => ({
      id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      file,
      name: file.name.replace(/\.[^/.]+$/, ''),
      url: URL.createObjectURL(file),
      type: 'image',
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    }));
    setUploadedPhotos((prev) => [...prev, ...newPhotos]);
    setMediaMode('photos');
    e.target.value = '';
  };

  // Add existing project photo
  const handleAddProjectMediaPhoto = (item: MediaItem) => {
    const existing = uploadedPhotos.find((p) => p.url === item.url);
    if (existing) return;
    setUploadedPhotos((prev) => [
      ...prev,
      {
        id: item.id,
        name: item.name,
        url: item.url,
        type: 'image',
      },
    ]);
    setMediaMode('photos');
  };

  const handleRemovePhoto = (id: string) => {
    setUploadedPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // Handle Video Upload
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedVideo({
      id: `video-${Date.now()}`,
      file,
      name: file.name.replace(/\.[^/.]+$/, ''),
      url,
      type: 'video',
      duration: 20,
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    });
    setMediaMode('video');
    e.target.value = '';
  };

  // Add existing project video
  const handleAddProjectMediaVideo = (item: MediaItem) => {
    setUploadedVideo({
      id: item.id,
      name: item.name,
      url: item.url,
      type: 'video',
      duration: item.duration || 20,
    });
    setMediaMode('video');
  };

  // Handle Custom Audio Upload
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { buffer, duration: audioDur } = await audioEngine.loadAudioFile(file);
      const audioId = `custom-ai-audio-${Date.now()}`;
      audioEngine.cacheBuffer(audioId, buffer);

      setUploadedAudio({
        id: audioId,
        file,
        name: file.name.replace(/\.[^/.]+$/, ''),
        duration: audioDur,
        buffer,
      });
      setAudioMode('upload');
      setSelectedSong(null);
    } catch (err) {
      console.error('Audio load error:', err);
    }
    e.target.value = '';
  };

  // Audio preview playback toggle
  const handleToggleSongPreview = (song: RoyaltySong) => {
    if (playingSongId === song.id) {
      audioEngine.stopPreview();
      setPlayingSongId(null);
    } else {
      setSelectedSong(song);
      setPlayingSongId(song.id);
      audioEngine.playPreview(song.id, 0, duration, () => {
        setPlayingSongId(null);
      });
    }
  };

  const handleToggleUploadedAudioPreview = () => {
    if (!uploadedAudio) return;
    if (playingSongId === uploadedAudio.id) {
      audioEngine.stopPreview();
      setPlayingSongId(null);
    } else {
      setPlayingSongId(uploadedAudio.id);
      audioEngine.playPreview(uploadedAudio.id, 0, duration, () => {
        setPlayingSongId(null);
      });
    }
  };

  // AI Prompt Enhancement
  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    setIsEnhancing(true);
    try {
      const res = await fetch('/api/ai/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.enhancedPrompt) {
        setPrompt(data.enhancedPrompt);
      }
    } catch (err) {
      console.error('Enhance error:', err);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Main Generate Video function
  const handleGenerate = async () => {
    setIsGenerating(true);
    audioEngine.stopPreview();
    setPlayingSongId(null);

    setGenerationStep('Directing 20-second cinematic scene with Gemini 3.8 Flash...');

    try {
      const res = await fetch('/api/ai/direct-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt || 'Cinematic visual sequence with dynamic camera & lighting',
          aspectRatio: selectedRatio,
          duration,
          style,
          mediaType: mediaMode === 'photos' ? 'photos' : mediaMode === 'video' ? 'video' : 'generative',
          audioMood: selectedSong?.mood || 'Cinematic',
        }),
      });

      setGenerationStep('Synthesizing dynamic motion & particle shaders for 20s clip...');
      const data = await res.json();

      const scene: AiSceneData = data.scene || {
        title: prompt.slice(0, 24) || 'AI Cinematic Scene',
        cinematicStyle: style,
        cameraMotion,
        palette: {
          primary: '#1e293b',
          secondary: '#334155',
          accent: '#38bdf8',
          ambient: '#090d16',
        },
        particles: particles || 'glowing_embers',
        sceneType: 'landscape',
        lightingMood: 'Atmospheric natural lighting',
        suggestedCaption: prompt.slice(0, 32),
        musicMood: selectedSong?.mood || 'Cinematic Ambient',
        pacingBpm: selectedSong?.bpm || 80,
      };

      // Collect source media URLs
      let sourceUrls: string[] = [];
      let finalMediaType: 'image' | 'video' | 'none' = 'none';
      let clipThumb: string | undefined = undefined;

      if (mediaMode === 'photos' && uploadedPhotos.length > 0) {
        sourceUrls = uploadedPhotos.map((p) => p.url);
        finalMediaType = 'image';
        clipThumb = uploadedPhotos[0].url;
      } else if (mediaMode === 'video' && uploadedVideo) {
        sourceUrls = [uploadedVideo.url];
        finalMediaType = 'video';
        clipThumb = uploadedVideo.url;
      }

      // Create new Timeline clip with requested 20s duration
      const newClip: TimelineClip = {
        id: `ai-clip-${Date.now()}`,
        mediaId: `ai-scene-${Date.now()}`,
        name: (mediaMode === 'photos' && uploadedPhotos.length > 0)
          ? `${uploadedPhotos[0].name} (AI 20s)`
          : (mediaMode === 'video' && uploadedVideo)
          ? `${uploadedVideo.name} (AI 20s)`
          : scene.title || 'AI 20s Scene',
        type: finalMediaType === 'video' ? 'video' : 'image',
        startSec: 0,
        durationSec: duration, // 20s default
        trimStart: 0,
        trimEnd: duration,     // 20s default
        volume: 1,
        speed: 1,
        isAiGenerated: true,
        sourceMediaType: finalMediaType,
        sourceMediaUrls: sourceUrls,
        thumbnail: clipThumb,
        aiSceneData: {
          ...scene,
          cameraMotion,
          particles,
          sourceMediaUrls: sourceUrls,
          sourceMediaType: finalMediaType,
        },
      };

      // Prepare Audio Track Data if user selected audio
      let audioTrackData = undefined;
      if (audioMode === 'library' && selectedSong) {
        audioTrackData = {
          trackId: selectedSong.id,
          title: selectedSong.title,
          artist: selectedSong.artist,
          coverUrl: selectedSong.coverUrl,
          trimStart: 0,
          durationSec: duration, // Synced to 20s clip duration
        };
      } else if (audioMode === 'upload' && uploadedAudio) {
        audioTrackData = {
          trackId: uploadedAudio.id,
          title: uploadedAudio.name,
          artist: 'My Audio Track',
          trimStart: 0,
          durationSec: duration, // Synced to 20s clip duration
          audioBuffer: uploadedAudio.buffer,
        };
      }

      // Convert newly uploaded files to MediaItem so they appear in Project Assets
      const newMediaItems: MediaItem[] = [];
      if (mediaMode === 'photos') {
        uploadedPhotos.forEach((p) => {
          newMediaItems.push({
            id: p.id,
            name: p.name,
            type: 'image',
            url: p.url,
            thumbnail: p.url,
            duration,
            size: p.size,
          });
        });
      } else if (mediaMode === 'video' && uploadedVideo) {
        newMediaItems.push({
          id: uploadedVideo.id,
          name: uploadedVideo.name,
          type: 'video',
          url: uploadedVideo.url,
          duration,
          size: uploadedVideo.size,
        });
      }

      setGenerationStep('Syncing audio and placing 20s video on timeline...');
      setTimeout(() => {
        onVideoGenerated(newClip, audioTrackData, newMediaItems);
        setIsGenerating(false);
        onClose();
      }, 500);

    } catch (err) {
      console.error('Video generation error:', err);
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-neutral-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20">
              <Sparkles className="w-5 h-5 fill-neutral-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white tracking-tight">Generate Video with AI</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 rounded-full border border-amber-400/30">
                  20s Pro Scene
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Upload photos & videos, direct with prompt, choose audio soundtrack, and render 20-second cinematic scenes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* 1. VISUAL MEDIA SOURCE SECTION: Photos, Video, or Text-only */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5 uppercase tracking-wider">
                <Sliders className="w-3.5 h-3.5 text-amber-400" /> 1. Visual Media Source
              </label>
              <span className="text-[11px] text-neutral-400">
                Upload your own photos or video to animate
              </span>
            </div>

            {/* Mode Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-neutral-950/80 rounded-xl border border-neutral-800">
              <button
                type="button"
                onClick={() => setMediaMode('photos')}
                className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  mediaMode === 'photos'
                    ? 'bg-amber-400 text-neutral-950 font-bold shadow-md'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Upload Photos</span>
                {uploadedPhotos.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    mediaMode === 'photos' ? 'bg-neutral-950 text-amber-300' : 'bg-amber-400/20 text-amber-300'
                  }`}>
                    {uploadedPhotos.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMediaMode('video')}
                className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  mediaMode === 'video'
                    ? 'bg-amber-400 text-neutral-950 font-bold shadow-md'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Upload Video</span>
                {uploadedVideo && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    mediaMode === 'video' ? 'bg-neutral-950 text-amber-300' : 'bg-amber-400/20 text-amber-300'
                  }`}>
                    1
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMediaMode('text')}
                className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  mediaMode === 'text'
                    ? 'bg-amber-400 text-neutral-950 font-bold shadow-md'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Prompt Only (Generative)</span>
              </button>
            </div>

            {/* PHOTOS UPLOAD ZONE */}
            {mediaMode === 'photos' && (
              <div className="space-y-3 p-4 rounded-xl border border-neutral-800 bg-neutral-950/50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-neutral-300">
                      Uploaded Photos ({uploadedPhotos.length})
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Sequenced across 20s with dynamic Ken-Burns motion & particle shaders
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Add from project assets if any exist */}
                    {projectMedia.filter((m) => m.type === 'image').length > 0 && (
                      <div className="relative group">
                        <button
                          type="button"
                          className="px-2.5 py-1 text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg flex items-center gap-1 transition-colors border border-neutral-700"
                        >
                          <FolderPlus className="w-3 h-3 text-amber-400" /> Project Photos
                        </button>
                        <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col bg-neutral-900 border border-neutral-700 rounded-xl p-2 shadow-2xl z-20 w-56 space-y-1">
                          <p className="text-[10px] text-neutral-400 px-1 font-semibold">Select from project:</p>
                          {projectMedia
                            .filter((m) => m.type === 'image')
                            .map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleAddProjectMediaPhoto(item)}
                                className="w-full text-left p-1.5 rounded-lg hover:bg-neutral-800 flex items-center gap-2 text-xs text-neutral-200"
                              >
                                <img
                                  src={item.thumbnail || item.url}
                                  alt={item.name}
                                  className="w-6 h-6 object-cover rounded"
                                />
                                <span className="truncate flex-1">{item.name}</span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="px-3 py-1 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Upload className="w-3 h-3" /> Upload Photos
                    </button>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Photo Previews Grid */}
                {uploadedPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    {uploadedPhotos.map((photo, index) => (
                      <div
                        key={photo.id}
                        className="group relative aspect-video rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900 shadow-md"
                      >
                        <img
                          src={photo.url}
                          alt={photo.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                        {/* Slide order badge */}
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[9px] font-bold bg-black/70 backdrop-blur-md rounded text-amber-300 border border-white/10">
                          Slide {index + 1}
                        </span>

                        {/* Title */}
                        <span className="absolute bottom-1.5 left-1.5 right-6 text-[10px] text-neutral-200 truncate font-medium">
                          {photo.name}
                        </span>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(photo.id)}
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 hover:bg-red-500 text-white transition-colors opacity-90 group-hover:opacity-100"
                          title="Remove photo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {/* Add more tile */}
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="aspect-video rounded-xl border border-dashed border-neutral-700 hover:border-amber-400/80 bg-neutral-900/40 hover:bg-neutral-800/50 flex flex-col items-center justify-center gap-1 text-neutral-400 hover:text-amber-300 transition-all"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="text-[11px] font-medium">+ Add Photo</span>
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => photoInputRef.current?.click()}
                    className="p-6 border-2 border-dashed border-neutral-800 hover:border-amber-400/70 rounded-xl bg-neutral-950/40 hover:bg-neutral-900/30 flex flex-col items-center justify-center cursor-pointer transition-all text-center group"
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform mb-2">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-neutral-200 group-hover:text-amber-300 transition-colors">
                      Click to upload photos (JPG, PNG, WebP)
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      You can select multiple photos. They will be animated smoothly with camera motion over the 20s clip.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* VIDEO UPLOAD ZONE */}
            {mediaMode === 'video' && (
              <div className="space-y-3 p-4 rounded-xl border border-neutral-800 bg-neutral-950/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-neutral-300">Uploaded Video Clip</span>
                    <span className="text-[11px] text-neutral-500">
                      Layer dynamic AI shaders & camera motion onto your footage
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {projectMedia.filter((m) => m.type === 'video').length > 0 && (
                      <div className="relative group">
                        <button
                          type="button"
                          className="px-2.5 py-1 text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg flex items-center gap-1 transition-colors border border-neutral-700"
                        >
                          <FolderPlus className="w-3 h-3 text-amber-400" /> Project Videos
                        </button>
                        <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col bg-neutral-900 border border-neutral-700 rounded-xl p-2 shadow-2xl z-20 w-56 space-y-1">
                          <p className="text-[10px] text-neutral-400 px-1 font-semibold">Select from project:</p>
                          {projectMedia
                            .filter((m) => m.type === 'video')
                            .map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleAddProjectMediaVideo(item)}
                                className="w-full text-left p-1.5 rounded-lg hover:bg-neutral-800 flex items-center gap-2 text-xs text-neutral-200"
                              >
                                <Film className="w-4 h-4 text-neutral-400 shrink-0" />
                                <span className="truncate flex-1">{item.name}</span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      className="px-3 py-1 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Upload className="w-3 h-3" /> Upload Video
                    </button>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {uploadedVideo ? (
                  <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-20 aspect-video rounded-lg overflow-hidden bg-black shrink-0 relative">
                        <video src={uploadedVideo.url} className="w-full h-full object-cover" />
                        <span className="absolute bottom-0.5 right-0.5 px-1 text-[8px] bg-black/80 text-white rounded">
                          20s
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{uploadedVideo.name}</p>
                        <p className="text-[11px] text-neutral-400">{uploadedVideo.size || 'Video file'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        className="px-2.5 py-1 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 rounded-lg transition-colors"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadedVideo(null)}
                        className="p-1.5 text-neutral-500 hover:text-red-400 rounded-lg transition-colors"
                        title="Remove video"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => videoInputRef.current?.click()}
                    className="p-6 border-2 border-dashed border-neutral-800 hover:border-amber-400/70 rounded-xl bg-neutral-950/40 hover:bg-neutral-900/30 flex flex-col items-center justify-center cursor-pointer transition-all text-center group"
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform mb-2">
                      <Film className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-neutral-200 group-hover:text-amber-300 transition-colors">
                      Click to upload video (MP4, WebM, MOV)
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Your video will be styled with cinematic color grading, atmospheric particles, and dynamic camera movements.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. AUDIO & SOUNDTRACK SELECTION SECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5 uppercase tracking-wider">
                <Music className="w-3.5 h-3.5 text-emerald-400" /> 2. Audio & Soundtrack (Synced to 20s clip)
              </label>
              <span className="text-[11px] text-neutral-400">
                {audioMode === 'library' && selectedSong ? `Selected: ${selectedSong.title}` : audioMode === 'upload' && uploadedAudio ? `Selected: ${uploadedAudio.name}` : 'Muted'}
              </span>
            </div>

            {/* Audio Source Selector Tabs */}
            <div className="flex items-center gap-2 p-1 bg-neutral-950/80 rounded-xl border border-neutral-800">
              <button
                type="button"
                onClick={() => setAudioMode('library')}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  audioMode === 'library'
                    ? 'bg-emerald-500 text-neutral-950 font-bold shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Music className="w-3 h-3" /> Trending Library
              </button>

              <button
                type="button"
                onClick={() => setAudioMode('upload')}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  audioMode === 'upload'
                    ? 'bg-emerald-500 text-neutral-950 font-bold shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Upload className="w-3 h-3" /> Upload Audio (MP3/WAV)
              </button>

              <button
                type="button"
                onClick={() => {
                  setAudioMode('none');
                  setSelectedSong(null);
                  audioEngine.stopPreview();
                  setPlayingSongId(null);
                }}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  audioMode === 'none'
                    ? 'bg-neutral-700 text-white font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <VolumeX className="w-3 h-3" /> No Audio (Silent)
              </button>
            </div>

            {/* LIBRARY SONGS SELECTION GRID */}
            {audioMode === 'library' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {ROYALTY_FREE_LIBRARY.map((song) => {
                  const isSelected = selectedSong?.id === song.id;
                  const isPlaying = playingSongId === song.id;

                  return (
                    <div
                      key={song.id}
                      onClick={() => setSelectedSong(song)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-emerald-500/80 bg-emerald-500/10 shadow-sm'
                          : 'border-neutral-800 bg-neutral-950/60 hover:bg-neutral-900/60 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Play preview button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSongPreview(song);
                          }}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isPlaying
                              ? 'bg-emerald-400 text-neutral-950'
                              : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                          }`}
                          title={isPlaying ? 'Pause preview' : 'Play 20s preview'}
                        >
                          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />}
                        </button>

                        <div className="min-w-0">
                          <p className={`text-xs font-semibold truncate ${isSelected ? 'text-emerald-300' : 'text-neutral-200'}`}>
                            {song.title}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                            <span>{song.artist}</span>
                            <span>·</span>
                            <span className="text-emerald-400/90 font-medium">{song.genre}</span>
                            <span>·</span>
                            <span>{song.bpm} BPM</span>
                          </div>
                        </div>
                      </div>

                      {/* Selection radio/check */}
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'border-emerald-400 bg-emerald-400 text-neutral-950' : 'border-neutral-700'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* CUSTOM AUDIO UPLOAD */}
            {audioMode === 'upload' && (
              <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-neutral-200">Custom Audio Track</p>
                    <p className="text-[11px] text-neutral-400">Upload your own MP3, WAV, AAC, or M4A music track</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => audioInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" /> Select Audio File
                  </button>
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioUpload}
                    className="hidden"
                  />
                </div>

                {uploadedAudio && (
                  <div className="p-3 bg-neutral-900 rounded-xl border border-emerald-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleToggleUploadedAudioPreview}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          playingSongId === uploadedAudio.id
                            ? 'bg-emerald-400 text-neutral-950'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                        }`}
                      >
                        {playingSongId === uploadedAudio.id ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-0.5" />}
                      </button>
                      <div>
                        <p className="text-xs font-semibold text-white">{uploadedAudio.name}</p>
                        <p className="text-[11px] text-neutral-400">{Math.round(uploadedAudio.duration)}s duration · Custom Track</p>
                      </div>
                    </div>
                    <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Loaded
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. CLIP DURATION CONTROL: 20 SECONDS */}
          <div className="space-y-2.5 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> 3. Clip Duration: <span className="text-amber-400 font-bold">{duration} Seconds</span>
              </label>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-400 text-neutral-950 rounded-full shadow-sm">
                20s Feature
              </span>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">Presets:</span>
              {[5, 10, 15, 20, 30].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setDuration(sec)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    duration === sec
                      ? 'bg-amber-400 text-neutral-950 shadow-md ring-2 ring-amber-400/40'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white'
                  }`}
                >
                  {sec === 20 ? '20s (Default)' : `${sec}s`}
                </button>
              ))}
            </div>

            {/* Duration Slider */}
            <div className="flex items-center gap-3 pt-1">
              <input
                type="range"
                min={3}
                max={30}
                step={1}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <span className="font-mono text-xs text-amber-300 font-bold tabular-nums min-w-[36px] text-right">
                {duration}s
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Clip duration is set to <strong className="text-amber-300">{duration} seconds</strong>. Video animation, photo slideshow, and soundtrack audio will automatically render to this length.
            </p>
          </div>

          {/* 4. SCENE DIRECTING & PROMPT */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-neutral-200 flex items-center gap-1.5 uppercase tracking-wider">
                <Wand2 className="w-3.5 h-3.5 text-amber-400" /> 4. Scene Prompt & Directing Vision
              </label>
              <button
                type="button"
                onClick={handleEnhancePrompt}
                disabled={isEnhancing || !prompt.trim()}
                className="text-amber-400 hover:text-amber-300 disabled:opacity-40 flex items-center gap-1 font-medium transition-colors"
              >
                {isEnhancing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Enhance with Gemini
              </button>
            </div>
            
            <textarea
              rows={2}
              placeholder="Describe your scene in detail (e.g. Cinematic drone shot skimming over foggy pine mountains during sunrise, golden light reflection on river)..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-3 text-xs bg-neutral-950/70 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition-all resize-none leading-relaxed"
            />
          </div>

          {/* Quick preset inspirations */}
          <div className="space-y-2">
            <label className="text-xs text-neutral-400 font-medium">Quick Inspirations</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_IDEAS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPrompt(preset.prompt);
                    setStyle(preset.style);
                    setSelectedRatio(preset.ratio);
                  }}
                  className="p-2 text-left rounded-xl border border-neutral-800 bg-neutral-950/40 hover:bg-neutral-800/60 hover:border-neutral-700 transition-all group"
                >
                  <p className="text-xs font-semibold text-neutral-200 group-hover:text-amber-300 transition-colors">
                    {preset.title}
                  </p>
                  <p className="text-[10px] text-neutral-500 truncate mt-0.5">
                    {preset.prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
            
            {/* Aspect Ratio */}
            <div className="space-y-1">
              <label className="text-xs text-neutral-400 flex items-center gap-1">
                <Maximize2 className="w-3 h-3" /> Aspect Ratio
              </label>
              <select
                value={selectedRatio}
                onChange={(e) => setSelectedRatio(e.target.value as AspectRatio)}
                className="w-full px-2.5 py-1.5 text-xs bg-neutral-950/70 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-amber-400"
              >
                <option value="16:9">16:9 Landscape</option>
                <option value="9:16">9:16 Vertical Reel</option>
                <option value="1:1">1:1 Square</option>
              </select>
            </div>

            {/* Visual Style */}
            <div className="space-y-1">
              <label className="text-xs text-neutral-400 flex items-center gap-1">
                <Palette className="w-3 h-3" /> Visual Style
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-neutral-950/70 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-amber-400"
              >
                <option value="Cinematic Film">Cinematic 35mm Film</option>
                <option value="Cyberpunk Neon">Cyberpunk Neon</option>
                <option value="Warm Analog Vintage">Warm Analog Vintage</option>
                <option value="Retro VHS">Retro VHS Scanlines</option>
                <option value="Minimal Nature">Minimal Nature</option>
                <option value="Noir">Noir Monochromatic</option>
              </select>
            </div>

            {/* Camera Motion */}
            <div className="space-y-1">
              <label className="text-xs text-neutral-400 flex items-center gap-1">
                <Compass className="w-3 h-3" /> Camera Motion
              </label>
              <select
                value={cameraMotion}
                onChange={(e) => setCameraMotion(e.target.value as any)}
                className="w-full px-2.5 py-1.5 text-xs bg-neutral-950/70 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-amber-400"
              >
                <option value="slow_zoom_in">Slow Zoom In</option>
                <option value="pan_right">Cinematic Pan Right</option>
                <option value="drift_up">Vertical Crane Drift</option>
              </select>
            </div>

            {/* Particle Effects */}
            <div className="space-y-1">
              <label className="text-xs text-neutral-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Atmospheric Particles
              </label>
              <select
                value={particles}
                onChange={(e) => setParticles(e.target.value as any)}
                className="w-full px-2.5 py-1.5 text-xs bg-neutral-950/70 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-amber-400"
              >
                <option value="glowing_embers">Glowing Embers</option>
                <option value="dust_motes">Cosmic Dust Motes</option>
                <option value="rain">Cinematic Rain</option>
                <option value="mist">Morning Mist</option>
                <option value="stars">Celestial Stars</option>
                <option value="bokeh_bubbles">Golden Bokeh</option>
                <option value="cyber_grid">Cyber Neon Grid</option>
                <option value="none">None</option>
              </select>
            </div>

          </div>

          {/* Progress Banner while generating */}
          {isGenerating && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3 text-xs text-amber-200 animate-pulse">
              <Loader2 className="w-5 h-5 animate-spin text-amber-400 shrink-0" />
              <div>
                <p className="font-semibold">{generationStep}</p>
                <p className="text-[11px] text-amber-300/70">Rendering 20-second clip with motion shaders & audio synchronization...</p>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-950/90">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span className="font-medium text-neutral-300">
              {mediaMode === 'photos'
                ? `${uploadedPhotos.length} photo(s)`
                : mediaMode === 'video'
                ? (uploadedVideo ? '1 video clip' : 'No video')
                : 'Generative AI'}
            </span>
            <span>·</span>
            <span>{audioMode === 'library' && selectedSong ? selectedSong.title : audioMode === 'upload' ? 'Custom Audio' : 'No Audio'}</span>
            <span>·</span>
            <span className="text-amber-400 font-semibold">{duration}s duration</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || (mediaMode === 'text' && !prompt.trim())}
              className="px-6 py-2.5 text-xs font-bold text-neutral-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:pointer-events-none rounded-xl transition-all shadow-lg shadow-amber-400/20 flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating 20s Video...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate 20s Video
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
