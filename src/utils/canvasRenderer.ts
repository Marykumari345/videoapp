import { AspectRatio, FilterSettings, TextOverlay, TimelineClip } from '../types/editor';

export interface RenderContextOptions {
  currentTime: number;
  totalDuration: number;
  activeClip: TimelineClip | null;
  mediaElement: HTMLVideoElement | HTMLImageElement | null;
  multiImageElements?: HTMLImageElement[];
  textOverlays: TextOverlay[];
  filters: FilterSettings;
  aspectRatio: AspectRatio;
}

export class CanvasRenderer {
  private static grainCanvas: HTMLCanvasElement | null = null;

  public static getDimensions(aspectRatio: AspectRatio, maxDisplayWidth = 800): { width: number; height: number } {
    if (aspectRatio === '9:16') {
      const height = Math.min(640, window.innerHeight * 0.55);
      return { width: Math.round(height * (9 / 16)), height: Math.round(height) };
    }
    if (aspectRatio === '1:1') {
      const size = Math.min(maxDisplayWidth, 520, window.innerHeight * 0.5);
      return { width: Math.round(size), height: Math.round(size) };
    }
    // 16:9
    const width = Math.min(maxDisplayWidth, 840);
    return { width: Math.round(width), height: Math.round(width * (9 / 16)) };
  }

  // Pre-generate a small noise pattern for film grain
  private static getGrainPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
    if (!this.grainCanvas) {
      this.grainCanvas = document.createElement('canvas');
      this.grainCanvas.width = 128;
      this.grainCanvas.height = 128;
      const gCtx = this.grainCanvas.getContext('2d');
      if (gCtx) {
        const imgData = gCtx.createImageData(128, 128);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const v = (Math.random() * 255) | 0;
          data[i] = v;
          data[i + 1] = v;
          data[i + 2] = v;
          data[i + 3] = 40;
        }
        gCtx.putImageData(imgData, 0, 0);
      }
    }
    return ctx.createPattern(this.grainCanvas, 'repeat');
  }

  // Primary frame rendering function
  public static renderFrame(canvas: HTMLCanvasElement, options: RenderContextOptions) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const { currentTime, activeClip, mediaElement, textOverlays, filters, aspectRatio } = options;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // 1. Draw Background or AI Generated Scene or Media
    if (activeClip && activeClip.isAiGenerated && activeClip.aiSceneData) {
      this.renderAiProceduralScene(ctx, width, height, activeClip, currentTime, mediaElement, options.multiImageElements);
    } else if (mediaElement) {
      this.renderMediaElement(ctx, width, height, mediaElement, activeClip, currentTime);
    } else {
      // Empty slate backdrop with subtle grid
      this.renderEmptySlate(ctx, width, height);
    }

    // 2. Apply Custom Filters and Optical Grading
    this.applyColorGrading(ctx, width, height, filters);

    // 3. Render Vignette if enabled
    if (filters.vignette > 0) {
      const radial = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.3,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.75
      );
      const alpha = (filters.vignette / 100) * 0.85;
      radial.addColorStop(0, 'rgba(0,0,0,0)');
      radial.addColorStop(1, `rgba(0,0,0,${alpha})`);
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, width, height);
    }

    // 4. Render Film Grain
    if (filters.grain > 0) {
      ctx.save();
      ctx.globalAlpha = filters.grain / 180;
      ctx.globalCompositeOperation = 'overlay';
      const pattern = this.getGrainPattern(ctx);
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.restore();
    }

    // 5. Letterbox Cinema Bars (2.39:1 scope)
    if (filters.letterbox && aspectRatio !== '9:16') {
      const barHeight = Math.round(height * 0.12);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, barHeight);
      ctx.fillRect(0, height - barHeight, width, barHeight);
    }

    // 6. Text Overlays & Subtitles
    this.renderTextOverlays(ctx, width, height, textOverlays, currentTime);

    ctx.restore();
  }

  // Draw media video or image with Ken-Burns motion
  private static renderMediaElement(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    media: HTMLVideoElement | HTMLImageElement,
    clip: TimelineClip | null,
    currentTime: number
  ) {
    const isVideo = media instanceof HTMLVideoElement;
    const mediaWidth = isVideo ? (media as HTMLVideoElement).videoWidth || width : (media as HTMLImageElement).naturalWidth || width;
    const mediaHeight = isVideo ? (media as HTMLVideoElement).videoHeight || height : (media as HTMLImageElement).naturalHeight || height;

    const hRatio = width / mediaWidth;
    const vRatio = height / mediaHeight;
    const ratio = Math.max(hRatio, vRatio);

    const centerShiftX = (width - mediaWidth * ratio) / 2;
    const centerShiftY = (height - mediaHeight * ratio) / 2;

    // Slight Ken-Burns zoom for static images
    let scale = 1;
    let panX = 0;
    if (!isVideo && clip) {
      const clipElapsed = Math.max(0, currentTime - clip.startSec);
      const progress = Math.min(1, clipElapsed / (clip.durationSec || 5));
      scale = 1 + progress * 0.08;
      panX = Math.sin(progress * Math.PI) * 12;
    }

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2 + panX, -height / 2);

    try {
      ctx.drawImage(
        media,
        0,
        0,
        mediaWidth,
        mediaHeight,
        centerShiftX,
        centerShiftY,
        mediaWidth * ratio,
        mediaHeight * ratio
      );
    } catch (e) {
      // media might be loading or cross-origin
    }
    ctx.restore();
  }

  // Draw media image or video with cover fit, transform, and opacity
  private static drawCoverMedia(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    media: HTMLVideoElement | HTMLImageElement,
    scale = 1,
    panX = 0,
    panY = 0,
    opacity = 1
  ) {
    const isVideo = media instanceof HTMLVideoElement;
    const mediaWidth = isVideo
      ? (media as HTMLVideoElement).videoWidth || width
      : (media as HTMLImageElement).naturalWidth || width;
    const mediaHeight = isVideo
      ? (media as HTMLVideoElement).videoHeight || height
      : (media as HTMLImageElement).naturalHeight || height;

    if (!mediaWidth || !mediaHeight) return;

    const hRatio = width / mediaWidth;
    const vRatio = height / mediaHeight;
    const ratio = Math.max(hRatio, vRatio);

    const centerShiftX = (width - mediaWidth * ratio) / 2;
    const centerShiftY = (height - mediaHeight * ratio) / 2;

    ctx.save();
    if (opacity < 1) {
      ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
    }
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2 + panX, -height / 2 + panY);

    try {
      ctx.drawImage(
        media,
        0,
        0,
        mediaWidth,
        mediaHeight,
        centerShiftX,
        centerShiftY,
        mediaWidth * ratio,
        mediaHeight * ratio
      );
    } catch (e) {
      // media might be loading or cross-origin
    }
    ctx.restore();
  }

  // AI Procedural Scene Renderer: Synthesizes real cinematic animated video
  private static renderAiProceduralScene(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    clip: TimelineClip,
    currentTime: number,
    mediaElement?: HTMLVideoElement | HTMLImageElement | null,
    multiImageElements?: HTMLImageElement[]
  ) {
    const scene = clip.aiSceneData!;
    const elapsed = Math.max(0, currentTime - clip.startSec);
    const clipDuration = clip.durationSec || 20;
    const progress = Math.min(1, elapsed / clipDuration);
    const t = elapsed;

    const hasImages = multiImageElements && multiImageElements.length > 0;
    const isVideoMedia = clip.sourceMediaType === 'video' || (mediaElement instanceof HTMLVideoElement);

    if (hasImages && multiImageElements) {
      // 1. Multi-photo or single-photo sequence across the 20s clip
      const numImages = multiImageElements.length;
      const slotDuration = clipDuration / numImages;
      const activeIdx = Math.min(numImages - 1, Math.floor(elapsed / slotDuration));
      const slotElapsed = elapsed - activeIdx * slotDuration;
      const slotProgress = Math.min(1, slotElapsed / Math.max(0.1, slotDuration));

      // Ken-Burns motion for current slide
      const zoom = 1 + slotProgress * 0.12;
      const panX = Math.sin(slotProgress * Math.PI) * 16 * ((activeIdx % 2 === 0) ? 1 : -1);
      const panY = Math.cos(slotProgress * Math.PI) * 8;

      const currImg = multiImageElements[activeIdx];
      if (currImg && currImg.complete && currImg.naturalWidth > 0) {
        this.drawCoverMedia(ctx, width, height, currImg, zoom, panX, panY, 1);
      }

      // Smooth cross-fade to next image in the last 1.2s of current slot
      const transitionWindow = Math.min(1.2, slotDuration * 0.35);
      if (slotDuration - slotElapsed < transitionWindow && activeIdx < numImages - 1) {
        const nextImg = multiImageElements[activeIdx + 1];
        if (nextImg && nextImg.complete && nextImg.naturalWidth > 0) {
          const crossfadeProgress = (transitionWindow - (slotDuration - slotElapsed)) / transitionWindow;
          this.drawCoverMedia(
            ctx,
            width,
            height,
            nextImg,
            1 + crossfadeProgress * 0.06,
            -panX * 0.3,
            0,
            crossfadeProgress
          );
        }
      }

      // Atmospheric styling tint
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = scene.palette.accent || '#38bdf8';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // Vignette shadow
      const vGrad = ctx.createRadialGradient(width / 2, height / 2, width * 0.35, width / 2, height / 2, width * 0.78);
      vGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vGrad.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, width, height);

    } else if (isVideoMedia && mediaElement && (mediaElement instanceof HTMLVideoElement)) {
      // 1. Uploaded Video base
      const zoom = 1 + progress * 0.08;
      this.drawCoverMedia(ctx, width, height, mediaElement, zoom, 0, 0, 1);

      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = scene.palette.accent || '#38bdf8';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    } else if (mediaElement && (mediaElement instanceof HTMLImageElement) && mediaElement.complete && mediaElement.naturalWidth > 0) {
      // 1. Single uploaded photo base
      const zoom = 1 + progress * 0.15;
      const panX = Math.sin(progress * Math.PI) * 16;
      this.drawCoverMedia(ctx, width, height, mediaElement, zoom, panX, 0, 1);

      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = scene.palette.accent || '#38bdf8';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    } else {
      // 1. Dynamic Animated Gradient Backdrop (Pure procedural generative mode)
      const grad = ctx.createLinearGradient(
        width * 0.5 + Math.sin(t * 0.4) * 80,
        0,
        width * 0.5 - Math.sin(t * 0.4) * 80,
        height
      );
      grad.addColorStop(0, scene.palette.ambient || '#090d16');
      grad.addColorStop(0.5, scene.palette.primary || '#1e293b');
      grad.addColorStop(1, scene.palette.secondary || '#334155');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Procedural Scene Architecture Geometry
      if (scene.sceneType === 'landscape' || scene.sceneType === 'ocean') {
        for (let layer = 3; layer >= 1; layer--) {
          ctx.fillStyle = `${scene.palette.primary}${layer === 1 ? 'cc' : '88'}`;
          ctx.beginPath();
          const baseH = height * (0.55 + layer * 0.12);
          ctx.moveTo(0, height);
          for (let x = 0; x <= width; x += 30) {
            const wave = Math.sin((x / 180) * layer + t * 0.3) * (20 * layer);
            const wave2 = Math.cos((x / 90) + t * 0.5) * (10 * layer);
            ctx.lineTo(x, baseH + wave + wave2);
          }
          ctx.lineTo(width, height);
          ctx.closePath();
          ctx.fill();
        }

        const sunGrad = ctx.createRadialGradient(
          width * 0.65,
          height * 0.35,
          10,
          width * 0.65,
          height * 0.35,
          140
        );
        sunGrad.addColorStop(0, scene.palette.accent || '#38bdf8');
        sunGrad.addColorStop(0.3, `${scene.palette.accent}66`);
        sunGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(width * 0.65, height * 0.35, 140, 0, Math.PI * 2);
        ctx.fill();
      } else if (scene.sceneType === 'cityscape' || scene.sceneType === 'abstract_flow') {
        ctx.strokeStyle = `${scene.palette.accent}33`;
        ctx.lineWidth = 1.5;
        const horizon = height * 0.6;
        ctx.beginPath();
        for (let x = -width; x <= width * 2; x += 60) {
          ctx.moveTo(width / 2, horizon);
          ctx.lineTo(x, height);
        }
        for (let y = horizon; y <= height; y += (height - horizon) / 8) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }
        ctx.stroke();

        ctx.fillStyle = scene.palette.ambient || '#090d16';
        for (let i = 0; i < 12; i++) {
          const bw = width / 12;
          const bx = i * bw;
          const bh = (Math.sin(i * 1.7) * 0.3 + 0.4) * height * 0.45;
          ctx.fillRect(bx + 2, horizon - bh, bw - 4, bh);

          ctx.fillStyle = `${scene.palette.accent}55`;
          for (let wy = horizon - bh + 10; wy < horizon - 10; wy += 15) {
            if ((i + wy) % 2 === 0) {
              ctx.fillRect(bx + 6, wy, bw - 12, 6);
            }
          }
          ctx.fillStyle = scene.palette.ambient || '#090d16';
        }
      }
    }

    // 2. Camera Motion Matrix & Particles
    ctx.save();
    if (scene.cameraMotion === 'slow_zoom_in') {
      const z = 1 + progress * 0.15;
      ctx.translate(width / 2, height / 2);
      ctx.scale(z, z);
      ctx.translate(-width / 2, -height / 2);
    } else if (scene.cameraMotion === 'pan_right') {
      ctx.translate(-progress * 40, 0);
    } else if (scene.cameraMotion === 'drift_up') {
      ctx.translate(0, progress * 30);
    }

    // Dynamic Particle System
    this.renderParticles(ctx, width, height, scene.particles, scene.palette.accent, t);
    ctx.restore();

    // 3. Cinematic Director Lower Third Kicker
    if (scene.suggestedCaption && progress < 0.85) {
      ctx.save();
      const kickerAlpha = Math.sin(progress * Math.PI) * 0.9;
      ctx.globalAlpha = kickerAlpha;
      ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      const capY = height - 44;
      const textWidth = ctx.measureText(scene.suggestedCaption).width;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath();
      ctx.roundRect(width / 2 - textWidth / 2 - 16, capY - 26, textWidth + 32, 32, 6);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(scene.suggestedCaption, width / 2, capY - 4);
      ctx.restore();
    }
  }

  // Particle simulation (Rain, Embers, Mist, Stars, Bokeh)
  private static renderParticles(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    type: string,
    accentColor: string,
    t: number
  ) {
    ctx.save();

    if (type === 'rain') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < 70; i++) {
        const x = (i * 37 + t * 400) % width;
        const y = (i * 59 + t * 850) % height;
        ctx.moveTo(x, y);
        ctx.lineTo(x - 4, y + 18);
      }
      ctx.stroke();
    } else if (type === 'glowing_embers' || type === 'bokeh_bubbles') {
      for (let i = 0; i < 35; i++) {
        const x = (i * 67 + Math.sin(t + i) * 30) % width;
        const y = (height - ((i * 43 + t * 60) % height));
        const r = (i % 5) + 2;

        ctx.fillStyle = accentColor;
        ctx.globalAlpha = (Math.sin(t * 2 + i) * 0.3 + 0.6) * 0.7;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === 'stars' || type === 'dust_motes') {
      for (let i = 0; i < 60; i++) {
        const x = (i * 83) % width;
        const y = (i * 47) % height;
        const twinkle = Math.sin(t * 3 + i * 2) * 0.4 + 0.6;
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = twinkle * 0.8;
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    } else {
      // Soft atmospheric mist bands
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      for (let i = 0; i < 4; i++) {
        const my = height * 0.3 + i * 80 + Math.sin(t * 0.5 + i) * 20;
        ctx.beginPath();
        ctx.ellipse(width / 2 + Math.cos(t * 0.2 + i) * 80, my, width * 0.6, 35, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // Empty state slate
  private static renderEmptySlate(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, width, height);

    // Subtle dark studio grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < width; x += 40) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y < height; y += 40) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // Subtle crosshair center mark
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(width / 2 - 12, height / 2);
    ctx.lineTo(width / 2 + 12, height / 2);
    ctx.moveTo(width / 2, height / 2 - 12);
    ctx.lineTo(width / 2, height / 2 + 12);
    ctx.stroke();
  }

  // Color Grading & Preset Adjustments
  private static applyColorGrading(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    filters: FilterSettings
  ) {
    const { preset, temperature } = filters;

    ctx.save();

    // Preset color wash overlays
    if (preset === 'teal_orange') {
      // Teal shadows, amber highlights
      ctx.globalCompositeOperation = 'soft-light';
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, 'rgba(20, 184, 166, 0.4)');
      grad.addColorStop(1, 'rgba(249, 115, 22, 0.45)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (preset === 'noir') {
      // Monochromatic B&W high contrast
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(0, 0, width, height);
    } else if (preset === 'vintage_70s') {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = 'rgba(180, 140, 80, 0.55)';
      ctx.fillRect(0, 0, width, height);
    } else if (preset === 'cyber_neon') {
      ctx.globalCompositeOperation = 'screen';
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, 'rgba(168, 85, 247, 0.25)');
      grad.addColorStop(1, 'rgba(236, 72, 153, 0.25)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (preset === 'golden_hour') {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.fillRect(0, 0, width, height);
    } else if (preset === 'nordic_fjord') {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = 'rgba(14, 116, 144, 0.35)';
      ctx.fillRect(0, 0, width, height);
    } else if (preset === 'retro_vhs') {
      // VHS Scanlines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1.5);
      }
    }

    // Temperature adjustment (Cool blue vs Warm amber)
    if (temperature !== 0) {
      ctx.globalCompositeOperation = 'soft-light';
      if (temperature > 0) {
        ctx.fillStyle = `rgba(245, 158, 11, ${(temperature / 100) * 0.5})`;
      } else {
        ctx.fillStyle = `rgba(59, 130, 246, ${(Math.abs(temperature) / 100) * 0.5})`;
      }
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  }

  // Render text overlays & subtitles
  private static renderTextOverlays(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    texts: TextOverlay[],
    currentTime: number
  ) {
    for (const item of texts) {
      if (currentTime >= item.startSec && currentTime <= item.startSec + item.durationSec) {
        const elapsed = currentTime - item.startSec;
        const dur = item.durationSec;
        const progress = elapsed / dur;

        ctx.save();

        let alpha = 1;
        let offsetY = 0;
        let scale = 1;

        if (item.animation === 'fade') {
          if (elapsed < 0.4) alpha = elapsed / 0.4;
          if (dur - elapsed < 0.4) alpha = (dur - elapsed) / 0.4;
        } else if (item.animation === 'slide_up') {
          if (elapsed < 0.4) {
            const ease = elapsed / 0.4;
            offsetY = (1 - ease) * 20;
            alpha = ease;
          }
        } else if (item.animation === 'pop') {
          if (elapsed < 0.3) {
            const ease = elapsed / 0.3;
            scale = 0.7 + ease * 0.3;
            alpha = ease;
          }
        }

        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

        // Font calculation scaled to canvas
        const canvasScale = width / 800;
        const fontSize = Math.max(16, Math.round(item.fontSize * canvasScale));
        ctx.font = `${item.bold ? '700' : '500'} ${fontSize}px "${item.fontFamily}", sans-serif`;
        ctx.textAlign = item.align || 'center';
        ctx.textBaseline = 'middle';

        const posX = (item.x / 100) * width;
        const posY = (item.y / 100) * height + offsetY;

        ctx.translate(posX, posY);
        ctx.scale(scale, scale);

        // Optional background pill
        if (item.backgroundColor) {
          const metrics = ctx.measureText(item.text);
          const padX = fontSize * 0.6;
          const padY = fontSize * 0.35;
          ctx.fillStyle = item.backgroundColor;
          ctx.beginPath();
          let rectX = -padX;
          if (item.align === 'center') rectX = -metrics.width / 2 - padX;
          else if (item.align === 'right') rectX = -metrics.width - padX;
          ctx.roundRect(rectX, -fontSize / 2 - padY, metrics.width + padX * 2, fontSize + padY * 2, 6);
          ctx.fill();
        }

        // Text drop shadow for high readability on any background
        ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 2;

        ctx.fillStyle = item.color || '#ffffff';
        ctx.fillText(item.text, 0, 0);

        ctx.restore();
      }
    }
  }
}
