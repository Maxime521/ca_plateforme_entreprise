// components/cart/EnhancedDocumentCart.js - Refactored modular cart component
import { useDocumentCart } from '../../hooks/useDocumentCart';
import { useBODACCReports } from '../BODACCReportViewer';
import { useDownloadManager } from '../../hooks/useDownloadManager-simple';
import { useDocumentProcessor } from './DocumentProcessor';
import CartHeader from './CartHeader';
import CartItems from './CartItems';
import CartFooter from './CartFooter';

export default function EnhancedDocumentCart() {
  const { 
    cartItems, 
    isOpen, 
    setIsOpen, 
    clearCart, 
    removeFromCart,
    updateUploadProgress 
  } = useDocumentCart();
  
  const { generateAndView: generateBODACCReport } = useBODACCReports();
  const { downloadBatch, isDownloading } = useDownloadManager();
  const { processAllDocuments, isProcessing, processingStatus } = useDocumentProcessor();

  // Handle bulk download
  const handleBulkDownload = async () => {
    if (cartItems.length === 0) {
      return;
    }
    
    try {
      await downloadBatch(cartItems);
    } catch (error) {
      console.error('❌ Bulk download failed:', error);
    }
  };

  // Quick action: Generate and view BODACC report
  const quickViewBODACCReport = async (siren) => {
    try {
      await generateBODACCReport(siren, 'html');
    } catch (error) {
      console.error('Quick BODACC generation failed:', error);
    }
  };

  // Handle processing all documents
  const handleProcessAllDocuments = async () => {
    await processAllDocuments(cartItems, updateUploadProgress);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Enhanced Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Enhanced Cart Sidebar */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-dark-surface shadow-2xl z-50 transform transition-all duration-300 flex flex-col border-l border-gray-200 dark:border-dark-border">
        
        {/* Header */}
        <CartHeader 
          cartItems={cartItems}
          onClose={() => setIsOpen(false)}
        />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <CartItems 
            cartItems={cartItems}
            processingStatus={processingStatus}
            onRemove={removeFromCart}
            onQuickView={quickViewBODACCReport}
          />
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <CartFooter 
            cartItems={cartItems}
            isProcessing={isProcessing}
            isDownloading={isDownloading}
            onClearCart={clearCart}
            onQuickViewBODACC={quickViewBODACCReport}
            onBulkDownload={handleBulkDownload}
            onProcessAll={handleProcessAllDocuments}
          />
        )}
      </div>
    </>
  );
}