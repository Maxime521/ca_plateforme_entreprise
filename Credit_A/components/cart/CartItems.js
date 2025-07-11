// components/cart/CartItems.js - Enhanced cart items display
export default function CartItems({ cartItems, processingStatus, onRemove, onQuickView }) {
  if (cartItems.length === 0) {
    return <EmptyCartView />;
  }

  return (
    <div className="space-y-4">
      {cartItems.map((document) => (
        <CartDocumentItem 
          key={document.id} 
          document={document}
          status={processingStatus[document.id]}
          onRemove={() => onRemove(document.id)}
          onQuickView={onQuickView}
        />
      ))}
      
      {/* Processing Summary */}
      {Object.keys(processingStatus).length > 0 && (
        <ProcessingSummaryCard processingStatus={processingStatus} />
      )}
    </div>
  );
}

// Enhanced Document Item Component
function CartDocumentItem({ document, status, onRemove, onQuickView }) {
  const getDocumentIcon = (type) => {
    const icons = { 
      insee: '🏛️', 
      inpi: '📋', 
      bodacc: '📰',
      default: '📄'
    };
    return icons[type] || icons.default;
  };

  const getStatusColor = (status) => {
    switch (status?.status) {
      case 'completed': return 'text-green-600 dark:text-green-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      case 'processing': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusText = (status) => {
    switch (status?.status) {
      case 'completed': return '✅ Traité';
      case 'error': return '❌ Erreur';
      case 'processing': return '🔄 Traitement...';
      default: return '⏳ En attente';
    }
  };

  return (
    <div className="flex items-start space-x-3 p-4 bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border hover:shadow-md transition-all duration-200">
      <div className="text-2xl flex-shrink-0">{getDocumentIcon(document.type)}</div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-900 dark:text-white truncate">
            {document.name}
          </h4>
          <span className={`text-xs font-medium ${getStatusColor(status)}`}>
            {getStatusText(status)}
          </span>
        </div>
        
        <p className="text-xs text-gray-600 dark:text-gray-400 truncate mb-2">
          {document.description}
        </p>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">
            SIREN: {document.siren}
          </span>
          {status?.result?.downloadUrl && (
            <a
              href={status.result.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              📥 Télécharger
            </a>
          )}
        </div>

        {/* Enhanced Progress Bar */}
        {status?.status === 'processing' && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                {status.message || 'Traitement...'}
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {status.progress || 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className="h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${status.progress || 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Display */}
        {status?.error && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-xs">
            <span className="text-red-600 dark:text-red-400">
              {status.error}
            </span>
          </div>
        )}

        {/* Success Details */}
        {status?.status === 'completed' && status.result && (
          <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded text-xs">
            <div className="text-green-600 dark:text-green-400">
              ✅ {status.result.filename}
              {status.result.size && ` • ${status.result.size}`}
              {status.result.recordCount && ` • ${status.result.recordCount} annonces`}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex flex-col space-y-2">
        {/* Quick View Button for BODACC */}
        {document.type === 'bodacc' && (
          <button
            onClick={() => onQuickView(document.siren)}
            className="p-1 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
            title="Aperçu rapide"
            aria-label="Aperçu rapide BODACC"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        )}
        
        {/* Remove Button */}
        <button
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-red-50 dark:hover:bg-red-900/20"
          title="Retirer du panier"
          aria-label="Retirer du panier"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Empty Cart View
function EmptyCartView() {
  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-4xl">📄</span>
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Panier vide
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Ajoutez des documents pour les traiter en lot
      </p>
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start">
          <span className="text-blue-500 mr-2">🚀</span>
          <div>
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300">
              Nouvelles fonctionnalités production
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-400 mt-2 space-y-1">
              <li>• 📰 Rapports BODACC avec 100+ annonces réelles</li>
              <li>• 🏛️ Données INSEE en temps réel</li>
              <li>• 📋 PDFs INPI téléchargeables</li>
              <li>• ⚡ Traitement par lot optimisé</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Processing Summary Card
function ProcessingSummaryCard({ processingStatus }) {
  const statuses = Object.values(processingStatus);
  const completed = statuses.filter(s => s.status === 'completed').length;
  const errors = statuses.filter(s => s.status === 'error').length;
  const processing = statuses.filter(s => s.status === 'processing').length;

  return (
    <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
      <h4 className="font-medium text-primary-900 dark:text-primary-300 mb-3 flex items-center">
        <span className="mr-2">📊</span>
        Résumé du traitement
      </h4>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-lg font-bold text-green-600 dark:text-green-400">{completed}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Complétés</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{processing}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">En cours</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-red-600 dark:text-red-400">{errors}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Erreurs</div>
        </div>
      </div>

      {completed > 0 && (
        <div className="text-center">
          <div className="text-sm text-green-600 dark:text-green-400">
            ✅ {completed} document(s) traité(s) avec succès
          </div>
        </div>
      )}
    </div>
  );
}