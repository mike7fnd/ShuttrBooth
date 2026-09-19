import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, Trash2, Check, X, Sparkles } from 'lucide-react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
  initialDataUrl?: string;
}

const PEN_COLORS = [
  { label: 'Black Ink', hex: '#1A1A1A' },
  { label: 'White Ink', hex: '#FFFFFF' },
  { label: 'Rose Red', hex: '#E11D48' },
  { label: 'Cobalt Blue', hex: '#2563EB' },
  { label: 'Golden Brown', hex: '#B45309' },
  { label: 'Lavender', hex: '#7C3AED' },
];

const PEN_SIZES = [
  { label: 'Fine', size: 3 },
  { label: 'Medium', size: 5 },
  { label: 'Thick', size: 9 },
];

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDataUrl,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState<string>('#1A1A1A');
  const [penSize, setPenSize] = useState<number>(5);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);

  // Setup canvas
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Handle high-DPI crisp rendering
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      // Clear
      ctx.clearRect(0, 0, rect.width, rect.height);
      
      // Save initial blank state
      const blankState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([blankState]);
      setHasStrokes(false);

      // Load initial if exists
      if (initialDataUrl) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
          setHasStrokes(true);
          const stateWithImg = ctx.getImageData(0, 0, canvas.width, canvas.height);
          setHistory([blankState, stateWithImg]);
        };
        img.src = initialDataUrl;
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, initialDataUrl]);

  if (!isOpen) return null;

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCanvasCoords(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasStrokes(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.closePath();

    // Save snapshot to history
    const state = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev, state]);
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = history.slice(0, history.length - 1);
    const previousState = newHistory[newHistory.length - 1];
    ctx.putImageData(previousState, 0, 0);
    setHistory(newHistory);
    setHasStrokes(newHistory.length > 1);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const blank = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory([blank]);
    setHasStrokes(false);
  };

  // Helper to trim transparent pixels for optimal placement
  const trimCanvas = (canvas: HTMLCanvasElement): string => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas.toDataURL('image/png');

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let found = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 10) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!found) return '';

    // Add small padding
    const padding = 16 * dpr;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width, maxX + padding);
    maxY = Math.min(height, maxY + padding);

    const trimmedWidth = maxX - minX;
    const trimmedHeight = maxY - minY;

    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = trimmedWidth;
    trimmedCanvas.height = trimmedHeight;
    const trimmedCtx = trimmedCanvas.getContext('2d');
    if (!trimmedCtx) return canvas.toDataURL('image/png');

    trimmedCtx.drawImage(
      canvas,
      minX,
      minY,
      trimmedWidth,
      trimmedHeight,
      0,
      0,
      trimmedWidth,
      trimmedHeight
    );

    return trimmedCanvas.toDataURL('image/png');
  };

  const handleApply = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokes) return;

    const trimmedDataUrl = trimCanvas(canvas);
    if (trimmedDataUrl) {
      onSave(trimmedDataUrl);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#EDEAE3] w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-xs text-[#1A1A1A]">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#1A1A1A] font-display">
                Digital Signature / Doodle
              </h3>
              <p className="text-xs text-black/50 font-mono-stamp">
                Sign or draw with your finger or mouse
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white hover:bg-black hover:text-white flex items-center justify-center transition-colors cursor-pointer text-black/70"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Canvas Surface (Muted light drawing pad with subtle paper texture) */}
        <div className="relative w-full h-56 sm:h-64 rounded-2xl overflow-hidden bg-white shadow-inner touch-none border border-black/5">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={(e) => {
              e.preventDefault();
              startDrawing(e);
            }}
            onTouchMove={(e) => {
              e.preventDefault();
              draw(e);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              stopDrawing();
            }}
          />

          {!hasStrokes && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-black/25 gap-1.5">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <span className="text-xs font-mono-stamp uppercase tracking-wider font-semibold">
                Draw your signature here
              </span>
            </div>
          )}

          {/* Canvas corner watermark line */}
          <div className="absolute bottom-3 right-3 text-[10px] font-mono-stamp text-black/30 pointer-events-none">
            Jazzbooth Studio
          </div>
        </div>

        {/* Toolbar (Colors & Sizes) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Colors */}
          <div className="flex items-center gap-2">
            {PEN_COLORS.map((c) => (
              <button
                key={c.hex}
                onClick={() => setPenColor(c.hex)}
                className={`w-7 h-7 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                  penColor === c.hex
                    ? 'ring-2 ring-offset-2 ring-black scale-110'
                    : 'hover:scale-105'
                }`}
                style={{
                  backgroundColor: c.hex,
                  border: c.hex === '#FFFFFF' ? '1px solid rgba(0,0,0,0.15)' : 'none',
                }}
                title={c.label}
              />
            ))}
          </div>

          {/* Stroke Widths */}
          <div className="flex items-center bg-white p-1 rounded-full shadow-xs gap-1">
            {PEN_SIZES.map((s) => (
              <button
                key={s.size}
                onClick={() => setPenSize(s.size)}
                className={`px-2.5 py-1 rounded-full text-xs font-mono-stamp font-semibold transition-all cursor-pointer ${
                  penSize === s.size
                    ? 'bg-[#1A1A1A] text-white'
                    : 'text-black/60 hover:text-black'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={history.length <= 1}
              className="w-10 h-10 rounded-full bg-white hover:bg-black hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-black flex items-center justify-center shadow-xs transition-colors cursor-pointer"
              title="Undo"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={handleClear}
              disabled={!hasStrokes}
              className="w-10 h-10 rounded-full bg-white hover:bg-red-500 hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-black flex items-center justify-center shadow-xs transition-colors cursor-pointer"
              title="Clear Canvas"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider font-mono-stamp text-black/60 hover:text-black cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleApply}
              disabled={!hasStrokes}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1A1A1A] hover:bg-black disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider font-mono-stamp shadow transition-all active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Apply to Strip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
