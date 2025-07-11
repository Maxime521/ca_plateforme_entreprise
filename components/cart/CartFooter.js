// components/cart/CartFooter.js - Enhanced cart footer with actions
export default function CartFooter({ 
  cartItems, 
  isProcessing, 
  isDownloading, 
  onClearCart, 
  onQuickViewBODACC, 
  onBulkDownload, 
  onProcessAll 
}) {
  const hasBODACCDocuments = cartItems.some(item => item.type === 'bodacc');

  return (
    <div className="border-t border-gray-200 dark:border-dark-border p-6 space-y-4 bg-gray-50 dark:bg-dark-card">
      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onClearCart}
          disabled={isProcessing || isDownloading}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-dark-border rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card transition-colors disabled:opacity-50"
          aria-label="Vider le panier"
        >
          🗑️ Vider
        </button>
        
        <button
          onClick={() => {
            const bodaccDoc = cartItems.find(item => item.type === 'bodacc');
            if (bodaccDoc) {
              onQuickViewBODACC(bodaccDoc.siren);
            }
          }}
          disabled={isProcessing || isDownloading || !hasBODACCDocuments}
          className="px-3 py-2 text-sm border border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors disabled:opacity-50"
          aria-label="Aperçu rapide BODACC"
        >
          👁️ Aperçu
        </button>

        <button
          onClick={onBulkDownload}
          disabled={isProcessing || isDownloading || cartItems.length === 0}
          className="px-3 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
          aria-label="Téléchargement en lot"
        >
          {isDownloading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
              ...
            </div>
          ) : (
            <>📥 Tout</>
          )}
        </button>
      </div>
      
      {/* Main Process Button */}
      <button
        onClick={onProcessAll}
        disabled={isProcessing || cartItems.length === 0}
        className="w-full px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-medium rounded-lg transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:opacity-50 shadow-lg"
        aria-label="Traiter tous les documents"
      >
        {isProcessing ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Traitement en cours...
          </div>
        ) : (
          `⚡ Traiter tout (${cartItems.length})`
        )}
      </button>

      {/* Progress indicator */}
      {isProcessing && (
        <div className="text-center">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Mode production • Génération de vrais documents
          </div>
        </div>
      )}
    </div>
  );
}