import { useState, useEffect, useCallback } from 'react';
import { Maximize2, ChevronLeft, ChevronRight, X, LayoutGrid, Layout } from 'lucide-react';
import Slide from './Slide';

export default function PresentationViewer({ presentationId, onExit }) {
  const [presentation, setPresentation] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

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

  // Auto-hide controls and cursor after 3 seconds of inactivity
  useEffect(() => {
    let timeout;
    const handleMouseMove = () => {
      setControlsVisible(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setControlsVisible(false), 3000);
    };
    window.addEventListener('mousemove', handleMouseMove);
    // Initial timeout
    timeout = setTimeout(() => setControlsVisible(false), 3000);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, []);

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
      <div className="w-full h-screen flex flex-col items-center justify-center bg-background text-foreground">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(0,240,255,0.5)]" />
        <p className="text-gray-400 font-heading">Initializing Engine...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-background text-red-400">
        <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/30 text-center">
          <p className="font-bold mb-2">Failed to Load</p>
          <p className="text-sm">{error}</p>
        </div>
        <button onClick={onExit} className="mt-6 px-6 py-2 bg-surface rounded-xl hover:bg-surface-hover border border-border transition-colors">Return to Dashboard</button>
      </div>
    );
  }

  const progress = ((currentSlideIndex + 1) / presentation.slides.length) * 100;

  return (
    <div 
      className={`relative w-full h-screen bg-black text-foreground overflow-hidden flex ${controlsVisible ? '' : 'cursor-none'}`}
    >
      {/* Top Progress Bar */}
      <div className={`absolute top-0 left-0 w-full h-1 bg-white/5 z-50 transition-opacity duration-500 ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="h-full bg-primary glow-border transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
      </div>

      {/* Thumbnail Sidebar (Collapsible) */}
      <div 
        className={`absolute top-0 left-0 h-full bg-surface/90 backdrop-blur-xl border-r border-border z-40 transition-transform duration-500 ease-in-out flex flex-col overflow-y-auto hide-scrollbar w-64 ${showSidebar ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}
      >
        <div className="p-4 sticky top-0 bg-surface/90 backdrop-blur-xl border-b border-border flex items-center justify-between z-10">
          <h3 className="font-heading font-bold text-white text-sm uppercase tracking-wider glow-text">Slides</h3>
          <button onClick={() => setShowSidebar(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 flex flex-col gap-3">
          {presentation.slides.map((slide, idx) => (
            <div 
              key={slide.id} 
              onClick={() => setCurrentSlideIndex(idx)}
              className={`relative aspect-[16/9] rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${currentSlideIndex === idx ? 'border-primary glow-border scale-[1.02]' : 'border-transparent hover:border-white/20'}`}
            >
              <img src={slide.image} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" />
              <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur px-1.5 rounded text-[10px] font-mono text-white">
                {idx + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Slides Container */}
      <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-[#030108]">
        {presentation.slides.map((slide, index) => {
          const isActive = index === currentSlideIndex;
          const isPreload = Math.abs(index - currentSlideIndex) <= 1;
          
          return (
            <div 
              key={slide.id} 
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
            >
              <Slide slide={slide} isActive={isActive} preload={isPreload} />
            </div>
          );
        })}
      </div>

      {/* Controls Overlay */}
      <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-surface/70 backdrop-blur-xl px-6 py-3 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/10 transition-all duration-500 z-50 ${controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        
        <button 
          onClick={() => setShowSidebar(!showSidebar)}
          className={`p-2 rounded-full transition-colors ${showSidebar ? 'bg-primary/20 text-primary' : 'hover:bg-white/10 text-gray-300 hover:text-white'}`}
          title="Toggle Thumbnails"
        >
          <LayoutGrid className="w-5 h-5" />
        </button>

        <div className="w-px h-6 bg-white/10 mx-2"></div>

        <button 
          onClick={handlePrev}
          disabled={currentSlideIndex === 0}
          className="p-2 hover:bg-white/10 rounded-full disabled:opacity-30 text-white transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <span className="font-mono text-sm min-w-[4rem] text-center text-white glow-text">
          {currentSlideIndex + 1} / {presentation.slides.length}
        </span>

        <button 
          onClick={handleNext}
          disabled={currentSlideIndex === presentation.slides.length - 1}
          className="p-2 hover:bg-white/10 rounded-full disabled:opacity-30 text-white transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        <div className="w-px h-6 bg-white/10 mx-2"></div>

        <button 
          onClick={toggleFullscreen}
          className="p-2 hover:bg-white/10 rounded-full text-gray-300 hover:text-white transition-colors"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
      </div>

      {/* Exit Button */}
      <button 
        onClick={onExit}
        className={`absolute top-6 right-6 p-3 bg-surface/70 backdrop-blur-xl hover:bg-red-500/20 hover:text-red-400 rounded-full text-gray-300 transition-all duration-500 z-50 border border-white/10 shadow-lg ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
