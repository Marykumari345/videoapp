import React, { useState } from 'react';
import { 
  Download, 
  X, 
  CheckCircle2, 
  Film, 
  Loader2, 
  Sparkles,
  Camera,
  Play
} from 'lucide-react';
import { AspectRatio, FilterSettings, TextOverlay, TimelineClip } from '../types/editor';
import { CanvasRenderer } from '../utils/canvasRenderer';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  aspectRatio: AspectRatio;
  clips: TimelineClip[];
  textOverlays: TextOverlay[];
  filters: FilterSettings;
  totalDuration: number;
  previewCanvas: HTMLCanvasElement | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  aspectRatio,
  clips,
  textOverlays,
  filters,
  totalDuration,
  previewCanvas,
}) => {
  const [resolution, setResolution] = useState<'1080p' | '720p'>('1080p');
  const [fps, setFps] = useState<30 | 60>(30);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  // Snapshot Current Frame as PNG
  const handleSnapshot = () => {
    if (!previewCanvas) return;
    const url = previewCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `cineflow-snapshot-${Date.now()}.png`;
    a.click();
  };

  // Real client-side Video Render via Hidden Canvas & MediaRecorder
  const handleExportVideo = async () => {
    setIsExporting(true);
    setProgress(0);
    setDownloadUrl(null);

    // Calculate export dimensions
    let expWidth = 1920;
    let expHeight = 1080;

    if (aspectRatio === '9:16') {
      expWidth = resolution === '1080p' ? 1080 : 720;
      expHeight = resolution === '1080p' ? 1920 : 1280;
    } else if (aspectRatio === '1:1') {
      expWidth = resolution === '1080p' ? 1080 : 720;
      expHeight = expWidth;
    } else {
      expWidth = resolution === '1080p' ? 1920 : 1280;
      expHeight = resolution === '1080p' ? 1080 : 720;
    }

    const renderCanvas = document.createElement('canvas');
    renderCanvas.width = expWidth;
    renderCanvas.height = expHeight;

    const stream = renderCanvas.captureStream(fps);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setIsExporting(false);
      setProgress(100);
    };

    // Preload image elements for rendering in export
    const exportImageMap = new Map<string, HTMLImageElement>();
    clips.forEach((c) => {
      const urls = [c.thumbnail, ...(c.sourceMediaUrls || [])].filter(Boolean) as string[];
      urls.forEach((u) => {
        if (!exportImageMap.has(u)) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = u;
          exportImageMap.set(u, img);
        }
      });
    });

    recorder.start();

    // Render loop frame by frame
    const dur = Math.max(2, totalDuration);
    const totalFrames = Math.ceil(dur * fps);
    let frame = 0;

    const renderStep = () => {
      if (frame >= totalFrames) {
        recorder.stop();
        return;
      }

      const t = frame / fps;
      const activeClip = clips.find((c) => t >= c.startSec && t <= c.startSec + c.durationSec) || clips[0] || null;

      let multiImages: HTMLImageElement[] | undefined = undefined;
      let mediaEl: HTMLImageElement | null = null;

      if (activeClip) {
        if (activeClip.sourceMediaUrls && activeClip.sourceMediaUrls.length > 0) {
          multiImages = activeClip.sourceMediaUrls
            .map((url) => exportImageMap.get(url))
            .filter((img): img is HTMLImageElement => !!img && img.complete);
        } else if (activeClip.thumbnail && exportImageMap.has(activeClip.thumbnail)) {
          mediaEl = exportImageMap.get(activeClip.thumbnail) || null;
        }
      }

      CanvasRenderer.renderFrame(renderCanvas, {
        currentTime: t,
        totalDuration: dur,
        activeClip,
        mediaElement: mediaEl,
        multiImageElements: multiImages,
        textOverlays,
        filters,
        aspectRatio,
      });

      frame++;
      setProgress(Math.round((frame / totalFrames) * 100));

      // Schedule next frame with requestAnimationFrame for smooth execution
      requestAnimationFrame(renderStep);
    };

    requestAnimationFrame(renderStep);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Export Movie</h2>
              <p className="text-xs text-neutral-400">Render and download your finished video</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-6 space-y-5">
          
          {/* Quick Snapshot Option */}
          <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl flex items-center justify-between">
            <div className="text-xs">
              <h4 className="font-semibold text-neutral-200">Capture Frame Still</h4>
              <p className="text-neutral-500">Download current frame as a high-res PNG</p>
            </div>
            <button
              onClick={handleSnapshot}
              className="px-3 py-1.5 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-lg flex items-center gap-1.5 transition-colors border border-neutral-700"
            >
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              Save PNG
            </button>
          </div>

          {/* Video Export Configuration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-neutral-400">Resolution</label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value as any)}
                disabled={isExporting}
                className="w-full px-3 py-2 text-xs bg-neutral-950/70 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-amber-400"
              >
                <option value="1080p">1080p (Full HD Cinema)</option>
                <option value="720p">720p (Fast Social HD)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-neutral-400">Frame Rate</label>
              <select
                value={fps}
                onChange={(e) => setFps(Number(e.target.value) as any)}
                disabled={isExporting}
                className="w-full px-3 py-2 text-xs bg-neutral-950/70 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-amber-400"
              >
                <option value={30}>30 FPS (Standard Cinematic)</option>
                <option value={60}>60 FPS (Ultra Smooth)</option>
              </select>
            </div>
          </div>

          {/* Project Summary */}
          <div className="p-3 bg-neutral-950/40 border border-neutral-800 rounded-xl text-xs space-y-1">
            <div className="flex justify-between text-neutral-400">
              <span>Aspect Ratio:</span>
              <strong className="text-neutral-200">{aspectRatio}</strong>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Total Duration:</span>
              <strong className="text-neutral-200">{totalDuration.toFixed(1)} seconds</strong>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Video Clips:</span>
              <strong className="text-neutral-200">{clips.length} layers</strong>
            </div>
          </div>

          {/* Progress Bar when Exporting */}
          {isExporting && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-amber-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Rendering Video Stream...
                </span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Ready to Download State */}
          {downloadUrl && !isExporting && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Video rendered successfully! Ready to download.</span>
              </div>
              <a
                href={downloadUrl}
                download={`cineflow-render-${Date.now()}.webm`}
                className="px-4 py-1.5 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg flex items-center gap-1.5 transition-colors shadow-md"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </a>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-800 bg-neutral-900/90">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white transition-colors"
          >
            Close
          </button>
          {!downloadUrl && (
            <button
              onClick={handleExportVideo}
              disabled={isExporting}
              className="px-5 py-2 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-xl transition-all shadow-md flex items-center gap-1.5"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Rendering ({progress}%)
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Start Export
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
