import { useState, useEffect, useCallback } from 'react';
import { Maximize2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Slide from './Slide';

export default function PresentationViewer({ presentationId, onExit }) {
  const [presentation, setPresentation] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Fetch Manifest
    const fetchManifest = async () => {
      try {
        const res = await fetch(`/api/presentation/${presentationId}`);
        if (!res.ok) throw new Error('Failed to load presentation manifest');
        const data = await res.json();
        setPresentation(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchManifest();
  }, [presentationId]);

  const handleNext = useCallback(() => {
    if (presentation && currentSlideIndex < presentation.slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  }, [presentation, currentSlideIndex]);

  const handlePrev = useCallback(() => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  }, [currentSlideIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background text-foreground">
        Loading Presentation...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-background text-red-400">
        <p>Error: {error}</p>
        <button onClick={onExit} className="mt-4 px-4 py-2 bg-surface rounded hover:bg-surface-hover">Back</button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-black text-foreground overflow-hidden flex items-center justify-center group">
      
      {/* Slides Container */}
      <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
        {presentation.slides.map((slide, index) => {
          // Lazy loading logic: only load active, prev, and next
          const isActive = index === currentSlideIndex;
          const isPreload = Math.abs(index - currentSlideIndex) <= 1;
          
          return (
            <div 
              key={slide.id} 
              className={`absolute inset-0 transition-opacity duration-300 ${isActive ? 'z-10' : 'z-0 pointer-events-none'}`}
            >
              <Slide slide={slide} isActive={isActive} preload={isPreload} />
            </div>
          );
        })}
      </div>

      {/* Controls Overlay */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-surface/80 backdrop-blur-md px-6 py-3 rounded-full shadow-lg border border-border opacity-0 group-hover:opacity-100 transition-opacity z-50">
        <button 
          onClick={handlePrev}
          disabled={currentSlideIndex === 0}
          className="p-2 hover:bg-surface-hover rounded-full disabled:opacity-50 text-foreground transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <span className="font-mono text-sm min-w-[3rem] text-center">
          {currentSlideIndex + 1} / {presentation.slides.length}
        </span>

        <button 
          onClick={handleNext}
          disabled={currentSlideIndex === presentation.slides.length - 1}
          className="p-2 hover:bg-surface-hover rounded-full disabled:opacity-50 text-foreground transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        <div className="w-px h-6 bg-border mx-2"></div>

        <button 
          onClick={toggleFullscreen}
          className="p-2 hover:bg-surface-hover rounded-full text-foreground transition-colors"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
      </div>

      {/* Exit Button */}
      <button 
        onClick={onExit}
        className="absolute top-6 right-6 p-3 bg-surface/80 backdrop-blur-md hover:bg-surface-hover rounded-full text-foreground opacity-0 group-hover:opacity-100 transition-opacity z-50 border border-border shadow-lg"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
