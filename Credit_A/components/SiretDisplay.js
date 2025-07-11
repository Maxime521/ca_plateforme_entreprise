// components/SiretDisplay.js - Smart SIRET display with source indicators and copy functionality
import { useState } from 'react';
import { InlineNumberWithCopy } from './CopyButton';

export default function SiretDisplay({ 
  siret, 
  siretSource, 
  siretLabel, 
  variant = 'default',
  showTooltip = true,
  className = '' 
}) {
  const [showInfo, setShowInfo] = useState(false);

  if (!siret) {
    return (
      <span className={`text-gray-500 dark:text-gray-400 ${className}`}>
        N/A
      </span>
    );
  }

  const getSourceIcon = () => {
    switch (siretSource) {
      case 'siege_social':
        return '🏛️';
      case 'first_establishment':
        return '🏪';
      default:
        return '📄';
    }
  };

  const getSourceBadge = () => {
    const baseClasses = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ml-2";
    
    switch (siretSource) {
      case 'siege_social':
        return (
          <span className={`${baseClasses} bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300 border border-primary-200 dark:border-primary-700`}>
            <span className="mr-1">🏛️</span>
            Siège social
          </span>
        );
      case 'first_establishment':
        return (
          <span className={`${baseClasses} bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-200 dark:border-orange-700`}>
            <span className="mr-1">🏪</span>
            Premier établissement
          </span>
        );
      default:
        return null;
    }
  };

  const getTooltipContent = () => {
    switch (siretSource) {
      case 'siege_social':
        return "SIRET du siège social principal de l'entreprise";
      case 'first_establishment':
        return "SIRET du premier établissement trouvé (siège social non identifié)";
      default:
        return "Numéro SIRET de l'établissement";
    }
  };

  const SiretNumber = ({ variant: numberVariant = 'default' }) => (
    <InlineNumberWithCopy 
      number={siret}
      label="SIRET"
      variant={numberVariant}
      className={className}
    />
  );

  const InfoIcon = () => (
    <button
      onMouseEnter={() => setShowInfo(true)}
      onMouseLeave={() => setShowInfo(false)}
      className="ml-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
      title={getTooltipContent()}
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </button>
  );

  // Different variants for different UI contexts
  switch (variant) {
    case 'compact':
      return (
        <div className="inline-flex items-center">
          <SiretNumber variant="default" />
          {siretSource && (
            <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
              {getSourceIcon()}
            </span>
          )}
          {showTooltip && <InfoIcon />}
        </div>
      );

    case 'with-badge':
      return (
        <div className="inline-flex items-center flex-wrap">
          <SiretNumber variant="default" />
          {siretSource && getSourceBadge()}
          {showTooltip && <InfoIcon />}
        </div>
      );

    case 'detailed':
      return (
        <div className="space-y-2">
          <div className="flex items-center">
            <SiretNumber variant="default" />
            {showTooltip && <InfoIcon />}
          </div>
          {siretSource && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <span className="mr-2">{getSourceIcon()}</span>
              <span>{siretLabel || 'Source non spécifiée'}</span>
            </div>
          )}
        </div>
      );

    case 'clean': // For informations générales - CLEAN VERSION WITHOUT ICONS
      return (
        <div className="flex items-center">
          <SiretNumber variant="default" />
          {showTooltip && <InfoIcon />}
        </div>
      );

    case 'clean-with-source': // For informations générales - CLEAN VERSION WITH TEXT SOURCE
      return (
        <div className="space-y-1">
          <div className="flex items-center">
            <SiretNumber variant="default" />
            {showTooltip && <InfoIcon />}
          </div>
          {siretSource && siretLabel && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {siretLabel}
            </div>
          )}
        </div>
      );

    case 'gradient': // For the aperçu rapide gradient card - CLEAN VERSION WITHOUT ICONS
      return (
        <div className="flex items-center justify-end w-full">
          <SiretNumber variant="gradient" />
        </div>
      );

    default:
      return (
        <div className="inline-flex items-center">
          <SiretNumber variant="default" />
          {siretSource && (
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
              <span className="mr-1">{getSourceIcon()}</span>
              {siretLabel}
            </span>
          )}
          {showTooltip && <InfoIcon />}
        </div>
      );
  }
}

// Helper component for form inputs and displays
export function SiretLabel({ siretSource, showIcon = false, className = "" }) {
  const getIcon = () => {
    switch (siretSource) {
      case 'siege_social':
        return '🏛️';
      case 'first_establishment':
        return '🏪';
      default:
        return '';
    }
  };

  return (
    <span className={`flex items-center ${className}`}>
      <span>SIRET</span>
      {showIcon && siretSource && (
        <span className="ml-1 text-xs">
          {getIcon()}
        </span>
      )}
    </span>
  );
}