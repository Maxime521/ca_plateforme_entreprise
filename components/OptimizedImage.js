// components/OptimizedImage.js - Optimized Image Component with Performance Features
import Image from 'next/image';
import { useState } from 'react';

// Optimized image component with lazy loading and performance optimizations
export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality = 85,
  placeholder = 'blur',
  loading = 'lazy',
  sizes,
  fill = false,
  ...props
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Generate blur data URL for placeholder
  const shimmer = (w, h) => `
    <svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <linearGradient id="g">
          <stop stop-color="#f6f7f8" offset="20%" />
          <stop stop-color="#edeef1" offset="50%" />
          <stop stop-color="#f6f7f8" offset="70%" />
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="#f6f7f8" />
      <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
      <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
    </svg>
  `;

  const toBase64 = (str) =>
    typeof window === 'undefined'
      ? Buffer.from(str).toString('base64')
      : window.btoa(str);

  const blurDataURL = `data:image/svg+xml;base64,${toBase64(shimmer(width || 700, height || 475))}`;

  // Error fallback component
  if (error) {
    return (
      <div 
        className={`bg-gray-200 dark:bg-gray-700 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="text-center text-gray-500 dark:text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm">Image unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        fill={fill}
        priority={priority}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        loading={loading}
        sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
        className={`transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={() => setIsLoading(false)}
        onError={() => setError(true)}
        {...props}
      />
      
      {/* Loading overlay */}
      {isLoading && !error && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
          <div className="text-gray-400 dark:text-gray-500">
            <svg className="w-8 h-8 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

// Avatar component with optimized loading
export function OptimizedAvatar({ 
  src, 
  alt, 
  size = 40, 
  className = '',
  fallbackText,
  ...props 
}) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div 
        className={`rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold ${className}`}
        style={{ width: size, height: size }}
      >
        {fallbackText ? fallbackText.charAt(0).toUpperCase() : '?'}
      </div>
    );
  }

  return (
    <div className={`relative rounded-full overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="object-cover"
        quality={90}
        priority={size > 80} // Prioritize larger avatars
        onError={() => setError(true)}
        {...props}
      />
    </div>
  );
}

// Logo component with optimized loading
export function OptimizedLogo({ 
  src, 
  alt = 'Logo', 
  width = 120, 
  height = 40, 
  className = '',
  ...props 
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={true} // Logo should load with priority
      quality={95} // Higher quality for logos
      placeholder="empty" // No blur for logos
      {...props}
    />
  );
}

// Icon component for small images
export function OptimizedIcon({ 
  src, 
  alt, 
  size = 24, 
  className = '',
  ...props 
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      quality={95}
      placeholder="empty"
      {...props}
    />
  );
}

// Gallery image with aspect ratio preservation
export function OptimizedGalleryImage({ 
  src, 
  alt, 
  aspectRatio = '16/9',
  className = '',
  ...props 
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div 
      className={`relative overflow-hidden bg-gray-200 dark:bg-gray-700 ${className}`}
      style={{ aspectRatio }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className={`object-cover transition-all duration-300 ${
          loaded ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
        }`}
        quality={85}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        onLoad={() => setLoaded(true)}
        {...props}
      />
      
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
}