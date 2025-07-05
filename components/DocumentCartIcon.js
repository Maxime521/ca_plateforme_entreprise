// components/DocumentCartIcon.js - Amazon-Style Shopping Cart with Floating Variant
//==============================================================================

import { useDocumentCart } from '../hooks/useDocumentCart';

export default function DocumentCartIcon({ floating = false, customClass = '' }) {
  const { cartCount, toggleCart, isOpen } = useDocumentCart();

  const baseClasses = `relative p-3 rounded-xl transition-all duration-200 hover:scale-105 group ${
    isOpen 
      ? 'bg-primary-600 text-white shadow-lg' 
      : 'bg-white dark:bg-dark-surface text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card border border-gray-200 dark:border-dark-border hover:border-primary-300 dark:hover:border-primary-600'
  }`;

  const floatingClasses = floating 
    ? 'shadow-2xl hover:shadow-3xl backdrop-blur-xl bg-white/90 dark:bg-dark-surface/90 border border-gray-200/50 dark:border-dark-border/50'
    : '';

  return (
    <div className="relative">
      <button
        onClick={toggleCart}
        className={`${baseClasses} ${floatingClasses} ${customClass}`}
        title="Panier de documents"
      >
        {/* Amazon-style shopping cart SVG */}
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          {/* Cart body */}
          <path d="M7 4V2C7 1.45 6.55 1 6 1S5 1.45 5 2v2H1C0.45 4 0 4.45 0 5s0.45 1 1 1h1.05l1.54 9.25C3.82 16.22 4.74 17 5.81 17h8.38c1.07 0 1.99-0.78 2.22-1.75L18.95 6H20c0.55 0 1-0.45 1-1s-0.45-1-1-1H7zM16.5 15H6.5l-1.2-9h12.4l-1.2 9z"/>
          {/* Cart wheels */}
          <circle cx="9" cy="20" r="1"/>
          <circle cx="15" cy="20" r="1"/>
        </svg>
        
        {/* Enhanced notification badge */}
        {cartCount > 0 && (
          <div className="absolute -top-2 -right-2 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 animate-pulse shadow-lg border-2 border-white dark:border-dark-surface">
            {cartCount > 99 ? '99+' : cartCount}
          </div>
        )}
        
        {/* Hover effect indicator */}
        <div className="absolute inset-0 rounded-xl bg-primary-500 opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
      </button>
      
      {/* Enhanced tooltip - only show for floating variant */}
      {floating && (
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
          <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap backdrop-blur-xl">
            {cartCount > 0 ? (
              <>
                <div className="font-medium">Panier: {cartCount} document{cartCount > 1 ? 's' : ''}</div>
                <div className="text-gray-300">Cliquez pour voir</div>
              </>
            ) : (
              'Panier vide'
            )}
            {/* Tooltip arrow */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900 dark:border-b-gray-700"></div>
          </div>
        </div>
      )}
    </div>
  );
}
