import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function Slide({ slide, isActive, preload }) {
  const [isLoading, setIsLoading] = useState(true);

  // Auto-play / pause based on active state
  useEffect(() => {
    const videos = document.querySelectorAll(`video[data-slide-id="${slide.id}"]`);
    if (isActive) {
      videos.forEach(v => v.play().catch(e => console.log('Autoplay prevented:', e)));
    } else {
      videos.forEach(v => {
        v.pause();
        v.currentTime = 0; // reset when not active
      });
    }
  }, [isActive, slide.id]);

  // If this slide isn't active and we aren't supposed to preload it, don't render heavy media
  if (!isActive && !preload) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-transparent">
         <Loader2 className="animate-spin w-8 h-8 text-white/20" />
      </div>
    );
  }

  // Backwards compatibility for old manifest structures
  const isLegacyImage = slide.type === 'image';
  const imgUrl = slide.image || (isLegacyImage ? slide.url : null);
  const videoUrls = slide.videos || (slide.video ? [slide.video] : []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: isActive ? 1 : 0.4 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full absolute top-0 left-0 flex items-center justify-center bg-black"
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <Loader2 className="animate-spin w-10 h-10 text-white/30" />
        </div>
      )}

      {/* High-Fidelity Background Image */}
      {imgUrl && (
        <img
          src={imgUrl}
          alt={`Slide ${slide.id}`}
          className="w-full h-full object-contain absolute inset-0 z-0"
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
        />
      )}

      {/* Embedded Videos */}
      {videoUrls.map((url, i) => (
        <div key={i} className="w-full h-full absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <video
            data-slide-id={slide.id}
            src={url}
            className="w-full h-full object-contain pointer-events-auto"
            onCanPlay={() => setIsLoading(false)}
            controls
            playsInline
          />
        </div>
      ))}
    </motion.div>
  );
}
