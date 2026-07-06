import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function Slide({ slide, isActive, preload }) {
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef(null);

  // Auto-play / pause based on active state
  useEffect(() => {
    if (slide.video && videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(e => console.log('Autoplay prevented:', e));
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0; // reset when not active
      }
    }
  }, [isActive, slide.video]);

  // If this slide isn't active and we aren't supposed to preload it, don't render heavy media
  if (!isActive && !preload) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-surface">
         <Loader2 className="animate-spin w-8 h-8 text-border" />
      </div>
    );
  }

  // Backwards compatibility for mock data
  const isLegacyImage = slide.type === 'image';
  const isLegacyVideo = slide.type === 'video';
  const imgUrl = slide.image || (isLegacyImage ? slide.url : null);
  const videoUrl = slide.video || (isLegacyVideo ? slide.url : null);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: isActive ? 1 : 0.4 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full absolute top-0 left-0 flex items-center justify-center bg-background"
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <Loader2 className="animate-spin w-10 h-10 text-primary" />
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

      {/* Embedded Video Overlay */}
      {videoUrl && (
        <div className="w-full h-full absolute inset-0 flex items-center justify-center z-10">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            onCanPlay={() => setIsLoading(false)}
            controls
            playsInline
          />
        </div>
      )}
    </motion.div>
  );
}
