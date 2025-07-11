// components/cart/CartHeader.js - Enhanced cart header component
export default function CartHeader({ cartItems, onClose }) {
  return (
    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
          <span className="mr-2">🎯</span>
          Panier Documents
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {cartItems.length} document{cartItems.length > 1 ? 's' : ''} • Mode Production
        </p>
      </div>
      
      <button
        onClick={onClose}
        className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card transition-all duration-200 hover:scale-110"
        aria-label="Fermer le panier"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}