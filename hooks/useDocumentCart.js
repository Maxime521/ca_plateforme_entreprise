import { useState, useEffect, useContext, createContext } from 'react';

const DocumentCartContext = createContext();

export function DocumentCartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  // Load cart from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedCart = localStorage.getItem('document-cart');
        if (savedCart) {
          setCartItems(JSON.parse(savedCart));
        }
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('document-cart', JSON.stringify(cartItems));
      } catch (error) {
        console.error('Error saving cart:', error);
      }
    }
  }, [cartItems]);

  const addToCart = (document) => {
    setCartItems(prev => {
      const exists = prev.find(item => item.id === document.id);
      if (exists) {
        return prev; // Don't add duplicates
      }
      return [...prev, { ...document, addedAt: new Date().toISOString() }];
    });
  };

  const removeFromCart = (documentId) => {
    setCartItems(prev => prev.filter(item => item.id !== documentId));
  };

  const clearCart = () => {
    setCartItems([]);
    setUploadProgress({});
  };

  const isInCart = (documentId) => {
    return cartItems.some(item => item.id === documentId);
  };

  const toggleCart = () => {
    setIsOpen(!isOpen);
  };

  const updateUploadProgress = (documentId, progress) => {
    setUploadProgress(prev => ({
      ...prev,
      [documentId]: progress
    }));
  };

  const value = {
    cartItems,
    cartCount: cartItems.length,
    isOpen,
    uploadProgress,
    addToCart,
    removeFromCart,
    clearCart,
    isInCart,
    toggleCart,
    setIsOpen,
    updateUploadProgress
  };

  return (
    <DocumentCartContext.Provider value={value}>
      {children}
    </DocumentCartContext.Provider>
  );
}

export function useDocumentCart() {
  const context = useContext(DocumentCartContext);
  if (!context) {
    throw new Error('useDocumentCart must be used within a DocumentCartProvider');
  }
  return context;
}
