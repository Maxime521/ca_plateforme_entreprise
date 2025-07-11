// components/CompanyDocumentSection.js - Enhanced Company Document Section with Download Center
//==============================================================================

import { useState, useEffect } from 'react';
import { useDownloadManager } from '../hooks/useDownloadManager-simple';
import { useDocumentCart } from '../hooks/useDocumentCart';
import PDFDocumentCard from './PDFDocumentCard';
import DocumentDownloadCenter from './DocumentDownloadCenter';

export default function CompanyDocumentSection({ siren, companyData }) {
  const { downloadBatch, isDownloading } = useDownloadManager();
  const { cartItems, cartCount } = useDocumentCart();
  const [showDownloadCenter, setShowDownloadCenter] = useState(false);
  const [documents, setDocuments] = useState([]);

  // Generate document list based on company data
  useEffect(() => {
    if (siren) {
      const availableDocuments = generateDocumentList(siren, companyData);
      setDocuments(availableDocuments);
    }
  }, [siren, companyData]);

  const generateDocumentList = (siren, data) => {
    const docs = [];

    // INSEE Document
    docs.push({
      id: `insee-${siren}`,
      name: 'Avis de situation INSEE',
      description: 'Certificat officiel de situation au répertoire SIRENE',
      type: 'insee',
      siren: siren,
      siret: data?.siret || `${siren}00001`,
      format: 'PDF',
      size: '~200 KB',
      available: true,
      features: [
        'Données officielles INSEE',
        'Statut juridique actuel',
        'Adresse du siège social',
        'Code APE et secteur d\'activité'
      ]
    });

    // INPI Document
    docs.push({
      id: `inpi-${siren}`,
      name: 'Extrait RNE INPI',
      description: 'Registre National des Entreprises - Données juridiques complètes',
      type: 'inpi',
      siren: siren,
      format: 'PDF',
      size: '~500 KB',
      available: !!process.env.INPI_API_TOKEN,
      error: !process.env.INPI_API_TOKEN ? 'Token INPI requis pour accéder à ce service' : null,
      features: [
        'Informations juridiques complètes',
        'Historique des modifications',
        'Dirigeants et représentants',
        'Capital social et statuts'
      ]
    });

    // BODACC Document
    docs.push({
      id: `bodacc-${siren}`,
      name: 'Annonces BODACC',
      description: 'Bulletin Officiel des Annonces Commerciales',
      type: 'bodacc',
      siren: siren,
      format: 'JSON',
      size: 'Variable',
      available: true,
      features: [
        'Annonces officielles',
        'Procédures collectives',
        'Modifications d\'entreprise',
        'Radiations et créations'
      ]
    });

    return docs;
  };

  const availableDocuments = documents.filter(doc => doc.available);
  const unavailableDocuments = documents.filter(doc => !doc.available);

  const handleDownloadAll = async () => {
    if (availableDocuments.length === 0) return;
    
    try {
      await downloadBatch(availableDocuments);
    } catch (error) {
      console.error('Download all failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <span className="mr-3">📄</span>
            Documents Officiels
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Téléchargez les documents officiels pour le SIREN {siren}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center space-x-3">
          {cartCount > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-dark-card px-3 py-1 rounded-full">
              🛒 {cartCount} dans le panier
            </div>
          )}
          
          <button
            onClick={() => setShowDownloadCenter(true)}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium text-sm rounded-lg transition-colors flex items-center"
          >
            <span className="mr-2">📥</span>
            Centre de téléchargement
          </button>

          {availableDocuments.length > 0 && (
            <button
              onClick={handleDownloadAll}
              disabled={isDownloading}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center"
            >
              {isDownloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Téléchargement...
                </>
              ) : (
                <>
                  <span className="mr-2">⚡</span>
                  Tout télécharger ({availableDocuments.length})
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Document Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <span className="text-green-600 dark:text-green-400">✅</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Disponibles</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{availableDocuments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <span className="text-orange-600 dark:text-orange-400">⚙️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Configuration requise</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{unavailableDocuments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400">🛒</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Dans le panier</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{cartCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Available Documents */}
      {availableDocuments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="mr-2">✅</span>
            Documents disponibles
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableDocuments.map((document) => (
              <PDFDocumentCard 
                key={document.id} 
                document={document}
                showPreview={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Unavailable Documents */}
      {unavailableDocuments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="mr-2">⚙️</span>
            Configuration requise
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {unavailableDocuments.map((document) => (
              <PDFDocumentCard 
                key={document.id} 
                document={document}
                showPreview={false}
              />
            ))}
          </div>
          
          <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg">
            <div className="flex items-start">
              <div className="text-orange-500 mr-3">ℹ️</div>
              <div>
                <h4 className="font-medium text-orange-900 dark:text-orange-300">
                  Configuration API requise
                </h4>
                <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                  Certains documents nécessitent une configuration API pour être accessibles. 
                  Contactez votre administrateur pour activer ces services.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Download Center Modal */}
      {showDownloadCenter && (
        <DocumentDownloadCenter
          siren={siren}
          documents={documents}
          onClose={() => setShowDownloadCenter(false)}
        />
      )}

    </div>
  );
}