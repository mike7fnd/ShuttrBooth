import React, { useState, useEffect } from 'react';
import { Camera, Grid, Sparkles } from 'lucide-react';
import { PhotoStripData } from '../types';

interface HomeViewProps {
  onStartBooth: () => void;
  onOpenGallery: () => void;
  recentStrips: PhotoStripData[];
  onSelectStrip: (strip: PhotoStripData) => void;
}

// Curated atmospheric vintage photobooth samples
const FLOATING_PREVIEWS = [
  {
    id: 1,
    rotation: '-rotate-6 hover:-rotate-2',
    style: { top: '8%', left: '4%' },
    delay: '0s',
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
    ],
    caption: 'PORTRAITS',
  },
  {
    id: 2,
    rotation: 'rotate-6 hover:rotate-2',
    style: { top: '12%', right: '5%' },
    delay: '1.2s',
    photos: [
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
    ],
    caption: 'MEMORIES',
  },
  {
    id: 3,
    rotation: 'rotate-3 hover:-rotate-1',
    style: { bottom: '10%', left: '8%' },
    delay: '2.4s',
    photos: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&auto=format&fit=crop&q=80',
    ],
    caption: 'FILM NOIR',
  },
  {
    id: 4,
    rotation: '-rotate-4 hover:rotate-1',
    style: { bottom: '8%', right: '7%' },
    delay: '1.8s',
    photos: [
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    ],
    caption: 'STUDIO 35',
  }
];

const MAIN_STRIP_PHOTOS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80',
];

export const HomeView: React.FC<HomeViewProps> = ({
  onStartBooth,
  onOpenGallery,
  recentStrips,
  onSelectStrip,
}) => {
  const [hoveredStrip, setHoveredStrip] = useState<number | null>(null);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  // Subtle interactive parallax effect based on cursor movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 16;
      const y = (e.clientY / innerHeight - 0.5) * 16;
      setMouseOffset({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="relative w-full min-h-[calc(100vh-5rem)] flex flex-col justify-between max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 overflow-hidden">
      
      {/* Background Animated Bokeh & Film Light Leaks */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-black/[0.025] rounded-full blur-3xl pointer-events-none transition-transform duration-700 ease-out"
        style={{
          transform: `translate(calc(-50% + ${mouseOffset.x * 0.8}px), calc(-50% + ${mouseOffset.y * 0.8}px))`
        }}
      />

      {/* Dynamic Floating Photo Strips in Background (Responsive - visible on md/lg screens) */}
      <div className="hidden lg:block pointer-events-auto">
        {FLOATING_PREVIEWS.map((strip, idx) => (
          <div
            key={strip.id}
            onClick={onStartBooth}
            onMouseEnter={() => setHoveredStrip(strip.id)}
            onMouseLeave={() => setHoveredStrip(null)}
            className={`absolute w-36 bg-white p-2.5 shadow-lg hover:shadow-2xl rounded-sm transition-all duration-500 cursor-pointer ${strip.rotation} z-0 hover:z-20 hover:scale-105`}
            style={{
              ...strip.style,
              transform: `translate(${mouseOffset.x * (idx % 2 === 0 ? 0.6 : -0.6)}px, ${mouseOffset.y * (idx < 2 ? 0.6 : -0.6)}px)`,
              animation: `float-gentle 6s ease-in-out infinite alternate`,
              animationDelay: strip.delay,
            }}
          >
            <div className="flex flex-col gap-1.5">
              {strip.photos.map((imgUrl, i) => (
                <div key={i} className="w-full aspect-[4/3] bg-neutral-100 overflow-hidden">
                  <img
                    src={imgUrl}
                    alt=""
                    className="w-full h-full object-cover grayscale contrast-105 transition-transform duration-500 hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 text-center">
              <span className="text-[7px] font-mono-stamp tracking-widest text-black/50 uppercase">
                {strip.caption}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Centered Content */}
      <div className="my-auto flex flex-col items-center text-center space-y-8 max-w-2xl mx-auto z-10">
        
        {/* Centered Typography with subtle ambient glow and hover depth */}
        <div className="relative group select-none">
          <div 
            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-[#1A1A1A] leading-[1.02] transition-transform duration-300 group-hover:scale-[1.01]"
            style={{
              transform: `translate(${mouseOffset.x * 0.2}px, ${mouseOffset.y * 0.2}px)`
            }}
          >
            PHOTObOOTH
          </div>
        </div>

        {/* Centered Circular Action Buttons */}
        <div className="flex items-center justify-center gap-6 pt-1">
          {/* Circular Camera Shutter Button */}
          <button
            id="home-start-booth-cta"
            onClick={onStartBooth}
            className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#1A1A1A] hover:bg-black text-white flex items-center justify-center transition-all duration-300 active:scale-95 shadow-xl group hover:ring-8 hover:ring-black/10 hover:shadow-2xl cursor-pointer"
            title="Start Booth"
            aria-label="Start Booth"
          >
            {/* Shutter Pulse Ring */}
            <span className="absolute inset-0 rounded-full border-2 border-white/20 scale-90 group-hover:scale-100 transition-transform duration-300" />
            <Camera className="w-7 h-7 sm:w-8 sm:h-8 transition-transform duration-300 group-hover:scale-110" />
          </button>

          {/* Circular Gallery Button */}
          <button
            id="home-view-gallery-cta"
            onClick={onOpenGallery}
            className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-black/20 bg-white/80 backdrop-blur-xs text-[#1A1A1A] flex items-center justify-center hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A] transition-all duration-300 active:scale-95 shadow-md hover:shadow-xl group cursor-pointer"
            title={`Gallery (${recentStrips.length})`}
            aria-label="View Gallery"
          >
            <Grid className="w-6 h-6 sm:w-7 sm:h-7 transition-transform duration-300 group-hover:scale-110" />
            {recentStrips.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#1A1A1A] text-white text-[11px] font-mono-stamp font-bold flex items-center justify-center border-2 border-[#F9F8F6] shadow-sm">
                {recentStrips.length}
              </span>
            )}
          </button>
        </div>

        {/* Centered Interactive Photo Strip Preview Card */}
        <div className="pt-4 sm:pt-6">
          <div 
            id="preview-photo-strip"
            className="relative w-[210px] sm:w-[240px] bg-white p-3 sm:p-3.5 shadow-2xl rounded-sm transition-all duration-500 hover:-translate-y-2 cursor-pointer mx-auto group hover:rotate-1"
            onClick={onStartBooth}
            title="Click to start booth"
            style={{
              transform: `translate(${mouseOffset.x * 0.3}px, ${mouseOffset.y * 0.3}px)`
            }}
          >
            {/* Gloss film sheen effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-sm" />

            {/* 4 Photos Vertical Strip */}
            <div className="flex flex-col gap-2">
              {MAIN_STRIP_PHOTOS.map((src, idx) => (
                <div 
                  key={idx} 
                  className="relative w-full aspect-[4/3] bg-gray-100 overflow-hidden"
                >
                  <img
                    src={src}
                    alt={`Sample ${idx + 1}`}
                    className="w-full h-full object-cover grayscale contrast-110 transition-all duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-1 right-1.5 font-mono-stamp text-[8px] text-white/90 drop-shadow-sm font-bold">
                    0{idx + 1}
                  </div>
                </div>
              ))}
            </div>

            {/* Photo Strip Footer */}
            <div className="pt-3.5 pb-1 text-center flex flex-col items-center gap-0.5 opacity-75">
              <div className="text-[9px] uppercase tracking-[0.25em] font-black text-[#1A1A1A]">
                PHOTObOOTH
              </div>
              <div className="text-[7px] uppercase tracking-[0.15em] font-mono-stamp text-[#1A1A1A]/70">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Recent strips ribbon if any exist */}
      {recentStrips.length > 0 && (
        <div className="mt-10 pt-5 border-t border-black/10 z-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-mono-stamp uppercase tracking-widest text-[#1A1A1A]/60 font-bold">
              Recent Photostrips ({recentStrips.length})
            </h3>
            <button
              onClick={onOpenGallery}
              className="text-[10px] uppercase tracking-widest font-semibold text-[#1A1A1A] hover:underline underline-offset-4"
            >
              See all
            </button>
          </div>

          <div className="flex items-center gap-3.5 overflow-x-auto pb-3 pt-1 no-scrollbar">
            {recentStrips.slice(0, 5).map((strip) => (
              <div
                key={strip.id}
                onClick={() => onSelectStrip(strip)}
                className="flex-shrink-0 w-24 sm:w-28 p-2 bg-white rounded-sm border border-black/10 shadow-sm hover:shadow-lg transition-all cursor-pointer hover:-translate-y-1.5"
                title="Click to view full strip"
              >
                <div className="space-y-1">
                  {strip.photos.slice(0, 4).map((p, i) => (
                    <div key={i} className="w-full aspect-[4/3] bg-gray-50 overflow-hidden border border-black/5">
                      <img src={p} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 text-center">
                  <div className="text-[8px] font-mono-stamp text-[#1A1A1A]/60 uppercase tracking-wider truncate">
                    {new Date(strip.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Minimal Footer */}
      <footer className="pt-6 pb-2 text-center text-[9px] text-[#1A1A1A]/30 font-mono-stamp uppercase tracking-widest z-10">
        PHOTObOOTH
      </footer>
    </div>
  );
};

