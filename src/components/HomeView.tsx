import React, { useState, useEffect } from 'react';
import { Camera, Grid } from 'lucide-react';
import { motion } from 'motion/react';
import { PhotoStripData } from '../types';

interface HomeViewProps {
  onStartBooth: () => void;
  onOpenGallery: () => void;
  recentStrips: PhotoStripData[];
  onSelectStrip: (strip: PhotoStripData) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onStartBooth,
  onOpenGallery,
  recentStrips,
  onSelectStrip,
}) => {
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

      {/* Main Centered Content */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="my-auto flex flex-col items-center text-center space-y-8 max-w-2xl mx-auto z-10"
      >
        
        {/* Centered Typography with subtle ambient glow and hover depth */}
        <div className="relative group select-none">
          <div 
            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-[#1A1A1A] leading-[1.02] transition-transform duration-500 ease-out"
            style={{
              transform: `translate(${mouseOffset.x * 0.2}px, ${mouseOffset.y * 0.2}px)`
            }}
          >
            SHUTTRbOOTH
          </div>
        </div>

        {/* Centered Circular Action Buttons with Apple spring feel */}
        <div className="flex items-center justify-center gap-6 pt-1">
          {/* Circular Camera Shutter Button */}
          <motion.button
            id="home-start-booth-cta"
            onClick={onStartBooth}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#1A1A1A] hover:bg-black text-white flex items-center justify-center shadow-xl group hover:ring-8 hover:ring-black/10 hover:shadow-2xl cursor-pointer"
            title="Start Booth"
            aria-label="Start Booth"
          >
            {/* Shutter Pulse Ring */}
            <span className="absolute inset-0 rounded-full border-2 border-white/20 scale-90 group-hover:scale-100 transition-transform duration-300" />
            <Camera className="w-7 h-7 sm:w-8 sm:h-8 transition-transform duration-300 group-hover:scale-110" />
          </motion.button>

          {/* Circular Gallery Button */}
          <motion.button
            id="home-view-gallery-cta"
            onClick={onOpenGallery}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-black/20 bg-white/80 backdrop-blur-xs text-[#1A1A1A] flex items-center justify-center hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A] shadow-md hover:shadow-xl group cursor-pointer"
            title={`Gallery (${recentStrips.length})`}
            aria-label="View Gallery"
          >
            <Grid className="w-6 h-6 sm:w-7 sm:h-7 transition-transform duration-300 group-hover:scale-110" />
            {recentStrips.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#1A1A1A] text-white text-[11px] font-mono-stamp font-bold flex items-center justify-center border-2 border-[#F9F8F6] shadow-sm">
                {recentStrips.length}
              </span>
            )}
          </motion.button>
        </div>

      </motion.div>

      {/* Recent strips ribbon if any exist */}
      {recentStrips.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 pt-5 border-t border-black/10 z-10"
        >
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
              <motion.div
                key={strip.id}
                onClick={() => onSelectStrip(strip)}
                whileHover={{ y: -5, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 380, damping: 25 }}
                className="flex-shrink-0 w-24 sm:w-28 p-2 bg-white rounded-sm border border-black/10 shadow-sm hover:shadow-lg cursor-pointer"
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
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Minimal Footer */}
      <footer className="pt-6 pb-2 text-center text-[9px] text-[#1A1A1A]/30 font-mono-stamp uppercase tracking-widest z-10">
        SHUTTRbOOTH
      </footer>
    </div>
  );
};

