'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  onFallbackTriggered?: () => void;
}

export default function ImageWithFallback({
  src,
  alt,
  className,
  fallbackLabel = 'TON',
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

  if (hasError) {
    return (
      <div className={clsx('tone-grid flex h-full w-full items-end overflow-hidden bg-editorial-muted p-4', className)}>
        <span className="serif-title text-5xl font-black leading-none text-editorial-accent">
          {fallbackLabel.slice(0, 16)}
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-editorial-muted select-none">
      
      {isLoading && (
        <motion.div 
          animate={{ opacity: [0.35, 0.75, 0.35] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-editorial-muted flex items-center justify-center z-10"
        >
          <div className="h-7 w-7 rounded-full border border-editorial-border border-t-editorial-accent" />
        </motion.div>
      )}

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
