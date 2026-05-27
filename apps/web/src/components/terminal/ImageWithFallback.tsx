'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { ImageOff } from 'lucide-react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  onFallbackTriggered?: () => void;
}

export default function ImageWithFallback({
  src,
  alt,
  className,
  onFallbackTriggered
}: ImageWithFallbackProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    if (onFallbackTriggered) {
      onFallbackTriggered();
    }
  };

  // If the image has failed loading completely, render a graceful typography-only fallback
  if (hasError) {
    return null; // Return null to let the parent element collapse cleanly into a text-only card
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950/40 select-none">
      
      {/* 1. Sleek Skeleton Loading state */}
      {isLoading && (
        <motion.div 
          animate={{ opacity: [0.35, 0.75, 0.35] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-slate-900 flex items-center justify-center z-10"
        >
          <div className="flex flex-col items-center gap-1.5 font-mono text-[8px] uppercase tracking-wider text-slate-650 font-bold">
            <div className="w-6 h-6 rounded-lg border border-slate-800/40 border-t-sky-500/50 animate-spin" />
            <span>Loading Visual...</span>
          </div>
        </motion.div>
      )}

      {/* 2. Raw HTML Image Component */}
      <img
        src={src}
        alt={alt}
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={clsx(
          className,
          "transition-all duration-500",
          isLoading ? "opacity-0 scale-95" : "opacity-100 scale-100"
        )}
      />
      
      {/* Soft gradient shadow anchor */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent pointer-events-none" />
    </div>
  );
}
