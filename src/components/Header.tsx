import React from 'react';
import { PageView } from '../types';
import { Camera, Grid, ArrowLeft } from 'lucide-react';

interface HeaderProps {
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  savedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onNavigate,
  savedCount,
}) => {
  const isBooth = currentPage === 'booth';
  const isHome = currentPage === 'home';

  // In booth and home modes, keep top header hidden so the focused views are uncluttered
  if (isBooth || isHome) {
    return null;
  }

  return (
    <header className="w-full border-b border-black/10 bg-[#F9F8F6]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 h-18 sm:h-20 flex items-center justify-between">
        {/* Left: Brand or Back */}
        <div className="flex items-center gap-3">
          <button
            id="header-back-btn"
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[#1A1A1A]/70 hover:text-[#1A1A1A] transition-colors py-2 px-3 rounded border border-black/10 hover:border-black/30 hover:bg-black/5"
            title="Back to Home"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        </div>

        {/* Right Controls: Gallery & Start */}
        <div className="flex items-center gap-3">
          {currentPage !== 'gallery' && (
            <button
              id="header-gallery-btn"
              onClick={() => onNavigate('gallery')}
              className="inline-flex items-center gap-2 border border-black/15 text-[#1A1A1A] text-[10px] font-semibold uppercase tracking-widest py-2.5 px-3.5 rounded hover:bg-black hover:text-white transition-colors"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Gallery</span>
              {savedCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 text-[9px] font-mono-stamp bg-black text-white rounded group-hover:bg-white group-hover:text-black leading-none">
                  {savedCount}
                </span>
              )}
            </button>
          )}

          {currentPage !== 'booth' && (
            <button
              id="header-start-btn"
              onClick={() => onNavigate('booth')}
              className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-black text-white text-[10px] font-semibold uppercase tracking-widest py-2.5 px-4 rounded transition-all active:scale-95 shadow-sm"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Start Booth</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
