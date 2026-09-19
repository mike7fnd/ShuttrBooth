import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Analytics } from '@vercel/analytics/react';
import { PageView, PhotoFilter, PhotoStripData } from './types';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { BoothView } from './components/BoothView';
import { ResultView } from './components/ResultView';
import { GalleryView } from './components/GalleryView';
import { Toast } from './components/Toast';
import { getAllPhotoStrips, savePhotoStrip, deletePhotoStrip } from './utils/storage';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageView>('home');
  const [savedStrips, setSavedStrips] = useState<PhotoStripData[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active session state
  const [activeCapturedPhotos, setActiveCapturedPhotos] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<PhotoFilter>('normal');

  // Load initial saved strips
  useEffect(() => {
    getAllPhotoStrips().then((strips) => {
      setSavedStrips(strips);
    });
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  // When booth finishes 4-shot sequence
  const handlePhotosCaptured = (photos: string[], filter: PhotoFilter) => {
    setActiveCapturedPhotos(photos);
    setActiveFilter(filter);
    setCurrentPage('result');
  };

  // When result view produces a new strip or user edits it
  const handleSavedToGallery = async (strip: PhotoStripData) => {
    await savePhotoStrip(strip);
    const updated = await getAllPhotoStrips();
    setSavedStrips(updated);
  };

  const handleDeleteStrip = async (id: string) => {
    await deletePhotoStrip(id);
    const updated = await getAllPhotoStrips();
    setSavedStrips(updated);
  };

  const handleSelectStripFromHome = (strip: PhotoStripData) => {
    setActiveCapturedPhotos(strip.photos);
    setActiveFilter(strip.filter);
    setCurrentPage('result');
  };

  return (
    <div className="min-h-screen bg-[#EDEAE3] text-[#1A1A1A] flex flex-col relative overflow-x-hidden selection:bg-[#1A1A1A] selection:text-white">
      {/* Background ambient accents */}
      <div className="fixed -bottom-24 -left-24 w-96 h-96 bg-black/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed -top-24 -right-24 w-64 h-64 bg-black/[0.02] rounded-full blur-2xl pointer-events-none -z-10" />

      {/* Universal Header (Hidden in booth and result editing modes for pure focus) */}
      {currentPage !== 'booth' && currentPage !== 'result' && (
        <Header
          currentPage={currentPage}
          onNavigate={(page) => setCurrentPage(page)}
          savedCount={savedStrips.length}
        />
      )}

      {/* Main Content Pages */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{
              duration: 0.38,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="flex-1 flex flex-col w-full"
          >
            {currentPage === 'home' && (
              <HomeView
                onStartBooth={() => setCurrentPage('booth')}
                onOpenGallery={() => setCurrentPage('gallery')}
                recentStrips={savedStrips}
                onSelectStrip={handleSelectStripFromHome}
              />
            )}

            {currentPage === 'booth' && (
              <BoothView
                onExit={() => setCurrentPage('home')}
                onPhotosCaptured={handlePhotosCaptured}
              />
            )}

            {currentPage === 'result' && (
              <ResultView
                initialPhotos={activeCapturedPhotos}
                initialFilter={activeFilter}
                onRetake={() => setCurrentPage('booth')}
                onSavedToGallery={handleSavedToGallery}
                onOpenGallery={() => setCurrentPage('gallery')}
                onShowToast={showToast}
              />
            )}

            {currentPage === 'gallery' && (
              <GalleryView
                strips={savedStrips}
                onStartBooth={() => setCurrentPage('booth')}
                onDeleteStrip={handleDeleteStrip}
                onShowToast={showToast}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global Toast Notification */}
      <Toast
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />

      {/* Vercel Web Analytics */}
      <Analytics />
    </div>
  );
}
