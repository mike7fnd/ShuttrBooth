import { PhotoFilter, FrameStyle, LayoutFormat, SignatureData } from '../types';

export interface RenderStripOptions {
  photos: string[]; // 4 image data URLs or URLs
  filter: PhotoFilter;
  frameStyle: FrameStyle;
  layout: LayoutFormat;
  caption?: string;
  showDate: boolean;
  showLogo: boolean;
  dateString?: string;
  signature?: SignatureData;
}

export const FILTERS_CONFIG: Record<PhotoFilter, { name: string; cssFilter: string; desc: string }> = {
  normal: {
    name: 'Normal',
    cssFilter: 'none',
    desc: 'True color, natural contrast',
  },
  bw: {
    name: 'Classic B&W',
    cssFilter: 'grayscale(100%) contrast(115%) brightness(102%)',
    desc: 'High-contrast timeless monochrome',
  },
  warm: {
    name: 'Warm Gold',
    cssFilter: 'sepia(30%) saturate(120%) brightness(104%) contrast(105%)',
    desc: 'Nostalgic golden tone',
  },
  noir: {
    name: 'Noir 1970',
    cssFilter: 'grayscale(100%) contrast(140%) brightness(95%)',
    desc: 'Moody cinematic deep blacks',
  },
  chrome: {
    name: 'Cool Chrome',
    cssFilter: 'saturate(90%) contrast(110%) hue-rotate(190deg) brightness(102%)',
    desc: 'Modern cool-toned clarity',
  },
  vintage: {
    name: 'Vintage Film',
    cssFilter: 'sepia(20%) contrast(95%) brightness(108%) saturate(85%)',
    desc: 'Matte analog film look',
  },
  glow: {
    name: 'Soft Glow',
    cssFilter: 'contrast(102%) brightness(108%) saturate(105%)',
    desc: 'Gentle diffusion and brightness',
  },
};

export const FRAMES_CONFIG: Record<FrameStyle, { name: string; bg: string; text: string; border: string }> = {
  'classic-white': {
    name: 'Classic White',
    bg: '#FFFFFF',
    text: '#161616',
    border: 'rgba(0,0,0,0.06)',
  },
  'minimal-white': {
    name: 'Minimal White',
    bg: '#FAFAFA',
    text: '#222222',
    border: 'rgba(0,0,0,0.04)',
  },
  'matte-black': {
    name: 'Matte Black',
    bg: '#141414',
    text: '#F5F5F5',
    border: 'rgba(255,255,255,0.08)',
  },
  'cream-retro': {
    name: 'Cream Cotton',
    bg: '#F5EFEB',
    text: '#2A241F',
    border: 'rgba(0,0,0,0.06)',
  },
  'film-border': {
    name: 'Film Negative',
    bg: '#0F0F10',
    text: '#E5E5E5',
    border: 'rgba(255,255,255,0.12)',
  },
};

/**
 * Load an image from a URL or DataURL into an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Apply custom canvas pixel adjustments for authentic analog grain / tone
 */
function applyPixelFilters(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, filter: PhotoFilter) {
  if (filter === 'normal') return;

  const imgData = ctx.getImageData(x, y, w, h);
  const data = imgData.data;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (filter === 'bw') {
      const avg = 0.299 * r + 0.587 * g + 0.114 * b;
      // High contrast S-curve
      const adjusted = avg < 128 
        ? Math.pow(avg / 128, 1.15) * 128 
        : 255 - Math.pow((255 - avg) / 128, 1.15) * 128;
      // Subtle film grain
      const grain = (Math.random() - 0.5) * 8;
      const finalVal = Math.min(255, Math.max(0, adjusted + grain));
      data[i] = finalVal;
      data[i + 1] = finalVal;
      data[i + 2] = finalVal;
    } else if (filter === 'noir') {
      const avg = 0.299 * r + 0.587 * g + 0.114 * b;
      // Harsh noir contrast
      let adjusted = (avg - 128) * 1.35 + 128;
      adjusted = Math.min(255, Math.max(0, adjusted));
      const grain = (Math.random() - 0.5) * 14;
      const finalVal = Math.min(255, Math.max(0, adjusted + grain));
      data[i] = finalVal;
      data[i + 1] = finalVal;
      data[i + 2] = finalVal;
    } else if (filter === 'warm') {
      // Warm amber shift
      data[i] = Math.min(255, r * 1.08 + 10);
      data[i + 1] = Math.min(255, g * 1.02 + 4);
      data[i + 2] = Math.max(0, b * 0.88 - 6);
    } else if (filter === 'chrome') {
      // Cool chrome slate
      data[i] = Math.max(0, r * 0.94 - 4);
      data[i + 1] = Math.min(255, g * 1.02);
      data[i + 2] = Math.min(255, b * 1.12 + 8);
    } else if (filter === 'vintage') {
      // Faded matte shadows + amber tint
      const shadowLift = 15;
      data[i] = Math.min(255, r * 0.95 + shadowLift + 6);
      data[i + 1] = Math.min(255, g * 0.92 + shadowLift + 2);
      data[i + 2] = Math.min(255, b * 0.82 + shadowLift);
    } else if (filter === 'glow') {
      // Gentle bloom highlight
      data[i] = Math.min(255, r * 1.04 + 8);
      data[i + 1] = Math.min(255, g * 1.04 + 8);
      data[i + 2] = Math.min(255, b * 1.04 + 8);
    }
  }

  ctx.putImageData(imgData, x, y);
}

/**
 * Draw single cropped & fitted photo into canvas bounding box (maintaining 4:3 or 1:1 aspect ratio)
 */
function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  filter: PhotoFilter
) {
  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;
  const targetAspect = w / h;
  const imgAspect = imgW / imgH;

  let sx = 0;
  let sy = 0;
  let sWidth = imgW;
  let sHeight = imgH;

  if (imgAspect > targetAspect) {
    sWidth = imgH * targetAspect;
    sx = (imgW - sWidth) / 2;
  } else {
    sHeight = imgW / targetAspect;
    sy = (imgH - sHeight) / 2;
  }

  ctx.save();
  // Draw base image
  ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
  
  // Apply pixel filters if not normal
  if (filter !== 'normal') {
    applyPixelFilters(ctx, x, y, w, h, filter);
  }

  // Draw subtle inner border for crispness
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  ctx.restore();
}

/**
 * High-Resolution Photo Strip Generator
 * Produces crisp, 300DPI-quality printable composite strips
 */
export async function renderPhotoStrip(options: RenderStripOptions): Promise<string> {
  const {
    photos,
    filter = 'normal',
    frameStyle = 'classic-white',
    layout = 'strip-4',
    caption,
    showDate = true,
    showLogo = true,
    dateString,
  } = options;

  const loadedImages = await Promise.all(photos.map((src) => loadImage(src)));
  const frameCfg = FRAMES_CONFIG[frameStyle] || FRAMES_CONFIG['classic-white'];

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const formattedDate = dateString || new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase();

  if (layout === 'strip-4') {
    // ----------------------------------------------------
    // ICONIC VERTICAL 4-PHOTO STRIP (1200 x 3600px at 300DPI equivalent)
    // ----------------------------------------------------
    const stripWidth = 1000;
    const photoMargin = 64; // Horizontal side margins
    const photoWidth = stripWidth - photoMargin * 2; // 872px
    const photoHeight = Math.round(photoWidth * 0.75); // 4:3 ratio -> 654px
    const photoGap = 36; // Gap between photos
    const topMargin = 72;
    const bottomFooterHeight = 260; // Space for logo, caption, and date

    const totalHeight = topMargin + (photoHeight * 4) + (photoGap * 3) + bottomFooterHeight;

    canvas.width = stripWidth;
    canvas.height = totalHeight;

    // 1. Draw frame background
    ctx.fillStyle = frameCfg.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Film border decoration if selected
    if (frameStyle === 'film-border') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      // Sprocket holes on left and right
      const holeW = 18;
      const holeH = 28;
      const holeRadius = 4;
      const sprocketCount = Math.floor(totalHeight / 70);
      
      for (let i = 0; i < sprocketCount; i++) {
        const sy = i * 70 + 20;
        // Left hole
        ctx.beginPath();
        ctx.roundRect(14, sy, holeW, holeH, holeRadius);
        ctx.fill();
        // Right hole
        ctx.beginPath();
        ctx.roundRect(stripWidth - 14 - holeW, sy, holeW, holeH, holeRadius);
        ctx.fill();
      }
    }

    // 3. Draw 4 photos
    for (let i = 0; i < 4; i++) {
      const img = loadedImages[i] || loadedImages[0];
      const y = topMargin + i * (photoHeight + photoGap);

      drawCoverImage(ctx, img, photoMargin, y, photoWidth, photoHeight, filter);

      // If film border, add small frame marker
      if (frameStyle === 'film-border') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '16px "Space Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`0${i + 1}A`, stripWidth - photoMargin, y - 10);
      }
    }

    // 4. Draw Footer (Logo, Caption, Date)
    const footerStartY = topMargin + (photoHeight * 4) + (photoGap * 3) + 40;
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    let currentY = footerStartY;

    if (showLogo) {
      ctx.fillStyle = frameCfg.text;
      ctx.font = 'bold 36px "Space Grotesk", sans-serif';
      ctx.letterSpacing = '6px';
      ctx.fillText('JAZZbOOTH', stripWidth / 2, currentY);
      currentY += 46;
    }

    if (caption && caption.trim().length > 0) {
      ctx.fillStyle = frameCfg.text;
      ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
      ctx.letterSpacing = '1px';
      ctx.fillText(`“${caption.trim()}”`, stripWidth / 2, currentY);
      currentY += 38;
    }

    if (showDate) {
      ctx.fillStyle = frameStyle === 'matte-black' || frameStyle === 'film-border' 
        ? 'rgba(255, 255, 255, 0.5)' 
        : 'rgba(0, 0, 0, 0.45)';
      ctx.font = 'bold 18px "Space Mono", monospace';
      ctx.letterSpacing = '3px';
      ctx.fillText(formattedDate, stripWidth / 2, currentY);
    }

  } else {
    // ----------------------------------------------------
    // 2x2 SQUARE / GRID FORMAT (1600 x 1800px)
    // ----------------------------------------------------
    const gridWidth = 1600;
    const margin = 64;
    const gap = 32;
    const cellWidth = (gridWidth - margin * 2 - gap) / 2; // 720px
    const cellHeight = cellWidth * 0.75; // 540px
    const footerHeight = 220;

    const totalHeight = margin * 2 + cellHeight * 2 + gap + footerHeight;

    canvas.width = gridWidth;
    canvas.height = totalHeight;

    // 1. Draw frame background
    ctx.fillStyle = frameCfg.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Draw 4 photos in 2x2 grid
    for (let i = 0; i < 4; i++) {
      const img = loadedImages[i] || loadedImages[0];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = margin + col * (cellWidth + gap);
      const y = margin + row * (cellHeight + gap);

      drawCoverImage(ctx, img, x, y, cellWidth, cellHeight, filter);
    }

    // 3. Draw Footer
    const footerY = margin + cellHeight * 2 + gap + 36;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    let curY = footerY;

    if (showLogo) {
      ctx.fillStyle = frameCfg.text;
      ctx.font = 'bold 34px "Space Grotesk", sans-serif';
      ctx.letterSpacing = '6px';
      ctx.fillText('JAZZbOOTH', gridWidth / 2, curY);
      curY += 44;
    }

    if (caption && caption.trim().length > 0) {
      ctx.fillStyle = frameCfg.text;
      ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
      ctx.letterSpacing = '1px';
      ctx.fillText(`“${caption.trim()}”`, gridWidth / 2, curY);
      curY += 34;
    }

    if (showDate) {
      ctx.fillStyle = frameStyle === 'matte-black' || frameStyle === 'film-border' 
        ? 'rgba(255, 255, 255, 0.5)' 
        : 'rgba(0, 0, 0, 0.45)';
      ctx.font = 'bold 18px "Space Mono", monospace';
      ctx.letterSpacing = '3px';
      ctx.fillText(formattedDate, gridWidth / 2, curY);
    }
  }

  // Draw Signature / Handwritten Note if provided
  if (options.signature && options.signature.dataUrl) {
    try {
      const sigImg = await loadImage(options.signature.dataUrl);
      const sigScale = options.signature.scale ?? 1;
      const baseSigWidth = layout === 'strip-4' ? canvas.width * 0.45 : canvas.width * 0.35;
      const sigWidth = baseSigWidth * sigScale;
      const sigHeight = (sigImg.height / sigImg.width) * sigWidth;
      
      const sigCenterX = (options.signature.x / 100) * canvas.width;
      const sigCenterY = (options.signature.y / 100) * canvas.height;
      const sigX = sigCenterX - sigWidth / 2;
      const sigY = sigCenterY - sigHeight / 2;

      ctx.drawImage(sigImg, sigX, sigY, sigWidth, sigHeight);
    } catch (e) {
      console.error('Error drawing signature on canvas:', e);
    }
  }

  return canvas.toDataURL('image/png', 0.95);
}

/**
 * Capture frame from HTMLVideoElement directly onto canvas and return base64 dataURL
 */
export function captureVideoFrame(video: HTMLVideoElement, mirrored: boolean = true): string {
  const canvas = document.createElement('canvas');
  const vw = video.videoWidth || 1280;
  const vh = video.videoHeight || 720;
  
  canvas.width = vw;
  canvas.height = vh;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  if (mirrored) {
    ctx.translate(vw, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(video, 0, 0, vw, vh);
  return canvas.toDataURL('image/jpeg', 0.92);
}
