import React, { useState } from 'react';
import { PhotoStripData } from '../types';
import { 
  Camera, 
  Trash2, 
  Download, 
  Share2, 
  Printer, 
  X, 
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { FRAMES_CONFIG, renderPhotoStrip } from '../utils/canvasRenderer';

interface GalleryViewProps {
  strips: PhotoStripData[];
  onStartBooth: () => void;
  onDeleteStrip: (id: string) => void;
  onShowToast: (message: string) => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({
  strips,
  onStartBooth,
  onDeleteStrip,
  onShowToast,
}) => {
  const [selectedStrip, setSelectedStrip] = useState<PhotoStripData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm('Delete this photostrip?')) {
      onDeleteStrip(id);
      if (selectedStrip?.id === id) {
        setSelectedStrip(null);
      }
      onShowToast('Photostrip deleted.');
    }
  };

  const handleDownload = async (strip: PhotoStripData) => {
    try {
      setIsProcessing(true);
      const dataUrl = await renderPhotoStrip({
        photos: strip.photos,
        filter: strip.filter,
        frameStyle: strip.frameStyle,
        layout: strip.layout,
        caption: strip.caption,
        showDate: strip.showDate,
        showLogo: strip.showLogo,
        dateString: new Date(strip.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }).toUpperCase(),
      });

      const link = document.createElement('a');
      link.download = `photobooth-${new Date(strip.createdAt).toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onShowToast('Photo strip downloaded!');
    } catch {
      onShowToast('Failed to generate download');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShare = async (strip: PhotoStripData) => {
    try {
      setIsProcessing(true);
      const dataUrl = await renderPhotoStrip({
        photos: strip.photos,
        filter: strip.filter,
        frameStyle: strip.frameStyle,
        layout: strip.layout,
        caption: strip.caption,
        showDate: strip.showDate,
        showLogo: strip.showLogo,
      });

      const res = await fetch(dataUrl);
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
          new ClipboardItem({ 'image/png': blob }),
        ]);
        onShowToast('Copied to clipboard!');
      } else {
        handleDownload(strip);
      }
    } catch {
      handleDownload(strip);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-5rem)] max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/10 pb-5 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1A1A]">
            Saved Photostrips
          </h1>
        </div>

        <button
          id="gallery-new-strip-cta"
          onClick={onStartBooth}
          className="inline-flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-black text-white text-xs font-semibold uppercase tracking-widest py-3 px-5 rounded active:scale-95 transition-all shadow-sm self-start sm:self-auto"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>New Strip</span>
        </button>
      </div>

      {/* Grid of Photostrips */}
      {strips.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
          <div className="w-14 h-14 rounded-full bg-black/5 flex items-center justify-center text-black/40">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1A1A1A]">No photostrips yet</h3>
          </div>
          <button
            id="gallery-empty-start-btn"
            onClick={onStartBooth}
            className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white text-[10px] font-medium uppercase tracking-widest py-3 px-6 rounded hover:bg-black transition-all active:scale-95 shadow-sm"
          >
            <span>Start First Strip</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {strips.map((strip) => {
            const frameCfg = FRAMES_CONFIG[strip.frameStyle] || FRAMES_CONFIG['classic-white'];
            const formattedDate = new Date(strip.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div
                key={strip.id}
                id={`gallery-card-${strip.id}`}
                onClick={() => setSelectedStrip(strip)}
                className="group relative cursor-pointer flex flex-col p-2.5 sm:p-3 rounded-sm shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                style={{ backgroundColor: frameCfg.bg }}
              >
                {/* 4 Photos Mini Preview */}
                <div className="space-y-1.5 flex-1">
                  {strip.photos.slice(0, 4).map((p, idx) => (
                    <div 
                      key={idx} 
                      className="w-full aspect-[4/3] bg-neutral-200 rounded-[1px] overflow-hidden"
                    >
                      <img
                        src={p}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ))}
                </div>

                {/* Footer Stamp */}
                <div className="pt-3 pb-1 text-center">
                  <div 
                    className="font-bold text-[9px] sm:text-[10px] tracking-widest truncate uppercase"
                    style={{ color: frameCfg.text }}
                  >
                    {strip.caption || 'PHOTObOOTH'}
                  </div>
                  <div 
                    className="font-mono-stamp text-[7px] sm:text-[8px] tracking-wider uppercase opacity-50 mt-0.5"
                    style={{ color: frameCfg.text }}
                  >
                    {formattedDate}
                  </div>
                </div>

                {/* Hover Delete Action */}
                <button
                  onClick={(e) => handleDelete(strip.id, e)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-all active:scale-90 shadow-md"
                  title="Delete strip"
                  aria-label="Delete photostrip"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal when a photo strip is selected */}
      {selectedStrip && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative bg-[#F9F8F6] rounded-sm max-w-lg w-full p-6 shadow-2xl border border-black/10 my-8">
            
            {/* Close Button */}
            <button
              onClick={() => setSelectedStrip(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 text-black/70 hover:text-black transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-bold tracking-tight text-[#1A1A1A] mb-4">
              Photostrip Details
            </h3>

            {/* Strip Preview Container */}
            <div className="flex justify-center py-2">
              <div 
                className="w-[220px] sm:w-[240px] p-3 rounded-sm shadow-xl border border-black/10 flex flex-col gap-2"
                style={{ backgroundColor: FRAMES_CONFIG[selectedStrip.frameStyle]?.bg || '#fff' }}
              >
                {selectedStrip.photos.map((p, i) => (
                  <div key={i} className="w-full aspect-[4/3] bg-neutral-100 rounded-[1px] overflow-hidden border border-black/5">
                    <img src={p} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                ))}
                
                <div className="pt-2 text-center">
                  <div 
                    className="font-bold text-[10px] tracking-widest uppercase"
                    style={{ color: FRAMES_CONFIG[selectedStrip.frameStyle]?.text || '#1A1A1A' }}
                  >
                    {selectedStrip.caption || 'PHOTObOOTH'}
                  </div>
                  <div 
                    className="font-mono-stamp text-[8px] uppercase opacity-50 mt-0.5"
                    style={{ color: FRAMES_CONFIG[selectedStrip.frameStyle]?.text || '#1A1A1A' }}
                  >
                    {new Date(selectedStrip.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-2.5 pt-4 border-t border-black/10">
              <button
                onClick={() => handleDelete(selectedStrip.id)}
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-red-600 hover:text-red-700 py-2 px-3 rounded hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(selectedStrip)}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 border border-black/20 hover:border-black text-[#1A1A1A] text-[10px] font-medium uppercase tracking-wider py-2 px-3 rounded transition-colors disabled:opacity-50"
                  title="Download full-resolution PNG"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </button>

                <button
                  onClick={() => handleShare(selectedStrip)}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 border border-black/20 hover:border-black text-[#1A1A1A] text-[10px] font-medium uppercase tracking-wider py-2 px-3 rounded transition-colors disabled:opacity-50"
                  title="Share or copy strip"
                >
                  <Share2 className="w-3 h-3" />
                  <span>Share</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 border border-black/20 hover:border-black text-[#1A1A1A] text-[10px] font-medium uppercase tracking-wider py-2 px-3 rounded transition-colors"
                >
                  <Printer className="w-3 h-3" />
                  <span>Print</span>
                </button>

                <button
                  onClick={() => setSelectedStrip(null)}
                  className="bg-[#1A1A1A] hover:bg-black text-white text-[10px] font-medium uppercase tracking-wider py-2 px-4 rounded transition-all"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
