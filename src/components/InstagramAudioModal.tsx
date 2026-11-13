import React, { useState, useRef, useEffect } from 'react';
import { 
  Music2, 
  Search, 
  Play, 
  Pause, 
  Upload, 
  Mic, 
  Check, 
  X, 
  Sparkles, 
  Flame, 
  SlidersHorizontal,
  Volume2,
  Square,
  RefreshCw
} from 'lucide-react';
import { RoyaltySong, AudioTrackClip } from '../types/editor';
import { ROYALTY_FREE_LIBRARY, audioEngine } from '../utils/audioEngine';

interface InstagramAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrack: (trackData: {
    trackId: string;
    title: string;
    artist: string;
    coverUrl?: string;
    trimStart: number;
    durationSec: number;
    isVoiceover?: boolean;
    audioBuffer?: AudioBuffer;
  }) => void;
}

export const InstagramAudioModal: React.FC<InstagramAudioModalProps> = ({
  isOpen,
  onClose,
  onSelectTrack,
}) => {
  const [activeTab, setActiveTab] = useState<'for_you' | 'trending' | 'browse' | 'upload' | 'voiceover'>('for_you');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSong, setSelectedSong] = useState<RoyaltySong | null>(ROYALTY_FREE_LIBRARY[0]);
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  
  // Instagram Segment Trimmer State
  const [snippetDuration, setSnippetDuration] = useState<number>(15); // 15s or 30s
  const [trimStart, setTrimStart] = useState<number>(0);

  // Uploaded song state
  const [uploadedBuffer, setUploadedBuffer] = useState<AudioBuffer | null>(null);
  const [uploadedWaveform, setUploadedWaveform] = useState<number[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isDecodingAudio, setIsDecodingAudio] = useState(false);

  // Microphone recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedBuffer, setRecordedBuffer] = useState<AudioBuffer | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      audioEngine.stopPreview();
    };
  }, []);

  if (!isOpen) return null;

  const handlePlayToggle = (song: RoyaltySong) => {
    if (playingSongId === song.id) {
      audioEngine.stopPreview();
      setPlayingSongId(null);
    } else {
      setSelectedSong(song);
      setPlayingSongId(song.id);
      audioEngine.playPreview(song.id, trimStart, snippetDuration, () => {
        setPlayingSongId(null);
      });
    }
  };

  const handleTrimChange = (newStart: number) => {
    setTrimStart(newStart);
    if (selectedSong) {
      audioEngine.playPreview(selectedSong.id, newStart, snippetDuration, () => {
        setPlayingSongId(null);
      });
      setPlayingSongId(selectedSong.id);
    }
  };

  const handleConfirmTrack = () => {
    if (!selectedSong) return;
    audioEngine.stopPreview();
    setPlayingSongId(null);

    onSelectTrack({
      trackId: selectedSong.id,
      title: selectedSong.title,
      artist: selectedSong.artist,
      coverUrl: selectedSong.coverUrl,
      trimStart,
      durationSec: snippetDuration,
      isVoiceover: false,
    });
    onClose();
  };

  // Upload custom song
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDecodingAudio(true);
    try {
      const { buffer, waveform, duration } = await audioEngine.loadAudioFile(file);
      const customId = `custom-audio-${Date.now()}`;
      audioEngine.cacheBuffer(customId, buffer);

      const customSong: RoyaltySong = {
        id: customId,
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: 'My Audio',
        coverUrl: '/src/assets/images/cover_sunset_beats_1794403515654.jpg',
        duration: Math.round(duration),
        genre: 'Uploaded Track',
        mood: 'Custom Audio',
        bpm: 120,
        tags: ['uploaded', 'user'],
      };

      setUploadedBuffer(buffer);
      setUploadedWaveform(waveform);
      setUploadedFileName(file.name);
      setSelectedSong(customSong);
      setTrimStart(0);
      handlePlayToggle(customSong);
    } catch (err) {
      console.error('Failed to decode audio file:', err);
    } finally {
      setIsDecodingAudio(false);
    }
  };

  // Voiceover Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const arrayBuf = await audioBlob.arrayBuffer();
        const ctx = audioEngine.getContext();
        const decoded = await ctx.decodeAudioData(arrayBuf);
        setRecordedBuffer(decoded);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordTimerRef.current);
    }
  };

  const handleUseVoiceover = () => {
    if (!recordedBuffer) return;
    const vId = `voiceover-${Date.now()}`;
    audioEngine.cacheBuffer(vId, recordedBuffer);

    onSelectTrack({
      trackId: vId,
      title: `Voiceover (${recordSeconds}s)`,
      artist: 'Live Mic Recording',
      coverUrl: '/src/assets/images/cover_lofi_vibes_1794403516536.jpg',
      trimStart: 0,
      durationSec: recordSeconds || 5,
      isVoiceover: true,
      audioBuffer: recordedBuffer,
    });
    onClose();
  };

  // Filter songs by search or tab
  const filteredSongs = ROYALTY_FREE_LIBRARY.filter((song) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        song.title.toLowerCase().includes(q) ||
        song.artist.toLowerCase().includes(q) ||
        song.genre.toLowerCase().includes(q) ||
        song.tags.some((t) => t.includes(q))
      );
    }
    if (activeTab === 'trending') return song.isTrending;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Music2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Audio & Music Library</h2>
              <p className="text-xs text-neutral-400">Add trending background tracks, upload songs, or record voiceover</p>
            </div>
          </div>
          <button
            onClick={() => {
              audioEngine.stopPreview();
              onClose();
            }}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-neutral-800 overflow-x-auto text-sm">
          <button
            onClick={() => setActiveTab('for_you')}
            className={`px-3.5 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'for_you'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> For You
            </span>
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`px-3.5 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'trending'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" /> Trending Reels
            </span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-3.5 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'upload'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Upload File
            </span>
          </button>
          <button
            onClick={() => setActiveTab('voiceover')}
            className={`px-3.5 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'voiceover'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5" /> Live Voiceover
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Search bar for tracks */}
          {activeTab !== 'upload' && activeTab !== 'voiceover' && (
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search songs, artists, or moods (e.g. Lo-Fi, Synthwave, Vlog)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-neutral-800/80 border border-neutral-700/80 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-400/80 transition-all"
              />
            </div>
          )}

          {/* Library Tracks List */}
          {(activeTab === 'for_you' || activeTab === 'trending') && (
            <div className="space-y-2">
              {filteredSongs.map((song) => {
                const isSelected = selectedSong?.id === song.id;
                const isPlaying = playingSongId === song.id;

                return (
                  <div
                    key={song.id}
                    onClick={() => {
                      setSelectedSong(song);
                      if (!isPlaying) handlePlayToggle(song);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-800/90 border-amber-500/40 shadow-sm'
                        : 'bg-neutral-900/60 border-neutral-800/80 hover:bg-neutral-800/40 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Cover Thumbnail with Play/Pause Overlay */}
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-neutral-800">
                        <img
                          src={song.coverUrl}
                          alt={song.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayToggle(song);
                          }}
                          className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 transition-colors text-white"
                        >
                          {isPlaying ? (
                            <Pause className="w-5 h-5 fill-white text-white" />
                          ) : (
                            <Play className="w-5 h-5 fill-white text-white translate-x-0.5" />
                          )}
                        </button>
                      </div>

                      {/* Song Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-white truncate">{song.title}</h4>
                          {song.isTrending && (
                            <span className="text-[10px] font-semibold tracking-wider uppercase text-amber-400">
                              Trending
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 truncate">
                          {song.artist} <span className="opacity-50">·</span> {song.genre} <span className="opacity-50">·</span> {song.bpm} BPM
                        </p>
                      </div>
                    </div>

                    {/* Equalizer animation when playing */}
                    <div className="flex items-center gap-3 shrink-0">
                      {isPlaying && (
                        <div className="flex items-end gap-0.5 h-4">
                          <span className="w-1 bg-amber-400 rounded-full animate-bounce h-2" style={{ animationDelay: '0ms' }} />
                          <span className="w-1 bg-amber-400 rounded-full animate-bounce h-4" style={{ animationDelay: '150ms' }} />
                          <span className="w-1 bg-amber-400 rounded-full animate-bounce h-3" style={{ animationDelay: '300ms' }} />
                        </div>
                      )}
                      <span className="text-xs text-neutral-500 font-mono">0:{song.duration}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Upload Audio Tab */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-neutral-700 hover:border-amber-400/60 rounded-2xl bg-neutral-800/30 cursor-pointer transition-colors group">
                <Upload className="w-10 h-10 text-neutral-400 group-hover:text-amber-400 transition-colors mb-2" />
                <p className="text-sm font-medium text-neutral-200">Click to upload song or drag and drop</p>
                <p className="text-xs text-neutral-500 mt-1">Supports MP3, WAV, AAC, M4A, FLAC up to 50MB</p>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {isDecodingAudio && (
                <div className="flex items-center justify-center gap-2 p-4 text-xs text-neutral-400">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  Extracting waveform and decoding audio stems...
                </div>
              )}

              {uploadedBuffer && (
                <div className="p-4 bg-neutral-800/60 border border-neutral-700 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-white">{uploadedFileName}</h4>
                      <p className="text-xs text-neutral-400">
                        Duration: {Math.round(uploadedBuffer.duration)}s · Ready to trim
                      </p>
                    </div>
                    <button
                      onClick={() => selectedSong && handlePlayToggle(selectedSong)}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-neutral-700 hover:bg-neutral-600 rounded-lg flex items-center gap-1.5"
                    >
                      {playingSongId ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      {playingSongId ? 'Pause' : 'Preview'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Live Voiceover Tab */}
          {activeTab === 'voiceover' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
              <div className="relative">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                    isRecording
                      ? 'bg-red-500 text-white animate-pulse ring-8 ring-red-500/20 shadow-lg'
                      : 'bg-amber-500 text-neutral-950 hover:bg-amber-400 shadow-md'
                  }`}
                >
                  {isRecording ? <Square className="w-8 h-8 fill-white" /> : <Mic className="w-8 h-8" />}
                </button>
              </div>

              <div>
                <h3 className="text-base font-semibold text-white">
                  {isRecording ? 'Recording Voiceover...' : 'Record Studio Voiceover'}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {isRecording
                    ? `Live time: ${recordSeconds}s · Tap to stop`
                    : 'Speak into your microphone to add spoken commentary'}
                </p>
              </div>

              {recordedBuffer && !isRecording && (
                <div className="p-4 bg-neutral-800/60 border border-neutral-700 rounded-xl w-full max-w-md text-left flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-medium text-white">Recorded Audio Take</h5>
                    <p className="text-xs text-neutral-400">{recordSeconds} seconds recorded</p>
                  </div>
                  <button
                    onClick={handleUseVoiceover}
                    className="px-4 py-2 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
                  >
                    Use Voiceover
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Instagram-Style Waveform Segment Selector Bar (Footer area) */}
          {selectedSong && activeTab !== 'voiceover' && (
            <div className="mt-4 p-4 bg-neutral-950/70 border border-neutral-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-neutral-300 font-medium">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                  <span>Instagram Audio Segment:</span>
                  <span className="font-mono text-amber-300">
                    0:{trimStart.toString().padStart(2, '0')} - 0:{(trimStart + snippetDuration).toString().padStart(2, '0')}
                  </span>
                </div>
                
                {/* Segment duration buttons (15s or 30s) */}
                <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-lg border border-neutral-800">
                  <button
                    onClick={() => setSnippetDuration(15)}
                    className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                      snippetDuration === 15 ? 'bg-amber-400 text-neutral-950' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    15s
                  </button>
                  <button
                    onClick={() => setSnippetDuration(30)}
                    className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                      snippetDuration === 30 ? 'bg-amber-400 text-neutral-950' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    30s
                  </button>
                </div>
              </div>

              {/* Waveform Scrubber Slider */}
              <div className="relative h-12 bg-neutral-900 rounded-lg overflow-hidden flex items-center px-2 border border-neutral-800">
                {/* Mock wave bars */}
                <div className="absolute inset-0 flex items-center justify-between px-3 opacity-30 pointer-events-none">
                  {Array.from({ length: 48 }).map((_, i) => {
                    const h = Math.sin(i * 0.4) * 16 + 18 + ((i % 3) * 6);
                    return (
                      <span
                        key={i}
                        className="w-1 bg-neutral-400 rounded-full"
                        style={{ height: `${h}px` }}
                      />
                    );
                  })}
                </div>

                {/* Range input */}
                <input
                  type="range"
                  min={0}
                  max={Math.max(1, selectedSong.duration - snippetDuration)}
                  value={trimStart}
                  onChange={(e) => handleTrimChange(Number(e.target.value))}
                  className="w-full relative z-10 accent-amber-400 cursor-ew-resize opacity-90"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-900/90">
          <div className="text-xs text-neutral-400">
            {selectedSong ? (
              <span>Selected: <strong className="text-neutral-200">{selectedSong.title}</strong></span>
            ) : (
              <span>Choose a track from the library</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                audioEngine.stopPreview();
                onClose();
              }}
              className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmTrack}
              disabled={!selectedSong}
              className="px-5 py-2 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:pointer-events-none rounded-xl transition-all shadow-md flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Add Audio to Video
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
