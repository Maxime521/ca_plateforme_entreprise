// components/CopyButton.js - Modern copy button component
import { useState } from 'react';

export default function CopyButton({ 
  text, 
  size = 'sm', 
  variant = 'subtle', 
  className = '',
  showTooltip = true 
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4', 
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const variantClasses = {
    subtle: 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300',
    primary: 'text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300',
    white: 'text-white/70 hover:text-white',
    accent: 'text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300'
  };

  return (
    <div className="relative inline-flex">
      <button
        onClick={handleCopy}
        className={`
          inline-flex items-center justify-center 
          transition-all duration-200 ease-in-out
          hover:scale-110 active:scale-95
          focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-1
          rounded-md p-1
          ${variantClasses[variant]}
          ${className}
        `}
        title={copied ? 'Copié !' : `Copier ${text}`}
        aria-label={copied ? 'Copié dans le presse-papiers' : `Copier ${text}`}
      >
        {copied ? (
          // Check icon
          <svg 
            className={`${sizeClasses[size]} transition-all duration-200`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 13l4 4L19 7" 
            />
          </svg>
        ) : (
          // Copy icon
          <svg 
            className={`${sizeClasses[size]} transition-all duration-200`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" 
            />
          </svg>
        )}
      </button>
      
      {/* Tooltip */}
      {showTooltip && (
        <div 
          className={`
            absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
            px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700
            rounded-md shadow-lg pointer-events-none z-50
            transition-all duration-200 ease-in-out
            ${copied ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 invisible'}
          `}
        >
          {copied ? 'Copié !' : 'Copier'}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
        </div>
      )}
    </div>
  );
}

// Specific component for SIREN/SIRET numbers with enhanced styling
export function NumberCopyButton({ number, type = 'SIREN', className = '' }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="font-mono text-sm">{number}</span>
      <CopyButton 
        text={number}
        size="sm"
        variant="subtle"
        className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${className}`}
      />
    </div>
  );
}

// Component for inline number display with immediate copy button
export function InlineNumberWithCopy({ 
  number, 
  label, 
  variant = 'default',
  className = '' 
}) {
  const variants = {
    default: 'text-gray-900 dark:text-white',
    gradient: 'text-white',
    muted: 'text-gray-600 dark:text-gray-400'
  };

  return (
    <div className={`inline-flex items-center gap-1.5 group ${className}`}>
      <span className={`font-mono ${variants[variant]}`}>{number}</span>
      <CopyButton 
        text={number}
        size="xs"
        variant={variant === 'gradient' ? 'white' : variant === 'muted' ? 'subtle' : 'primary'}
        showTooltip={false}
        className="opacity-60 hover:opacity-100 transition-opacity duration-200"
      />
    </div>
  );
}