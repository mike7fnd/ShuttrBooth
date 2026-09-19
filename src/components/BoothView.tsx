import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PhotoFilter, FilterOption } from '../types';
import { 
  X, 
  SwitchCamera, 
  FlipHorizontal, 
  Sparkles, 
  AlertCircle, 
  RefreshCw, 
  Upload
} from 'lucide-react';
import { FILTERS_CONFIG, captureVideoFrame } from '../utils/canvasRenderer';
import { playCountdownTick, playShutterSound, warmUpAudio } from '../utils/audio';

interface BoothViewProps {
  onExit: () => void;
  onPhotosCaptured: (photos: string[], filter: PhotoFilter) => void;
}

const FILTER_LIST: FilterOption[] = Object.entries(FILTERS_CONFIG).map(([id, cfg]) => ({
  id: id as PhotoFilter,
  name: cfg.name,
  description: cfg.desc,
  cssFilter: cfg.cssFilter,
}));

export const BoothView: React.FC<BoothViewProps> = ({ onExit, onPhotosCaptured }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Camera settings
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMirrored, setIsMirrored] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  // Photobooth state
  const [currentFilter, setCurrentFilter] = useState<PhotoFilter>('normal');
  const [isCapturingSequence, setIsCapturingSequence] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState<number>(0); // 0 to 3
  const [countdown, setCountdown] = useState<number | null>(null); // 3, 2, 1
  const [isFlashing, setIsFlashing] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [showFilterPicker, setShowFilterPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Initialize and manage Camera Stream
  const initCamera = useCallback(async (facing: 'user' | 'environment') => {
    setCameraError(null);
    setIsStreaming(false);

    // Stop existing tracks first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser.');
      }

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: facing,
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setIsStreaming(true);
          }).catch((err) => {
            console.error('Video play error:', err);
          });
        };
      }
    } catch (err: unknown) {
      console.warn('Camera access denied or failed:', err);
      const errMsg = err instanceof Error ? err.message : 'Unable to access camera.';
      setCameraError(errMsg);
      setIsStreaming(false);
    }
  }, []);

  // Lifecycle: mount and unmount stream cleanup
  useEffect(() => {
    warmUpAudio();
    initCamera(facingMode);

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [initCamera, facingMode]);

  // Adjust mirror mode when switching camera facing mode
  const handleToggleFacingMode = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    setIsMirrored(nextFacing === 'user');
    initCamera(nextFacing);
  };

  // 2. Automated 4-Photo Capture Sequence (3 -> 2 -> 1 -> flash -> take -> repeat 4 times)
  const startPhotoboothSequence = async () => {
    if (isCapturingSequence) return;
    warmUpAudio();
    setIsCapturingSequence(true);
    setCapturedPhotos([]);
    setCurrentPhotoIndex(0);

    const photos: string[] = [];

    for (let photoNum = 0; photoNum < 4; photoNum++) {
      setCurrentPhotoIndex(photoNum);

      // 3 -> 2 -> 1 Countdown
      for (let sec = 3; sec >= 1; sec--) {
        setCountdown(sec);
        playCountdownTick(sec === 1);
        await new Promise((r) => setTimeout(r, 1000));
      }

      setCountdown(null);

      // Shutter Trigger & Flash
      setIsFlashing(true);
      playShutterSound();

      let photoData = '';
      if (videoRef.current && isStreaming) {
        photoData = captureVideoFrame(videoRef.current, isMirrored);
      } else {
        photoData = generateSimulatedPhoto(photoNum + 1);
      }

      photos.push(photoData);
      setCapturedPhotos([...photos]);

      // Brief flash display
      await new Promise((r) => setTimeout(r, 180));
      setIsFlashing(false);

      // Pause between photos so user can change pose (1.2 seconds)
      if (photoNum < 3) {
        await new Promise((r) => setTimeout(r, 1100));
      }
    }

    // Sequence complete -> pass to result view
    await new Promise((r) => setTimeout(r, 450));
    setIsCapturingSequence(false);
    onPhotosCaptured(photos, currentFilter);
  };

  // Fallback simulation canvas if webcam isn't available
  const generateSimulatedPhoto = (num: number): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 960;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const grad = ctx.createLinearGradient(0, 0, 1280, 960);
    grad.addColorStop(0, '#2D2D2D');
    grad.addColorStop(1, '#1A1A1A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 960);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 120px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Pose ${num}`, 640, 480);

    ctx.font = '32px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('PHOTObOOTH', 640, 550);

    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList: File[] = Array.from<File>(files).slice(0, 4);
    const readers = fileList.map((file: File) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then((results) => {
      while (results.length < 4) {
        results.push(results[0]);
      }
      onPhotosCaptured(results.slice(0, 4), currentFilter);
    });
  };

  const currentCssFilter = FILTERS_CONFIG[currentFilter]?.cssFilter || 'none';

  return (
    <div className="fixed inset-0 z-50 bg-[#F9F8F6] text-[#1A1A1A] flex flex-col overflow-hidden select-none">
      {/* 1. TOP BAR */}
      <nav className="flex justify-between items-center px-4 sm:px-8 lg:px-12 py-4 sm:py-5 z-10 border-b border-black/5 bg-[#F9F8F6]/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold font-mono-stamp text-[#1A1A1A]">
            {isCapturingSequence ? `PHOTO ${currentPhotoIndex + 1} OF 4` : 'READY'}
          </span>
        </div>

        <div className="flex gap-4 sm:gap-6 items-center">
          <span className="text-sm font-semibold font-mono-stamp text-[#1A1A1A]/70">
            {isCapturingSequence ? `${currentPhotoIndex + 1} / 4` : `${capturedPhotos.length > 0 ? capturedPhotos.length : 1} / 4`}
          </span>

          <button
            id="booth-exit-btn"
            onClick={onExit}
            disabled={isCapturingSequence}
            className="w-9 h-9 rounded-full border border-black/15 flex items-center justify-center hover:bg-[#1A1A1A] hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
            title="Exit Booth"
            aria-label="Exit Booth"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* 2. MAIN LAYOUT: Camera Viewport + Current Strip Sidebar */}
      <main className="flex-1 flex flex-col lg:flex-row px-4 sm:px-8 lg:px-12 gap-6 lg:gap-8 py-4 sm:py-6 overflow-hidden min-h-0">
        
        {/* Left / Center Camera Frame */}
        <div className="flex-1 relative bg-[#1A1A1A] rounded-lg shadow-2xl overflow-hidden flex items-center justify-center group min-h-[300px]">
          
          {/* Mirror toggle button */}
          <button
            onClick={() => setIsMirrored(!isMirrored)}
            disabled={isCapturingSequence}
            className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/80 hover:text-white transition-colors"
            title={isMirrored ? 'Disable Mirroring' : 'Enable Mirroring'}
          >
            <FlipHorizontal className="w-4 h-4" />
          </button>

          {/* Live Video Stream */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover transition-all duration-200 ${
              isMirrored ? '-scale-x-100' : ''
            }`}
            style={{ filter: currentCssFilter }}
          />

          {/* Camera Flash effect */}
          <AnimatePresence>
            {isFlashing && (
              <motion.div 
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 bg-white z-40 pointer-events-none" 
              />
            )}
          </AnimatePresence>

          {/* Large Minimalist Countdown Overlay with Apple spring pop */}
          <AnimatePresence mode="wait">
            {countdown !== null && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/35 backdrop-blur-[2px]">
                <motion.div 
                  key={countdown}
                  initial={{ scale: 0.4, opacity: 0, filter: 'blur(8px)' }}
                  animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                  exit={{ scale: 1.35, opacity: 0, filter: 'blur(4px)' }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="text-[130px] sm:text-[190px] md:text-[230px] font-bold text-white select-none tracking-tighter drop-shadow-2xl font-mono-stamp"
                >
                  {countdown}
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Camera Error State */}
          {cameraError && (
            <div className="absolute inset-0 z-20 bg-[#1A1A1A] flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="font-bold text-base text-white">Camera Unavailable</h3>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => initCamera(facingMode)}
                  className="inline-flex items-center gap-1.5 bg-white text-black text-[10px] font-semibold uppercase tracking-widest py-2.5 px-4 rounded hover:bg-white/90 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Camera</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 border border-white/20 text-white text-[10px] font-semibold uppercase tracking-widest py-2.5 px-4 rounded hover:bg-white/10 transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Photos</span>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleManualUpload}
              />
            </div>
          )}

          {/* Filter Bar overlay inside camera when picker opened */}
          <AnimatePresence>
            {showFilterPicker && (
              <motion.div 
                initial={{ opacity: 0, y: 16, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                className="absolute bottom-24 sm:bottom-28 left-4 right-4 z-30 flex justify-center"
              >
                <div className="bg-black/80 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-full flex gap-1.5 overflow-x-auto max-w-full no-scrollbar shadow-2xl">
                  {FILTER_LIST.map((filter) => {
                    const isSelected = currentFilter === filter.id;
                    return (
                      <button
                        key={filter.id}
                        onClick={() => setCurrentFilter(filter.id)}
                        className={`px-3 py-1 rounded-full text-[10px] font-mono-stamp uppercase tracking-wider transition-all whitespace-nowrap ${
                          isSelected
                            ? 'bg-white text-black font-bold'
                            : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {filter.name}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Viewport Control Cluster */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col items-center z-20">
            <div className="flex items-center gap-6 sm:gap-8">
              
              {/* Flip Button */}
              <motion.button
                id="booth-flip-camera-btn"
                onClick={handleToggleFacingMode}
                disabled={isCapturingSequence}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors disabled:opacity-30 cursor-pointer"
                title="Flip Camera"
              >
                <SwitchCamera className="w-4 h-4 sm:w-5 sm:h-5" />
              </motion.button>

              {/* Center Shutter Button */}
              <motion.button
                id="booth-shutter-btn"
                onClick={startPhotoboothSequence}
                disabled={isCapturingSequence}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-white flex items-center justify-center p-1 border-4 border-white/20 disabled:opacity-40 disabled:pointer-events-none shadow-xl cursor-pointer"
                title="Capture 4 Photos"
                aria-label="Capture 4 Photos"
              >
                <div className="w-full h-full rounded-full border-2 border-black flex items-center justify-center">
                  {isCapturingSequence ? (
                    <span className="font-mono-stamp font-bold text-xs sm:text-sm text-black">
                      {countdown !== null ? countdown : `${currentPhotoIndex + 1}/4`}
                    </span>
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full bg-black/90" />
                  )}
                </div>
              </motion.button>

              {/* Filter Picker Button */}
              <motion.button
                id="booth-filter-toggle-btn"
                onClick={() => setShowFilterPicker(!showFilterPicker)}
                disabled={isCapturingSequence}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border flex items-center justify-center transition-colors disabled:opacity-30 cursor-pointer ${
                  showFilterPicker || currentFilter !== 'normal' 
                    ? 'border-white bg-white text-black' 
                    : 'border-white/20 text-white hover:bg-white hover:text-black'
                }`}
                title="Select Filter"
              >
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              </motion.button>

            </div>
          </div>

        </div>

        {/* Right: Current Strip Preview Sidebar */}
        <div className="w-full lg:w-56 flex flex-col">
          <div className="flex justify-between items-end mb-2">
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]">Current Strip</span>
          </div>

          <div className="flex-1 bg-white p-3 shadow-xl rounded-sm flex flex-col gap-2 relative border border-black/5 min-h-[360px]">
            {[0, 1, 2, 3].map((slotIdx) => {
              const photoSrc = capturedPhotos[slotIdx];
              return (
                <div 
                  key={slotIdx} 
                  className="w-full aspect-[4/3] bg-gray-50 border border-black/5 flex items-center justify-center overflow-hidden"
                >
                  {photoSrc ? (
                    <img 
                      src={photoSrc} 
                      alt={`Pose ${slotIdx + 1}`} 
                      className="w-full h-full object-cover" 
                      style={{ filter: currentCssFilter }}
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full border border-dashed border-black/15 flex items-center justify-center font-mono-stamp text-[10px] text-black/30 font-bold">
                      {slotIdx + 1}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Strip Stamp Footer */}
            <div className="mt-auto pt-3 flex flex-col items-center gap-0.5 opacity-30">
              <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#1A1A1A]">PHOTObOOTH</p>
              <p className="text-[7px] uppercase tracking-[0.1em] font-mono-stamp text-[#1A1A1A]">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Quick upload fallback action */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border border-black/20 text-[#1A1A1A] text-[10px] uppercase tracking-widest py-2.5 rounded hover:bg-black hover:text-white transition-colors font-medium font-mono-stamp"
            >
              Upload Images
            </button>
          </div>
        </div>

      </main>
    </div>
  );
};
