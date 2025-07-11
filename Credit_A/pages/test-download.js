// pages/test-download.js - Test page for download functionality
//==============================================================================

import { useState } from 'react';
import { useDownloadManager } from '../hooks/useDownloadManager-simple';
import { useDocumentCart } from '../hooks/useDocumentCart';
import Layout from '../components/Layout';

export default function TestDownload() {
  const { downloadDocument, downloadBatch, isDownloading, downloadProgress } = useDownloadManager();
  const { cartItems, addToCart, clearCart } = useDocumentCart();
  const [testResults, setTestResults] = useState([]);

  // Test documents
  const testDocuments = [
    {
      id: 'test-insee-1',
      name: 'Test INSEE Document',
      description: 'Document de test INSEE',
      type: 'insee',
      siren: '552081317', // Example SIREN
      siret: '55208131700001',
      available: true
    },
    {
      id: 'test-bodacc-1',
      name: 'Test BODACC Document',
      description: 'Document de test BODACC',
      type: 'bodacc',
      siren: '552081317',
      available: true
    }
  ];

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, { timestamp, message, type }]);
    console.log(`[${timestamp}] ${message}`);
  };

  const testSingleDownload = async (document) => {
    addLog(`🚀 Testing single download: ${document.name}`, 'info');
    try {
      await downloadDocument(document);
      addLog(`✅ Single download successful: ${document.name}`, 'success');
    } catch (error) {
      addLog(`❌ Single download failed: ${error.message}`, 'error');
    }
  };

  const testBulkDownload = async () => {
    addLog(`🚀 Testing bulk download with ${testDocuments.length} documents`, 'info');
    try {
      const results = await downloadBatch(testDocuments);
      addLog(`✅ Bulk download completed: ${results.successful.length} success, ${results.failed.length} failed`, 'success');
    } catch (error) {
      addLog(`❌ Bulk download failed: ${error.message}`, 'error');
    }
  };

  const testCartDownload = async () => {
    addLog(`🛒 Testing cart download with ${cartItems.length} items`, 'info');
    if (cartItems.length === 0) {
      addLog(`⚠️ Cart is empty, adding test documents first`, 'warning');
      testDocuments.forEach(doc => addToCart(doc));
      return;
    }
    
    try {
      const results = await downloadBatch(cartItems);
      addLog(`✅ Cart download completed: ${results.successful.length} success, ${results.failed.length} failed`, 'success');
    } catch (error) {
      addLog(`❌ Cart download failed: ${error.message}`, 'error');
    }
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            🧪 Test de Téléchargement
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Page de test pour vérifier le fonctionnement du système de téléchargement
          </p>
        </div>

        {/* Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Statut Téléchargement</h3>
            <div className={`text-lg font-bold ${isDownloading ? 'text-blue-600' : 'text-green-600'}`}>
              {isDownloading ? '🔄 En cours' : '✅ Prêt'}
            </div>
          </div>

          <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Panier</h3>
            <div className="text-lg font-bold text-primary-600">
              🛒 {cartItems.length} document(s)
            </div>
          </div>

          <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Progrès</h3>
            <div className="text-lg font-bold text-gray-600 dark:text-gray-400">
              📊 {Object.keys(downloadProgress).length} actif(s)
            </div>
          </div>
        </div>

        {/* Test Documents */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            📄 Documents de Test
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testDocuments.map((document) => (
              <div key={document.id} className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {document.name}
                  </h3>
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                    {document.type.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  SIREN: {document.siren}
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => testSingleDownload(document)}
                    disabled={isDownloading}
                    className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded transition-colors disabled:opacity-50"
                  >
                    📥 Test Download
                  </button>
                  <button
                    onClick={() => addToCart(document)}
                    className="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white text-sm rounded transition-colors"
                  >
                    🛒 Add to Cart
                  </button>
                </div>
                
                {/* Progress for this document */}
                {downloadProgress[document.id] && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded text-xs">
                    <div className="flex justify-between mb-1">
                      <span>{downloadProgress[document.id].status}</span>
                      <span>{downloadProgress[document.id].progress}%</span>
                    </div>
                    <div className="w-full bg-blue-200 dark:bg-blue-700 rounded h-1">
                      <div 
                        className="bg-blue-600 h-1 rounded transition-all duration-300"
                        style={{ width: `${downloadProgress[document.id].progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Test Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            🎯 Actions de Test
          </h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={testBulkDownload}
              disabled={isDownloading}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isDownloading ? '⏳ En cours...' : '📦 Test Bulk Download'}
            </button>

            <button
              onClick={testCartDownload}
              disabled={isDownloading}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isDownloading ? '⏳ En cours...' : '🛒 Test Cart Download'}
            </button>

            <button
              onClick={() => testDocuments.forEach(doc => addToCart(doc))}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
            >
              🛒 Fill Cart
            </button>

            <button
              onClick={clearCart}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
            >
              🗑️ Clear Cart
            </button>

            <button
              onClick={clearLogs}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
            >
              🧹 Clear Logs
            </button>
          </div>
        </div>

        {/* Test Results Log */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            📋 Logs de Test
          </h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <div className="text-gray-500">Aucun log pour le moment...</div>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className={`mb-1 ${
                  result.type === 'error' ? 'text-red-400' : 
                  result.type === 'success' ? 'text-green-400' : 
                  result.type === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                }`}>
                  [{result.timestamp}] {result.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}