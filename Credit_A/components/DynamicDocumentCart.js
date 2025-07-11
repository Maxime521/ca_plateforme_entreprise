// components/DynamicDocumentCart.js - Dynamic Document Cart Components
import dynamic from 'next/dynamic';

// Loading skeleton for document cart sidebar
function DocumentCartSkeleton() {
  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-900 shadow-xl border-l border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out z-50">
      <div className="flex flex-col h-full">
        {/* Header skeleton */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32"></div>
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        
        {/* Content skeleton */}
        <div className="flex-1 p-4 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/4"></div>
            </div>
          ))}
        </div>
        
        {/* Footer skeleton */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full"></div>
        </div>
      </div>
    </div>
  );
}

// Loading skeleton for enhanced document cart
function EnhancedCartSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        ))}
      </div>
      <div className="mt-4 h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
  );
}

// Dynamic imports for document cart components
const DocumentCartSidebar = dynamic(
  () => import('./DocumentCartSidebar'),
  {
    loading: () => <DocumentCartSkeleton />,
    ssr: false // Cart doesn't need SSR
  }
);

const EnhancedDocumentCart = dynamic(
  () => import('./EnhancedDocumentCart'),
  {
    loading: () => <EnhancedCartSkeleton />,
    ssr: false
  }
);

// Export dynamic components
export {
  DocumentCartSidebar as DynamicDocumentCartSidebar,
  EnhancedDocumentCart as DynamicEnhancedDocumentCart
};

// Enhanced document cart hook with lazy loading
export function useDynamicDocumentCart() {
  const { useState, useCallback } = require('react');
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartLoaded, setCartLoaded] = useState(false);

  const openCart = useCallback(() => {
    setIsCartOpen(true);
    
    // Preload cart components when first opened
    if (!cartLoaded) {
      Promise.all([
        import('./DocumentCartSidebar'),
        import('./EnhancedDocumentCart')
      ]).then(() => {
        setCartLoaded(true);
      });
    }
  }, [cartLoaded]);

  const closeCart = useCallback(() => {
    setIsCartOpen(false);
  }, []);

  return {
    isCartOpen,
    cartLoaded,
    openCart,
    closeCart,
    DocumentCartSidebar: isCartOpen ? DocumentCartSidebar : null,
    EnhancedDocumentCart: isCartOpen ? EnhancedDocumentCart : null
  };
}