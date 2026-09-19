import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PhotoFilter, FrameStyle, LayoutFormat, PhotoStripData, SignatureData } from '../types';
import { 
  Download, 
  Share2, 
  RotateCcw, 
  Printer, 
  Type, 
  Calendar, 
  Sparkles, 
  Grid,
  Columns,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  PenTool,
  Move,
  Trash2,
  Maximize2
} from 'lucide-react';
import { 
  renderPhotoStrip, 
  FILTERS_CONFIG, 
  FRAMES_CONFIG 
} from '../utils/canvasRenderer';
import { playPrintSound } from '../utils/audio';
import { DirectSignaturePad } from './DirectSignaturePad';

interface ResultViewProps {
  initialPhotos: string[];
  initialFilter?: PhotoFilter;
  onRetake: () => void;
  onSavedToGallery: (strip: PhotoStripData) => void;
  onOpenGallery: () => void;
  onShowToast: (message: string) => void;
}

type StepKey = 'frame' | 'filter' | 'layout' | 'caption' | 'finish';

export const ResultView: React.FC<ResultViewProps> = ({
  initialPhotos,
  initialFilter = 'normal',
  onRetake,
  onSavedToGallery,
  onOpenGallery,
  onShowToast,
}) => {
  // Wizard active step
  const [currentStep, setCurrentStep] = useState<StepKey>('frame');

  // Customization state
  const [currentFilter, setCurrentFilter] = useState<PhotoFilter>(initialFilter);
  const [frameStyle, setFrameStyle] = useState<FrameStyle>('classic-white');
  const [layout, setLayout] = useState<LayoutFormat>('strip-4');
  const [caption, setCaption] = useState<string>('');
  const [showDate, setShowDate] = useState<boolean>(true);
  const [showLogo, setShowLogo] = useState<boolean>(true);
  const [signature, setSignature] = useState<SignatureData | null>(null);
  const [isDraggingSig, setIsDraggingSig] = useState<boolean>(false);

  // Generated High-Res Result Data URL
  const [renderedImageUrl, setRenderedImageUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(true);
  const [savedStripId, setSavedStripId] = useState<string>('');

  const printAudioPlayedRef = useRef(false);
  const stripCardRef = useRef<HTMLDivElement | null>(null);

  // 1. Re-render the composite strip whenever settings change
  const updateRender = useCallback(async () => {
    setIsRendering(true);
    try {
      const dataUrl = await renderPhotoStrip({
        photos: initialPhotos,
        filter: currentFilter,
        frameStyle,
        layout,
        caption,
        showDate,
        showLogo,
        signature: signature || undefined,
      });
      setRenderedImageUrl(dataUrl);

      // Play paper print sound on initial render
      if (!printAudioPlayedRef.current) {
        playPrintSound();
        printAudioPlayedRef.current = true;
      }
    } catch (err) {
      console.error('Failed to render photo strip:', err);
    } finally {
      setIsRendering(false);
    }
  }, [initialPhotos, currentFilter, frameStyle, layout, caption, showDate, showLogo, signature]);

  useEffect(() => {
    updateRender();
  }, [updateRender]);

  // 2. Automatically save/update the strip in Gallery once rendered
  useEffect(() => {
    if (renderedImageUrl) {
      const stripId = savedStripId || `strip_${Date.now()}`;
      const newStrip: PhotoStripData = {
        id: stripId,
        createdAt: Date.now(),
        photos: initialPhotos,
        filter: currentFilter,
        frameStyle,
        layout,
        caption,
        showDate,
        showLogo,
        signature: signature || undefined,
      };
      if (!savedStripId) {
        setSavedStripId(stripId);
      }
      onSavedToGallery(newStrip);
    }
  }, [renderedImageUrl, initialPhotos, currentFilter, frameStyle, layout, caption, showDate, showLogo, signature, onSavedToGallery, savedStripId]);

  // Interactive Signature Drag Handlers
  const handleSignatureDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSig(true);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!stripCardRef.current) return;
      const rect = stripCardRef.current.getBoundingClientRect();
      const clampedX = Math.min(92, Math.max(8, ((moveEvent.clientX - rect.left) / rect.width) * 100));
      const clampedY = Math.min(96, Math.max(4, ((moveEvent.clientY - rect.top) / rect.height) * 100));

      setSignature((prev) => prev ? {
        ...prev,
        x: Math.round(clampedX * 10) / 10,
        y: Math.round(clampedY * 10) / 10,
      } : null);
    };

    const onMouseUp = () => {
      setIsDraggingSig(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleSignatureTouchStart = (e: React.TouchEvent) => {
    setIsDraggingSig(true);

    const onTouchMove = (moveEvent: TouchEvent) => {
      if (!stripCardRef.current || moveEvent.touches.length === 0) return;
      const touch = moveEvent.touches[0];
      const rect = stripCardRef.current.getBoundingClientRect();
      const clampedX = Math.min(92, Math.max(8, ((touch.clientX - rect.left) / rect.width) * 100));
      const clampedY = Math.min(96, Math.max(4, ((touch.clientY - rect.top) / rect.height) * 100));

      setSignature((prev) => prev ? {
        ...prev,
        x: Math.round(clampedX * 10) / 10,
        y: Math.round(clampedY * 10) / 10,
      } : null);
    };

    const onTouchEnd = () => {
      setIsDraggingSig(false);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
  };

  const handleSaveSignature = (dataUrl: string) => {
    setSignature((prev) => ({
      dataUrl,
      x: prev?.x ?? 50,
      y: prev?.y ?? 88,
      scale: prev?.scale ?? 1.0,
    }));
    onShowToast('Signature saved! Drag on preview to position.');
  };

  // 3. Download high-resolution PNG
  const handleDownload = () => {
    if (!renderedImageUrl) return;
    const link = document.createElement('a');
    const filename = `photobooth-${new Date().toISOString().slice(0, 10)}-${Date.now().toString().slice(-4)}.png`;
    link.download = filename;
    link.href = renderedImageUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Photo strip downloaded!');
  };

  // 4. Native Share or Copy Image / Link
  const handleShare = async () => {
    if (!renderedImageUrl) return;

    try {
      const res = await fetch(renderedImageUrl);
      const blob = await res.blob();
      const file = new File([blob], 'photobooth-strip.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'My PHOTObOOTH Strip',
          text: 'Take four. Keep the moment.',
          files: [file],
        });
        onShowToast('Shared successfully!');
      } else if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob,
          }),
        ]);
        onShowToast('Photo strip copied to clipboard!');
      } else {
        handleDownload();
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        handleDownload();
      }
    }
  };

  // 5. Direct Browser Print
  const handlePrint = () => {
    window.print();
  };

  const frames = Object.entries(FRAMES_CONFIG) as [FrameStyle, typeof FRAMES_CONFIG[FrameStyle]][];
  const filters = Object.entries(FILTERS_CONFIG) as [PhotoFilter, typeof FILTERS_CONFIG[PhotoFilter]][];

  // Procedural step transitions
  const goToNextStep = () => {
    if (currentStep === 'frame') setCurrentStep('filter');
    else if (currentStep === 'filter') setCurrentStep('layout');
    else if (currentStep === 'layout') setCurrentStep('caption');
    else if (currentStep === 'caption') setCurrentStep('finish');
  };

  const goToPrevStep = () => {
    if (currentStep === 'filter') setCurrentStep('frame');
    else if (currentStep === 'layout') setCurrentStep('filter');
    else if (currentStep === 'caption') setCurrentStep('layout');
    else if (currentStep === 'finish') setCurrentStep('caption');
  };

  return (
    <div className="w-full min-h-[calc(100vh-2rem)] max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
      {/* Main Grid: Left preview (Physical Strip), Right procedural wizard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        
        {/* Left Column: Physical Photo Strip Display (Sticky in viewport) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center lg:sticky lg:top-8 transition-all duration-700 ease-out">
          <div className="relative w-full max-w-[280px] sm:max-w-[320px] flex justify-center">
            {/* The Physical Paper Photo Strip */}
            {renderedImageUrl ? (
              <div 
                ref={stripCardRef}
                id="rendered-photo-strip-card"
                className={`animate-print relative w-full rounded-sm overflow-hidden photostrip-print-target shadow-2xl transition-all duration-700 ease-out select-none ${
                  currentStep === 'caption'
                    ? 'scale-[1.22] -translate-y-44 sm:-translate-y-64 lg:-translate-y-96 xl:-translate-y-[420px] ring-4 ring-black/15 origin-bottom shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)]'
                    : 'scale-100 translate-y-0 hover:scale-[1.01]'
                }`}
              >
                <img
                  src={renderedImageUrl}
                  alt="PHOTObOOTH generated strip"
                  className="w-full h-auto block transition-transform duration-700 ease-out pointer-events-none select-none"
                  draggable={false}
                />

                {/* Interactive Draggable Signature Overlay on Preview */}
                {signature && (
                  <div
                    className={`absolute select-none touch-none z-30 cursor-move group/sig transition-transform ${
                      isDraggingSig ? 'scale-105 opacity-90' : 'hover:scale-102'
                    }`}
                    style={{
                      left: `${signature.x}%`,
                      top: `${signature.y}%`,
                      width: `${layout === 'strip-4' ? 45 * (signature.scale || 1) : 35 * (signature.scale || 1)}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    onMouseDown={handleSignatureDragStart}
                    onTouchStart={handleSignatureTouchStart}
                    title="Click & drag to reposition signature anywhere on the strip"
                  >
                    <div className="relative w-full">
                      <img
                        src={signature.dataUrl}
                        alt="Signature overlay"
                        className="w-full h-auto pointer-events-none filter drop-shadow-sm select-none"
                        draggable={false}
                      />
                      
                      {/* Visual bounding indicator during caption step */}
                      {currentStep === 'caption' && (
                        <div className="absolute -inset-1.5 border-2 border-dashed border-black/40 rounded-lg group-hover/sig:border-black pointer-events-none">
                          <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center shadow">
                            <Move className="w-2.5 h-2.5" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Subtle highlight ring & focus indicator for stamps area in caption mode */}
                {currentStep === 'caption' && (
                  <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/15 via-transparent to-transparent pointer-events-none transition-opacity duration-500" />
                )}
              </div>
            ) : (
              <div className="w-[260px] h-[520px] bg-white rounded-sm flex flex-col items-center justify-center gap-3 border border-black/10 animate-pulse shadow-sm">
                <Sparkles className="w-5 h-5 text-black/40 animate-spin" />
                <span className="text-[10px] font-mono-stamp text-black/50 uppercase tracking-widest">
                  Rendering photo strip...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Procedural Step Wizard with Large Accessible Controls */}
        <div className="lg:col-span-7 flex flex-col space-y-6">

          {/* ========================================================================= */}
          {/* STEP 1: FRAME SELECTION (Box-Sized Previews with Frame Names Below) */}
          {/* ========================================================================= */}
          {currentStep === 'frame' && (
            <div className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1A1A]">
                Choose your frame style
              </h2>

              {/* Grid of Box-Sized Frame Previews (Borderless White Cards) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-4">
                {frames.map(([id, cfg]) => {
                  const isSelected = frameStyle === id;
                  return (
                    <button
                      key={id}
                      id={`frame-style-${id}`}
                      onClick={() => setFrameStyle(id)}
                      className={`flex flex-col p-3 rounded-2xl text-left transition-all active:scale-[0.98] group relative bg-white cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-[#1A1A1A] shadow-md'
                          : 'shadow-xs hover:shadow-md'
                      }`}
                    >
                      {/* Box-Sized Frame Design Preview */}
                      <div 
                        className="w-full h-32 sm:h-36 rounded-xl relative overflow-hidden flex flex-col items-center justify-center p-2.5 shadow-inner transition-all"
                        style={{
                          backgroundColor: cfg.bg,
                        }}
                      >
                        {/* Film Sprockets for Film Border */}
                        {id === 'film-border' && (
                          <>
                            <div className="absolute left-1 top-0 bottom-0 flex flex-col justify-around py-1 pointer-events-none">
                              {[...Array(5)].map((_, i) => (
                                <div key={i} className="w-1.5 h-2 bg-white/30 rounded-[1px]" />
                              ))}
                            </div>
                            <div className="absolute right-1 top-0 bottom-0 flex flex-col justify-around py-1 pointer-events-none">
                              {[...Array(5)].map((_, i) => (
                                <div key={i} className="w-1.5 h-2 bg-white/30 rounded-[1px]" />
                              ))}
                            </div>
                          </>
                        )}

                        {/* Miniature Photostrip Body with actual photo previews */}
                        <div className={`flex flex-col gap-1.5 items-center w-full max-w-[60px] ${id === 'film-border' ? 'px-0.5' : ''}`}>
                          <div className="w-full aspect-[4/3] rounded-xs overflow-hidden bg-black/10 shadow-xs">
                            {initialPhotos[0] ? (
                              <img src={initialPhotos[0]} alt="preview" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-neutral-300" />
                            )}
                          </div>
                          <div className="w-full aspect-[4/3] rounded-xs overflow-hidden bg-black/10 shadow-xs">
                            {initialPhotos[1] || initialPhotos[0] ? (
                              <img src={initialPhotos[1] || initialPhotos[0]} alt="preview" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-neutral-300" />
                            )}
                          </div>
                        </div>

                        {/* Selection Check Badge */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center shadow">
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Name of the Frame Below */}
                      <div className="pt-2.5 pb-0.5 text-center w-full">
                        <div className="text-xs sm:text-sm font-bold text-[#1A1A1A] truncate">
                          {cfg.name}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Next Action - Icon-Only Pill Shaped Button */}
              <div className="pt-4 flex justify-end">
                <button
                  id="frame-step-next-btn"
                  onClick={goToNextStep}
                  className="px-7 py-3.5 rounded-full bg-[#1A1A1A] hover:bg-black text-white inline-flex items-center justify-center shadow-md hover:shadow-xl transition-all active:scale-95 cursor-pointer group"
                  aria-label="Next step"
                  title="Next"
                >
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: FILTER SELECTION (Box-Sized Photo Previews with Filter Names Below) */}
          {/* ========================================================================= */}
          {currentStep === 'filter' && (
            <div className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1A1A]">
                Choose your photo filter
              </h2>

              {/* Grid of Box-Sized Filter Previews (Borderless White Cards) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-3.5">
                {filters.map(([id, cfg]) => {
                  const isSelected = currentFilter === id;
                  const previewImage = initialPhotos[0] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
                  
                  return (
                    <button
                      key={id}
                      id={`result-filter-${id}`}
                      onClick={() => setCurrentFilter(id)}
                      className={`flex flex-col rounded-xl text-left overflow-hidden transition-all active:scale-[0.98] group relative bg-white cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-[#1A1A1A] shadow-md'
                          : 'shadow-xs hover:shadow-md'
                      }`}
                    >
                      {/* Photo Filter Preset Preview (Fills majority of card) */}
                      <div className="relative w-full aspect-[4/3] sm:aspect-square overflow-hidden bg-neutral-200">
                        <img 
                          src={previewImage} 
                          alt={cfg.name} 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          style={{
                            filter: cfg.cssFilter !== 'none' ? cfg.cssFilter : undefined
                          }}
                        />

                        {/* Selection Check Badge */}
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center shadow">
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Small Separation */}
                      <div className="w-full h-[1px] bg-black/5" />

                      {/* Compact Filter Name Area Below */}
                      <div className="w-full py-2 px-2 text-center bg-[#FAF9F6]/60 flex items-center justify-center">
                        <div className="text-xs sm:text-sm font-bold text-[#1A1A1A] tracking-tight truncate w-full">
                          {cfg.name}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Navigation Actions - Icon-Only Pill-Shaped Buttons */}
              <div className="pt-4 flex items-center justify-between gap-3">
                <button
                  id="filter-step-prev-btn"
                  onClick={goToPrevStep}
                  className="px-6 py-3.5 rounded-full bg-white hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] inline-flex items-center justify-center shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer group"
                  aria-label="Previous step"
                  title="Back"
                >
                  <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
                </button>

                <button
                  id="filter-step-next-btn"
                  onClick={goToNextStep}
                  className="px-7 py-3.5 rounded-full bg-[#1A1A1A] hover:bg-black text-white inline-flex items-center justify-center shadow-md hover:shadow-xl transition-all active:scale-95 cursor-pointer group"
                  aria-label="Next step"
                  title="Next"
                >
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: LAYOUT SELECTION (Borderless White Cards) */}
          {/* ========================================================================= */}
          {currentStep === 'layout' && (
            <div className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1A1A]">
                Choose your layout
              </h2>

              {/* Large Layout Option Cards (Borderless White Cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 4-Strip Option */}
                <button
                  id="layout-strip-4-btn"
                  onClick={() => setLayout('strip-4')}
                  className={`flex flex-col items-start p-5 sm:p-6 rounded-2xl text-left transition-all active:scale-[0.99] bg-white cursor-pointer ${
                    layout === 'strip-4'
                      ? 'ring-2 ring-[#1A1A1A] shadow-md'
                      : 'shadow-xs hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className="w-10 h-10 rounded-lg bg-black/5 flex items-center justify-center text-[#1A1A1A]">
                      <Columns className="w-5 h-5" />
                    </div>
                    {layout === 'strip-4' && (
                      <CheckCircle2 className="w-5 h-5 text-[#1A1A1A]" />
                    )}
                  </div>
                  <div className="text-base font-bold text-[#1A1A1A]">
                    Classic 4-Strip
                  </div>
                  <p className="text-xs text-[#1A1A1A]/60 font-mono-stamp mt-1">
                    Vertical bookmark layout • 4 frames stacked
                  </p>
                </button>

                {/* 2x2 Grid Option */}
                <button
                  id="layout-grid-4-btn"
                  onClick={() => setLayout('grid-4')}
                  className={`flex flex-col items-start p-5 sm:p-6 rounded-2xl text-left transition-all active:scale-[0.99] bg-white cursor-pointer ${
                    layout === 'grid-4'
                      ? 'ring-2 ring-[#1A1A1A] shadow-md'
                      : 'shadow-xs hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className="w-10 h-10 rounded-lg bg-black/5 flex items-center justify-center text-[#1A1A1A]">
                      <Grid className="w-5 h-5" />
                    </div>
                    {layout === 'grid-4' && (
                      <CheckCircle2 className="w-5 h-5 text-[#1A1A1A]" />
                    )}
                  </div>
                  <div className="text-base font-bold text-[#1A1A1A]">
                    2×2 Postcard Grid
                  </div>
                  <p className="text-xs text-[#1A1A1A]/60 font-mono-stamp mt-1">
                    Square print card • 4 frames arranged 2 by 2
                  </p>
                </button>
              </div>

              {/* Navigation Actions - Icon-Only Pill-Shaped Buttons */}
              <div className="pt-4 flex items-center justify-between gap-3">
                <button
                  id="layout-step-prev-btn"
                  onClick={goToPrevStep}
                  className="px-6 py-3.5 rounded-full bg-white hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] inline-flex items-center justify-center shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer group"
                  aria-label="Previous step"
                  title="Back"
                >
                  <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
                </button>

                <button
                  id="layout-step-next-btn"
                  onClick={goToNextStep}
                  className="px-7 py-3.5 rounded-full bg-[#1A1A1A] hover:bg-black text-white inline-flex items-center justify-center shadow-md hover:shadow-xl transition-all active:scale-95 cursor-pointer group"
                  aria-label="Next step"
                  title="Next"
                >
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: CAPTION & DETAILS (Direct Drawing, Clean Controls & Toggles) */}
          {/* ========================================================================= */}
          {currentStep === 'caption' && (
            <div className="space-y-5">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1A1A]">
                Customize your strip
              </h2>

              {/* Direct Draw Signature / Doodle Area */}
              <DirectSignaturePad
                onSave={handleSaveSignature}
                onClear={() => setSignature(null)}
                hasExistingSignature={!!signature}
              />

              {/* Signature Scale Pill Bar (if signature exists) */}
              {signature && (
                <div className="flex items-center justify-between px-4 py-2.5 bg-white rounded-xl shadow-xs">
                  <span className="text-xs font-mono-stamp font-bold text-black/60 uppercase tracking-wider">
                    Signature Size
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { label: 'S', scale: 0.75 },
                      { label: 'M', scale: 1.0 },
                      { label: 'L', scale: 1.35 },
                    ].map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => setSignature(prev => prev ? { ...prev, scale: s.scale } : null)}
                        className={`w-7 h-7 rounded-full text-xs font-mono-stamp font-bold transition-all cursor-pointer ${
                          (signature.scale || 1.0) === s.scale
                            ? 'bg-[#1A1A1A] text-white shadow-xs'
                            : 'bg-black/5 text-black/60 hover:text-black'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Caption Input Box */}
              <div className="relative">
                <input
                  id="result-caption-input"
                  type="text"
                  maxLength={40}
                  placeholder="Add custom caption (optional)..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full p-4 rounded-xl bg-white shadow-xs text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-black placeholder:text-black/30 font-mono-stamp transition-all"
                />
                <span className="absolute right-4 top-4 text-xs font-mono-stamp text-black/40">
                  {caption.length}/40
                </span>
              </div>

              {/* Toggle Stamps Cards */}
              <div className="grid grid-cols-2 gap-3">
                {/* Date Stamp Toggle */}
                <label className={`flex items-center justify-between p-3.5 sm:p-4 rounded-xl cursor-pointer transition-all bg-white ${
                  showDate 
                    ? 'ring-2 ring-[#1A1A1A] shadow-md' 
                    : 'shadow-xs hover:shadow-md'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-[#1A1A1A]" />
                    <span className="text-xs sm:text-sm font-bold text-[#1A1A1A]">Date Stamp</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showDate}
                    onChange={(e) => setShowDate(e.target.checked)}
                    className="w-4 h-4 rounded text-black focus:ring-black cursor-pointer"
                  />
                </label>

                {/* Brand Stamp Toggle */}
                <label className={`flex items-center justify-between p-3.5 sm:p-4 rounded-xl cursor-pointer transition-all bg-white ${
                  showLogo 
                    ? 'ring-2 ring-[#1A1A1A] shadow-md' 
                    : 'shadow-xs hover:shadow-md'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <Type className="w-4 h-4 text-[#1A1A1A]" />
                    <span className="text-xs sm:text-sm font-bold text-[#1A1A1A]">Header Stamp</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showLogo}
                    onChange={(e) => setShowLogo(e.target.checked)}
                    className="w-4 h-4 rounded text-black focus:ring-black cursor-pointer"
                  />
                </label>
              </div>

              {/* Navigation Actions - Icon-Only Pill-Shaped Buttons */}
              <div className="pt-4 flex items-center justify-between gap-3">
                <button
                  id="caption-step-prev-btn"
                  onClick={goToPrevStep}
                  className="px-6 py-3.5 rounded-full bg-white hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] inline-flex items-center justify-center shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer group"
                  aria-label="Previous step"
                  title="Back"
                >
                  <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
                </button>

                <button
                  id="caption-step-next-btn"
                  onClick={goToNextStep}
                  className="px-7 py-3.5 rounded-full bg-[#1A1A1A] hover:bg-black text-white inline-flex items-center justify-center shadow-md hover:shadow-xl transition-all active:scale-95 cursor-pointer group"
                  aria-label="Next step"
                  title="Next"
                >
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: FINISH & ACTIONS (Borderless White Cards) */}
          {/* ========================================================================= */}
          {currentStep === 'finish' && (
            <div className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1A1A]">
                Your strip is ready
              </h2>

              {/* Primary Large Actions Grid (Borderless Clean Cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. Download High-Res */}
                <button
                  id="result-download-btn"
                  onClick={handleDownload}
                  className="flex items-center gap-3.5 p-4 sm:p-5 rounded-2xl bg-[#1A1A1A] hover:bg-black text-white text-left transition-all active:scale-95 shadow-md hover:shadow-xl group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white group-hover:scale-110 transition-transform flex-shrink-0">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-bold">Download PNG</div>
                    <div className="text-xs text-white/60 font-mono-stamp mt-0.5">High-resolution 300 DPI</div>
                  </div>
                </button>

                {/* 2. Native Share / Copy */}
                <button
                  id="result-share-btn"
                  onClick={handleShare}
                  className="flex items-center gap-3.5 p-4 sm:p-5 rounded-2xl bg-white hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] text-left transition-all active:scale-95 shadow-xs hover:shadow-md group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-black/5 group-hover:bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-bold">Share Strip</div>
                    <div className="text-xs opacity-60 font-mono-stamp mt-0.5">AirDrop, Messages, or Copy</div>
                  </div>
                </button>

                {/* 3. Browser Print */}
                <button
                  id="result-print-btn"
                  onClick={handlePrint}
                  className="flex items-center gap-3.5 p-4 sm:p-5 rounded-2xl bg-white hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] text-left transition-all active:scale-95 shadow-xs hover:shadow-md group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-black/5 group-hover:bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-bold">Print Strip</div>
                    <div className="text-xs opacity-60 font-mono-stamp mt-0.5">Standard photo size</div>
                  </div>
                </button>

                {/* 4. Retake Booth */}
                <button
                  id="result-retake-btn"
                  onClick={onRetake}
                  className="flex items-center gap-3.5 p-4 sm:p-5 rounded-2xl bg-white hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] text-left transition-all active:scale-95 shadow-xs hover:shadow-md group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-black/5 group-hover:bg-white/10 flex items-center justify-center flex-shrink-0">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-bold">Retake Photos</div>
                    <div className="text-xs opacity-60 font-mono-stamp mt-0.5">Start a fresh 4-photo session</div>
                  </div>
                </button>
              </div>

              {/* Navigation Actions - Icon-Only Pill-Shaped Button */}
              <div className="pt-4 flex items-center justify-between gap-3">
                <button
                  id="finish-step-prev-btn"
                  onClick={goToPrevStep}
                  className="px-6 py-3.5 rounded-full bg-white hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] inline-flex items-center justify-center shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer group"
                  aria-label="Previous step"
                  title="Back"
                >
                  <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
                </button>

                <button
                  id="result-view-gallery-btn"
                  onClick={onOpenGallery}
                  className="px-6 py-3.5 rounded-full bg-[#1A1A1A] hover:bg-black text-white inline-flex items-center gap-2 shadow-md hover:shadow-xl transition-all active:scale-95 cursor-pointer group text-xs sm:text-sm font-bold uppercase tracking-wider font-mono-stamp"
                >
                  <span>Gallery</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
