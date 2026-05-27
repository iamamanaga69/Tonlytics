'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

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
    <div className="relative w-full h-full overflow-hidden bg-editorial-muted select-none">
      
      {/* 1. Sleek Skeleton Loading state */}
      {isLoading && (
        <motion.div 
          animate={{ opacity: [0.35, 0.75, 0.35] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-editorial-muted flex items-center justify-center z-10"
        >
          <div className="flex flex-col items-center gap-2 text-xs text-editorial-text-subtle font-bold">
            <div className="w-6 h-6 rounded-full border border-editorial-border border-t-editorial-accent animate-spin" />
            <span>Loading image</span>
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
      
      <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-black/5 dark:ring-white/5" />
    </div>
  );
}
