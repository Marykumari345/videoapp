export type AspectRatio = '16:9' | '9:16' | '1:1';

export type MediaType = 'video' | 'image' | 'audio';

export interface MediaItem {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  duration: number; // in seconds
  width?: number;
  height?: number;
  thumbnail?: string;
  size?: string;
  isAiGenerated?: boolean;
  aiSceneData?: AiSceneData;
  sourceMediaUrls?: string[];
  sourceMediaType?: 'image' | 'video' | 'none';
}

export interface AiSceneData {
  title: string;
  cinematicStyle: string;
  cameraMotion: 'pan_right' | 'pan_left' | 'slow_zoom_in' | 'slow_zoom_out' | 'orbit' | 'drift_up';
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    ambient: string;
  };
  particles: 'rain' | 'dust_motes' | 'glowing_embers' | 'mist' | 'stars' | 'bokeh_bubbles' | 'cyber_grid' | 'none';
  sceneType: 'landscape' | 'cityscape' | 'abstract_flow' | 'cosmic' | 'ocean' | 'portrait';
  lightingMood: string;
  suggestedCaption: string;
  musicMood: string;
  pacingBpm: number;
  sourceMediaUrls?: string[];
  sourceMediaType?: 'image' | 'video' | 'none';
}

export interface TimelineClip {
  id: string;
  mediaId: string;
  name: string;
  type: MediaType;
  startSec: number;     // position on timeline
  durationSec: number;  // visible duration on timeline
  trimStart: number;    // start offset inside media
  trimEnd: number;      // end offset inside media
  volume: number;       // 0 to 1
  speed: number;        // 0.5, 1, 1.5, 2
  filterPreset?: string;
  thumbnail?: string;
  isAiGenerated?: boolean;
  aiSceneData?: AiSceneData;
  sourceMediaUrls?: string[];
  sourceMediaType?: 'image' | 'video' | 'none';
}

export interface AudioTrackClip {
  id: string;
  trackId: string;
  title: string;
  artist: string;
  coverUrl?: string;
  url?: string;
  audioBuffer?: AudioBuffer;
  startSec: number;     // position on timeline
  durationSec: number;  // duration on timeline
  trimStart: number;    // start offset in song (Instagram snippet picker)
  volume: number;       // 0 to 1
  isVoiceover?: boolean;
}

export interface TextOverlay {
  id: string;
  text: string;
  startSec: number;
  durationSec: number;
  x: number; // 0 to 100 percentage
  y: number; // 0 to 100 percentage
  fontSize: number; // px
  fontFamily: 'Plus Jakarta Sans' | 'Impact' | 'Playfair Display' | 'JetBrains Mono';
  color: string;
  backgroundColor?: string;
  animation: 'none' | 'fade' | 'slide_up' | 'pop' | 'typewriter';
  align: 'left' | 'center' | 'right';
  bold?: boolean;
}

export interface FilterSettings {
  preset: string;
  brightness: number; // 50 to 150 (default 100)
  contrast: number;   // 50 to 150 (default 100)
  saturate: number;   // 0 to 200 (default 100)
  temperature: number; // -50 to 50 (default 0)
  sepia: number;      // 0 to 100 (default 0)
  blur: number;       // 0 to 10 (default 0)
  grain: number;      // 0 to 100 (default 0)
  vignette: number;   // 0 to 100 (default 0)
  letterbox: boolean; // 2.39:1 cinema bars
  speed: number;      // 0.5, 1, 1.5, 2
}

export interface RoyaltySong {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  duration: number;
  genre: string;
  mood: string;
  bpm: number;
  isTrending?: boolean;
  tags: string[];
}
