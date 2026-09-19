import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, Trash2, Check, Sparkles } from 'lucide-react';

interface DirectSignaturePadProps {
  onSave: (dataUrl: string) => void;
  onClear: () => void;
  hasExistingSignature: boolean;
}

const PEN_COLORS = [
  { label: 'Black Ink', hex: '#1A1A1A' },
  { label: 'White Ink', hex: '#FFFFFF' },
  { label: 'Rose Red', hex: '#E11D48' },
  { label: 'Cobalt Blue', hex: '#2563EB' },
  { label: 'Golden Brown', hex: '#B45309' },
];

const PEN_SIZES = [
  { label: 'Fine', size: 3 },
  { label: 'Medium', size: 5 },
  { label: 'Thick', size: 8 },
];

export const DirectSignaturePad: React.FC<DirectSignaturePadProps> = ({
  onSave,
  onClear,
  hasExistingSignature,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState<string>('#1A1A1A');
  const [penSize, setPenSize] = useState<number>(5);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);

  // Setup canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);
    const blank = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory([blank]);
    setHasStrokes(false);
  }, []);

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

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.closePath();
    const state = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev, state]);

    // Automatically emit updated drawing
    const trimmedDataUrl = trimCanvas(canvas);
    if (trimmedDataUrl) {
      onSave(trimmedDataUrl);
    }
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
    const hasRemaining = newHistory.length > 1;
    setHasStrokes(hasRemaining);

    if (hasRemaining) {
      const trimmed = trimCanvas(canvas);
      if (trimmed) onSave(trimmed);
    } else {
      onClear();
    }
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
    onClear();
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-mono-stamp font-bold text-[#1A1A1A]">
          <PenTool className="w-3.5 h-3.5 text-black" />
          <span>Draw / Write Directly</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length <= 1}
            className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-[#1A1A1A] hover:text-white disabled:opacity-30 disabled:hover:bg-neutral-100 disabled:hover:text-black flex items-center justify-center transition-colors cursor-pointer"
            title="Undo stroke"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={!hasStrokes && !hasExistingSignature}
            className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-red-500 hover:text-white disabled:opacity-30 disabled:hover:bg-neutral-100 disabled:hover:text-black flex items-center justify-center transition-colors cursor-pointer"
            title="Clear drawing"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Direct Drawing Canvas Area */}
      <div className="relative w-full h-36 sm:h-40 rounded-xl overflow-hidden bg-neutral-50 shadow-inner border border-black/5 touch-none">
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
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-black/25 gap-1 select-none">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span className="text-[11px] font-mono-stamp uppercase tracking-wider font-semibold">
              Draw or sign with finger / mouse
            </span>
          </div>
        )}
      </div>

      {/* Ink color & line thickness */}
      <div className="flex items-center justify-between pt-1">
        {/* Colors */}
        <div className="flex items-center gap-1.5">
          {PEN_COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              onClick={() => setPenColor(c.hex)}
              className={`w-6 h-6 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                penColor === c.hex
                  ? 'ring-2 ring-offset-1 ring-black scale-110'
                  : 'hover:scale-105'
              }`}
              style={{
                backgroundColor: c.hex,
                border: c.hex === '#FFFFFF' ? '1px solid rgba(0,0,0,0.2)' : 'none',
              }}
              title={c.label}
            />
          ))}
        </div>

        {/* Thickness */}
        <div className="flex items-center bg-neutral-100 p-0.5 rounded-full gap-0.5">
          {PEN_SIZES.map((s) => (
            <button
              key={s.size}
              type="button"
              onClick={() => setPenSize(s.size)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono-stamp font-bold transition-all cursor-pointer ${
                penSize === s.size
                  ? 'bg-[#1A1A1A] text-white shadow-xs'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
