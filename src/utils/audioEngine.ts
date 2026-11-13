import { RoyaltySong } from '../types/editor';

// Curated royalty-free music library with local generated artwork references
export const ROYALTY_FREE_LIBRARY: RoyaltySong[] = [
  {
    id: 'rf-lofi-1',
    title: 'Midnight Coffee & Rain',
    artist: 'Velvet Tape Collective',
    coverUrl: '/src/assets/images/cover_lofi_vibes_1794403516536.jpg',
    duration: 60,
    genre: 'Chill Lo-Fi',
    mood: 'Relaxed & Nostalgic',
    bpm: 76,
    isTrending: true,
    tags: ['chill', 'coffee', 'study', 'rain', 'aesthetic'],
  },
  {
    id: 'rf-synth-2',
    title: 'Neon Horizon 1984',
    artist: 'Aetherwave',
    coverUrl: '/src/assets/images/cover_sunset_beats_1794403515654.jpg',
    duration: 60,
    genre: 'Synthwave',
    mood: 'Retro & Driving',
    bpm: 108,
    isTrending: true,
    tags: ['synth', 'retro', 'cyberpunk', 'driving', '80s'],
  },
  {
    id: 'rf-cinema-3',
    title: 'Nordic Dawn Odyssey',
    artist: 'Fjord Symphony',
    coverUrl: '/src/assets/images/cinematic_fjord_dawn_1794403514830.jpg',
    duration: 60,
    genre: 'Cinematic Ambient',
    mood: 'Epic & Atmospheric',
    bpm: 68,
    isTrending: true,
    tags: ['cinematic', 'epic', 'nature', 'landscape', 'drama'],
  },
  {
    id: 'rf-urban-4',
    title: 'Tokyo Twilight Drift',
    artist: 'Shibuya Beats',
    coverUrl: '/src/assets/images/urban_night_story_1794403516448.jpg',
    duration: 60,
    genre: 'Urban Hip Hop',
    mood: 'Groovy & Confident',
    bpm: 92,
    isTrending: false,
    tags: ['urban', 'hiphop', 'street', 'city', 'reel'],
  },
  {
    id: 'rf-acoustic-5',
    title: 'Sunlight on the Porch',
    artist: 'Maple & Pine',
    coverUrl: '/src/assets/images/cover_lofi_vibes_1794403516536.jpg',
    duration: 45,
    genre: 'Indie Acoustic',
    mood: 'Warm & Uplifting',
    bpm: 88,
    isTrending: false,
    tags: ['acoustic', 'guitar', 'vlog', 'warm', 'morning'],
  },
  {
    id: 'rf-dance-6',
    title: 'Summer Pulse Glow',
    artist: 'Sunburst Club',
    coverUrl: '/src/assets/images/cover_sunset_beats_1794403515654.jpg',
    duration: 50,
    genre: 'Upbeat Pop',
    mood: 'Energetic & Vibrant',
    bpm: 124,
    isTrending: true,
    tags: ['dance', 'party', 'summer', 'upbeat', 'trending'],
  },
];

class AudioEngineService {
  private ctx: AudioContext | null = null;
  private previewSource: AudioBufferSourceNode | null = null;
  private previewGain: GainNode | null = null;
  private currentPreviewId: string | null = null;
  private synthesizedCache = new Map<string, AudioBuffer>();

  public getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Synthesize rich, real harmonic audio buffers for our royalty-free library
  public async getSynthesizedBuffer(songId: string): Promise<AudioBuffer> {
    if (this.synthesizedCache.has(songId)) {
      return this.synthesizedCache.get(songId)!;
    }

    const ctx = this.getContext();
    const song = ROYALTY_FREE_LIBRARY.find((s) => s.id === songId) || ROYALTY_FREE_LIBRARY[0];
    const duration = song.duration;
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const bpm = song.bpm;
    const beatSec = 60 / bpm;

    // Chord progressions depending on song genre
    let chordFreqs: number[][] = [];
    if (song.genre.includes('Lo-Fi')) {
      // Dmaj9 - Bm7 - Gmaj7 - A7sus
      chordFreqs = [
        [146.83, 220.0, 277.18, 329.63], // D3, A3, C#4, E4
        [123.47, 185.0, 246.94, 293.66], // B2, F#3, B3, D4
        [98.0, 146.83, 196.0, 246.94],   // G2, D3, G3, B3
        [110.0, 164.81, 220.0, 293.66],  // A2, E3, A3, D4
      ];
    } else if (song.genre.includes('Synthwave')) {
      // Am - F - C - G
      chordFreqs = [
        [110.0, 164.81, 220.0, 261.63],
        [87.31, 130.81, 174.61, 220.0],
        [130.81, 164.81, 196.0, 261.63],
        [98.0, 146.83, 196.0, 246.94],
      ];
    } else if (song.genre.includes('Cinematic')) {
      // Dm - Bb - F - C
      chordFreqs = [
        [73.42, 110.0, 146.83, 220.0],
        [58.27, 87.31, 116.54, 174.61],
        [87.31, 130.81, 174.61, 261.63],
        [65.41, 98.0, 130.81, 196.0],
      ];
    } else {
      // C - G - Am - F (Pop & Upbeat)
      chordFreqs = [
        [130.81, 164.81, 196.0, 261.63],
        [98.0, 146.83, 196.0, 246.94],
        [110.0, 130.81, 164.81, 220.0],
        [87.31, 109.99, 130.81, 174.61],
      ];
    }

    const barSec = beatSec * 4;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const barIndex = Math.floor(t / barSec) % chordFreqs.length;
      const currentChord = chordFreqs[barIndex];
      const beatInBar = (t % barSec) / beatSec;
      const beatFraction = (t % beatSec) / beatSec;

      let sampleL = 0;
      let sampleR = 0;

      // 1. Pad / Rhodes Chords (soft warm tones)
      const chordEnv = Math.exp(-beatFraction * 0.8) * 0.4 + 0.6;
      for (let c = 0; c < currentChord.length; c++) {
        const freq = currentChord[c];
        const tone = Math.sin(2 * Math.PI * freq * t) * 0.12 * chordEnv;
        // Warm slight vibrato / tape detune
        const detune = Math.sin(2 * Math.PI * (freq * 1.003) * t) * 0.08 * chordEnv;
        sampleL += tone + detune * 0.5;
        sampleR += tone + detune * 0.8;
      }

      // 2. Bassline on Root
      const bassFreq = currentChord[0] * 0.5;
      const bassEnv = Math.exp(-beatFraction * 3.0);
      const bass = Math.sin(2 * Math.PI * bassFreq * t) * 0.28 * bassEnv;
      sampleL += bass;
      sampleR += bass;

      // 3. Drums / Percussion
      // Kick drum on beats 0 and 2
      if (beatInBar < 0.25 || (beatInBar >= 2 && beatInBar < 2.25)) {
        const kickTime = (t % (beatSec * 2));
        if (kickTime < 0.18) {
          const kickFreq = 140 * Math.exp(-kickTime * 35) + 45;
          const kick = Math.sin(2 * Math.PI * kickFreq * kickTime) * Math.exp(-kickTime * 15) * 0.45;
          sampleL += kick;
          sampleR += kick;
        }
      }

      // Snare / Rimshot on beats 1 and 3
      if ((beatInBar >= 1 && beatInBar < 1.25) || (beatInBar >= 3 && beatInBar < 3.25)) {
        const snareTime = ((t - beatSec) % (beatSec * 2));
        if (snareTime >= 0 && snareTime < 0.15) {
          const noise = (Math.random() * 2 - 1) * Math.exp(-snareTime * 25) * 0.22;
          const tone = Math.sin(2 * Math.PI * 220 * snareTime) * Math.exp(-snareTime * 20) * 0.15;
          sampleL += noise + tone;
          sampleR += noise + tone;
        }
      }

      // Hi-hat pulse on 8th notes
      const eighthSec = beatSec / 2;
      const hatTime = t % eighthSec;
      if (hatTime < 0.04) {
        const hat = (Math.random() * 2 - 1) * Math.exp(-hatTime * 80) * 0.08;
        sampleL += hat * 0.8;
        sampleR += hat * 1.1; // stereo panning
      }

      // Soft limiter / tape saturation
      left[i] = Math.tanh(sampleL * 0.7);
      right[i] = Math.tanh(sampleR * 0.7);
    }

    this.synthesizedCache.set(songId, buffer);
    return buffer;
  }

  // Play preview of song with optional start offset and duration (Instagram segment style)
  public async playPreview(
    songId: string,
    startOffset = 0,
    segmentDuration = 30,
    onEnded?: () => void
  ) {
    this.stopPreview();

    const ctx = this.getContext();
    let buffer: AudioBuffer;

    if (songId.startsWith('rf-')) {
      buffer = await this.getSynthesizedBuffer(songId);
    } else {
      // custom uploaded buffer from cache
      buffer = this.synthesizedCache.get(songId) || (await this.getSynthesizedBuffer('rf-lofi-1'));
    }

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();

    source.buffer = buffer;
    source.loop = true;
    source.loopStart = startOffset;
    source.loopEnd = Math.min(startOffset + segmentDuration, buffer.duration);

    gain.gain.value = 0.8;
    source.connect(gain);
    gain.connect(ctx.destination);

    source.start(0, startOffset);
    this.previewSource = source;
    this.previewGain = gain;
    this.currentPreviewId = songId;

    if (onEnded) {
      source.onended = onEnded;
    }
  }

  public stopPreview() {
    if (this.previewSource) {
      try {
        this.previewSource.stop();
        this.previewSource.disconnect();
      } catch (e) {
        // already stopped
      }
      this.previewSource = null;
    }
    this.currentPreviewId = null;
  }

  public isPreviewing(songId?: string): boolean {
    if (!songId) return !!this.previewSource;
    return this.currentPreviewId === songId;
  }

  // Decode user-uploaded audio file (MP3, WAV, AAC, M4A) and cache
  public async loadAudioFile(file: File): Promise<{ buffer: AudioBuffer; waveform: number[]; duration: number }> {
    const ctx = this.getContext();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const waveform = this.extractWaveform(audioBuffer, 80);

    return {
      buffer: audioBuffer,
      waveform,
      duration: audioBuffer.duration,
    };
  }

  // Generate waveform array (0-1 floats) for timeline visualization
  public extractWaveform(buffer: AudioBuffer, numBars = 60): number[] {
    const rawData = buffer.getChannelData(0);
    const blockSize = Math.floor(rawData.length / numBars);
    const waveform: number[] = [];

    for (let i = 0; i < numBars; i++) {
      const blockStart = blockSize * i;
      let sum = 0;
      for (let j = 0; j < blockSize; j += 4) {
        sum += Math.abs(rawData[blockStart + j] || 0);
      }
      const avg = sum / (blockSize / 4);
      waveform.push(Math.min(1, avg * 3.5)); // Normalized boost
    }

    return waveform;
  }

  // Store custom audio buffer
  public cacheBuffer(id: string, buffer: AudioBuffer) {
    this.synthesizedCache.set(id, buffer);
  }

  public getCachedBuffer(id: string): AudioBuffer | undefined {
    return this.synthesizedCache.get(id);
  }
}

export const audioEngine = new AudioEngineService();
