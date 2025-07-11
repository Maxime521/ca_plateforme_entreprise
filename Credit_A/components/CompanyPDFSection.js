// components/CompanyPDFSection.js - ENHANCED VERSION with Cart Integration
//==============================================================================

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDocumentCart } from '../hooks/useDocumentCart';
import PDFDocumentCard from './PDFDocumentCard';
import AvisSituationCard from './AvisSituationCard';

export default function CompanyPDFSection({ company }) {
  const [showAllPDFs, setShowAllPDFs] = useState(false);
  const { cartCount, addToCart } = useDocumentCart();

  // Fetch available PDFs for this company
  const { data: pdfData, isLoading, error } = useQuery({
    queryKey: ['company-pdfs', company.siren],
    queryFn: async () => {
      
      
      
      // Build URL with SIRET if available
      let url = `/api/documents/generate-pdfs?siren=${company.siren}`;
      if (company.siret) {
        url += `&siret=${company.siret}`;
        
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch PDFs');
      }
      const data = await response.json();
      
      return data;
    },
    enabled: !!company.siren,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleAddAllToCart = () => {
    const availablePDFs = pdfData?.documents?.filter(pdf => pdf.available) || [];
    availablePDFs.forEach(pdf => {
      addToCart(pdf);
    });
    
    // Show success message
    const count = availablePDFs.length;
    if (count > 0) {
      // You could add a toast notification here
      console.log(`${count} document(s) ajouté(s) au panier`);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <span className="mr-2">📄</span>
          Documents PDF Officiels
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 dark:bg-gray-700 h-32 rounded-lg mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <span className="mr-2">📄</span>
          Documents PDF Officiels
        </h3>
        <div className="text-center py-8">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <p className="text-red-600 dark:text-red-400">
            Erreur lors du chargement des documents PDF
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {error.message}
          </p>
        </div>
      </div>
    );
  }

  const availablePDFs = pdfData?.documents?.filter(pdf => pdf.available) || [];
  const unavailablePDFs = pdfData?.documents?.filter(pdf => !pdf.available) || [];

  // Handle AVIS DE SITUATION document refresh
  const handleAvisDownload = (document) => {
    // Refresh the PDF data to show the newly downloaded document
    // This would trigger a refetch of the useQuery
    
  };

  return (
    <div className="space-y-6">
      
      {/* AVIS DE SITUATION Section */}
      <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center mb-2">
            <span className="mr-2">🏛️</span>
            AVIS DE SITUATION INSEE
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Document officiel de situation au répertoire SIRENE
          </p>
        </div>
        
        <AvisSituationCard 
          company={company}
          document={{
            id: `avis-situation-${company.siren}-${Date.now()}`,
            available: false, // Will be checked dynamically
            type: 'avis-situation'
          }}
          onDownload={handleAvisDownload}
        />
      </div>

      {/* Other Documents Section */}
      <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-6">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <span className="mr-2">📄</span>
              Documents PDF Officiels
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {availablePDFs.length} document{availablePDFs.length > 1 ? 's' : ''} disponible{availablePDFs.length > 1 ? 's' : ''}
              {cartCount > 0 && (
                <span className="ml-2 text-primary-600 dark:text-primary-400 font-medium">
                  • {cartCount} dans le panier
                </span>
              )}
            </p>
          </div>

          {unavailablePDFs.length > 0 && (
            <button
              onClick={() => setShowAllPDFs(!showAllPDFs)}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              {showAllPDFs ? 'Masquer indisponibles' : `Voir tous (${pdfData.documents.length})`}
            </button>
          )}
        </div>

        {/* Available PDFs */}
        {availablePDFs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {availablePDFs.map((pdf, index) => (
              <PDFDocumentCard key={`${pdf.id}-available-${index}`} document={pdf} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 mb-6">
            <div className="text-gray-400 dark:text-gray-500 text-4xl mb-4">📄</div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Aucun document disponible
            </h4>
            <p className="text-gray-600 dark:text-gray-400">
              Les documents PDF pour cette entreprise ne sont pas accessibles actuellement
            </p>
          </div>
        )}

        {/* Unavailable PDFs (show when toggled) */}
        {showAllPDFs && unavailablePDFs.length > 0 && (
          <div className="border-t border-gray-200 dark:border-dark-border pt-6">
            <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center">
              <span className="mr-2">⚠️</span>
              Documents non disponibles
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {unavailablePDFs.map((pdf, index) => (
                <PDFDocumentCard key={`${pdf.id}-unavailable-${index}`} document={pdf} showPreview={false} />
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Quick Actions */}
        <div className="border-t border-gray-200 dark:border-dark-border pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p className="flex items-center">
                <span className="mr-2">💡</span>
                <strong>Astuce:</strong> Ajoutez les documents au panier pour les télécharger tous ensemble
              </p>
            </div>
            
            {availablePDFs.length > 0 && (
              <button
                onClick={handleAddAllToCart}
                className="px-4 py-2 text-sm border border-primary-300 dark:border-primary-600 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors flex items-center space-x-2"
              >
                <span>➕</span>
                <span>Tout ajouter ({availablePDFs.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>
      
    </div>
  );
}
