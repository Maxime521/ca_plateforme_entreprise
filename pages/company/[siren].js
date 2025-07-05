// pages/company/[siren].js - ENHANCED with BODACC Viewer Integration
//==============================================================================

import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import CompanyPDFSection from '../../components/CompanyPDFSection';
import { useBODACCReports } from '../../components/BODACCReportViewer'; // ✅ NEW IMPORT
import SiretDisplay, { SiretLabel } from '../../components/SiretDisplay'; // ✅ NEW IMPORT
import { InlineNumberWithCopy } from '../../components/CopyButton'; // ✅ COPY FUNCTIONALITY
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

export default function CompanyDetailsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { siren } = router.query;
  const [activeTab, setActiveTab] = useState('overview');
  
  // ✅ NEW: BODACC Viewer Integration
  const { openReportViewer, ReportViewerModal } = useBODACCReports();

  // Fetch company details
  const { data: company, isLoading, error } = useQuery({
    queryKey: ['company-details', siren],
    queryFn: async () => {
      if (!siren) return null;
      
      const response = await axios.get(`/api/companies/${siren}/details`);
      return response.data.data;
    },
    enabled: !!siren,
    staleTime: 5 * 60 * 1000,
  });

  // ✅ NEW: BODACC Report Handler
  const handleViewBODACCReport = () => {
    if (company?.company?.siren) {
      openReportViewer(company.company.siren);
    }
  };

  // ✅ NEW: Enhanced Documents Tab Actions
  const renderDocumentActions = () => (
    <div className="flex items-center space-x-3 mb-6">
      <button
        onClick={handleViewBODACCReport}
        className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors shadow-sm"
      >
        <span className="mr-2">📰</span>
        Voir Rapport BODACC
      </button>
      
      <button
        onClick={() => generateINSEEReport()}
        className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
      >
        <span className="mr-2">🏛️</span>
        Rapport INSEE
      </button>
      
      <button
        onClick={() => openEnhancedCart()}
        className="inline-flex items-center px-4 py-2 border border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 font-medium rounded-lg transition-colors"
      >
        <span className="mr-2">🛒</span>
        Ajouter au panier
      </button>
    </div>
  );

  // ✅ NEW: Generate INSEE Report
  const generateINSEEReport = async () => {
    try {
      const response = await fetch(`/api/test/generate-insee-html?siren=${company.company.siren}`);
      const data = await response.json();
      
      if (data.success) {
        // Open in new tab
        window.open(data.file.path, '_blank');
      } else {
        alert('Erreur lors de la génération du rapport INSEE');
      }
    } catch (error) {
      console.error('INSEE report generation failed:', error);
      alert('Erreur lors de la génération du rapport INSEE');
    }
  };

  // ✅ NEW: Open Enhanced Cart with current company
  const openEnhancedCart = () => {
    // Add current company documents to cart with unique keys
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const companyDocs = [
      {
        id: `bodacc-cart-${company.company.siren}-${timestamp}-${randomSuffix}`,
        name: `BODACC_${company.company.siren}.pdf`,
        type: 'bodacc',
        siren: company.company.siren,
        description: 'Annonces légales BODACC',
        available: true
      },
      {
        id: `insee-cart-${company.company.siren}-${timestamp}-${randomSuffix}-2`,
        name: `INSEE_${company.company.siren}.html`,
        type: 'insee',
        siren: company.company.siren,
        description: 'Rapport INSEE complet',
        available: true
      }
    ];

    // You can integrate with your document cart hook here
    // addToCart(companyDocs[0]);
    // addToCart(companyDocs[1]);
    
    // For now, show a preview
    alert(`Documents pour ${company.company.denomination} ajoutés au panier!`);
  };

  if (!user) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Acc&egrave;s non autoris&eacute;</h2>
            <p className="text-gray-600 dark:text-gray-400">Veuillez vous connecter pour acc&eacute;der aux d&eacute;tails de l&apos;entreprise.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <CompanyDetailsSkeleton />
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !company?.company) {
    return (
      <Layout>
        <div className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <CompanyNotFound siren={siren} error={error} />
          </div>
        </div>
      </Layout>
    );
  }

  const companyData = company.company;
  const establishments = company.establishments || [];
  const announcements = company.announcements || [];

  const tabs = [
    { id: 'overview', name: 'Vue d\'ensemble', icon: '🏢' },
    { id: 'documents', name: 'Documents PDF', icon: '📄' },
    { id: 'establishments', name: 'Établissements', icon: '🏪' },
    { id: 'announcements', name: 'Annonces', icon: '📰' },
    { id: 'financial', name: 'Financier', icon: '💰' }
  ];

  return (
    <Layout>
      <div className="py-8 px-4 sm:px-6 lg:px-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-card transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Retour
              </button>
              
              <div className="flex items-center space-x-3">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  companyData.active 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800'
                }`}>
                  <span className={`w-2 h-2 rounded-full mr-2 ${companyData.active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  {companyData.active ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {companyData.denomination || `Entreprise ${companyData.siren}`}
              </h1>
              <div className="flex items-center space-x-4 text-gray-600 dark:text-gray-400">
                <span className="inline-flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  SIREN: <InlineNumberWithCopy 
                    number={companyData.siren}
                    label="SIREN"
                    variant="muted"
                    className="ml-1"
                  />
                </span>
                {companyData.siret && (
                  <span className="inline-flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    SIRET: <SiretDisplay 
                      siret={companyData.siret}
                      siretSource={companyData.siretSource}
                      siretLabel={companyData.siretLabel}
                      variant="compact"
                      className="ml-1"
                    />
                  </span>
                )}
                {companyData.formeJuridique && (
                  <span className="inline-flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {companyData.formeJuridique}
                  </span>
                )}
                {companyData.dateCreation && (
                  <span className="inline-flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Créée le {new Date(companyData.dateCreation).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="mb-8">
            <nav className="flex space-x-1 bg-gray-100 dark:bg-dark-card p-1 rounded-xl">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-dark-surface text-primary-600 dark:text-primary-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-dark-surface/50'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="space-y-8">
            
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <CompanyOverviewTab company={{...companyData, siren: companyData.siren || siren}} />
            )}

            {/* ✅ ENHANCED Documents PDF Tab */}
            {activeTab === 'documents' && (
              <div className="space-y-6">
                {/* ✅ NEW: Document Actions */}
                {renderDocumentActions()}
                
                {/* ✅ ENHANCED: Original PDF Section */}
                <CompanyPDFSection company={companyData} />
                
                {/* ✅ NEW: Quick Access Panel */}
                <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-primary-200 dark:border-primary-800">
                  <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-300 mb-4 flex items-center">
                    <span className="mr-2">⚡</span>
                    Accès rapide aux documents
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-dark-surface rounded-lg p-4 border border-primary-200 dark:border-primary-700">
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-3">📰</span>
                        <h4 className="font-medium text-gray-900 dark:text-white">BODACC</h4>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Annonces légales officielles
                      </p>
                      <button
                        onClick={handleViewBODACCReport}
                        className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors"
                      >
                        Générer & Voir
                      </button>
                    </div>
                    
                    <div className="bg-white dark:bg-dark-surface rounded-lg p-4 border border-primary-200 dark:border-primary-700">
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-3">🏛️</span>
                        <h4 className="font-medium text-gray-900 dark:text-white">INSEE</h4>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Données officielles SIRENE
                      </p>
                      <button
                        onClick={generateINSEEReport}
                        className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                      >
                        Rapport HTML
                      </button>
                    </div>
                    
                    <div className="bg-white dark:bg-dark-surface rounded-lg p-4 border border-primary-200 dark:border-primary-700">
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-3">🛒</span>
                        <h4 className="font-medium text-gray-900 dark:text-white">Panier</h4>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Traitement par lot
                      </p>
                      <button
                        onClick={openEnhancedCart}
                        className="w-full px-3 py-2 border border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-sm font-medium rounded-md transition-colors"
                      >
                        Ajouter tous
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Establishments Tab */}
            {activeTab === 'establishments' && (
              <CompanyEstablishmentsTab establishments={establishments} />
            )}

            {/* Announcements Tab */}
            {activeTab === 'announcements' && (
              <CompanyAnnouncementsTab announcements={announcements} />
            )}

            {/* Financial Tab */}
            {activeTab === 'financial' && (
              <CompanyFinancialTab company={companyData} />
            )}
          </div>
        </div>
      </div>

      {/* ✅ NEW: BODACC Viewer Modal */}
      <ReportViewerModal />
    </Layout>
  );
}

//==============================================================================
// Existing Tab Components (keeping your original ones)
//==============================================================================

function CompanyOverviewTab({ company }) {
  // Debug: Log company data to see what we're receiving
  console.log('CompanyOverviewTab received company data:', {
    siren: company?.siren,
    denomination: company?.denomination,
    hasCompanyObject: !!company
  });
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Main Information */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Basic Information Card */}
        <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="mr-2">ℹ️</span>
            Informations générales
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <InfoItem label="Dénomination" value={company.denomination} />
              <InfoItem label="SIREN" value={company.siren} copyable={true} />
              <InfoItemWithSiret 
                label={<SiretLabel siretSource={company.siretSource} />} 
                siret={company.siret}
                siretSource={company.siretSource}
                siretLabel={company.siretLabel}
              />
              <InfoItem label="Forme juridique" value={company.formeJuridique} />
              <InfoItem label="Code APE" value={company.codeAPE ? `${company.codeAPE}${company.libelleAPE ? ` - ${company.libelleAPE}` : ''}` : 'Non renseigné'} />
            </div>
            <div className="space-y-4">
              <InfoItem label="Date de création" value={company.dateCreation ? new Date(company.dateCreation).toLocaleDateString('fr-FR') : 'N/A'} />
              <InfoItem label="Statut" value={company.active ? 'Active' : 'Inactive'} />
              <InfoItem label="Effectif" value={company.effectif || 'Non renseigné'} />
              <InfoItem label="Capital social" value={company.capitalSocial ? `${company.capitalSocial.toLocaleString()} €` : 'N/A'} />
            </div>
          </div>
        </div>

        {/* Address Information */}
        {company.adresseSiege && (
          <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="mr-2">📍</span>
              Adresse du siège social
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {company.adresseSiege}
            </p>
          </div>
        )}
      </div>

      {/* Sidebar Information */}
      <div className="space-y-6">
        
        {/* Quick Stats */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="mr-2">📊</span>
            Aperçu rapide
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-primary-100">SIREN:</span>
              <InlineNumberWithCopy 
                number={company.siren}
                label="SIREN"
                variant="gradient"
                className="font-medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-primary-100">SIRET:</span>
              <SiretDisplay 
                siret={company.siret}
                siretSource={company.siretSource}
                siretLabel={company.siretLabel}
                variant="gradient"
                showTooltip={false}
                className="text-white"
              />
            </div>
            <div className="flex justify-between">
              <span className="text-primary-100">Forme:</span>
              <span className="font-medium">{company.formeJuridique || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-primary-100">Statut:</span>
              <span className={`font-medium ${company.active ? 'text-green-200' : 'text-red-200'}`}>
                {company.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-primary-100">Création:</span>
              <span className="font-medium">
                {company.dateCreation ? new Date(company.dateCreation).getFullYear() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* ✅ NEW: Quick Actions */}
        <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="mr-2">⚡</span>
            Actions rapides
          </h3>
          <div className="space-y-3">
            <button className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium">
              📄 Voir documents PDF
            </button>
            <button className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card rounded-lg transition-colors text-sm font-medium">
              🏪 Voir établissements
            </button>
            <button className="w-full px-4 py-2 border border-green-300 dark:border-green-600 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors text-sm font-medium">
              📰 Rapport BODACC
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

//==============================================================================
// Complete Tab Components - Full Implementation
//==============================================================================

function CompanyEstablishmentsTab({ establishments }) {
  if (!establishments || establishments.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-12 text-center">
        <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">🏪</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Aucun établissement trouvé
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Les données d&apos;établissements ne sont pas disponibles pour cette entreprise.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <span className="mr-2">🏪</span>
          Établissements ({establishments.length})
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {establishments.map((establishment, index) => (
          <div key={establishment.siret || index} className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white flex items-center">
                  <span className="mr-2">{establishment.siegeSocial ? '🏛️' : '🏪'}</span>
                  {establishment.siegeSocial ? 'Siège social' : 'Établissement'}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  SIRET: {establishment.siret}
                </p>
              </div>
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                establishment.active 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {establishment.active ? 'Actif' : 'Fermé'}
              </div>
            </div>

            {establishment.adresse && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Adresse:</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {establishment.adresse}
                </p>
              </div>
            )}

            <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
              {establishment.dateCreation && (
                <div className="flex justify-between">
                  <span>Création:</span>
                  <span>{new Date(establishment.dateCreation).toLocaleDateString('fr-FR')}</span>
                </div>
              )}
              {establishment.effectif && (
                <div className="flex justify-between">
                  <span>Effectif:</span>
                  <span>{establishment.effectif}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompanyAnnouncementsTab({ announcements }) {
  if (!announcements || announcements.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-12 text-center">
        <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">📰</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Aucune annonce trouvée
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Aucune publication BODACC n&apos;est disponible pour cette entreprise.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <span className="mr-2">📰</span>
          Annonces BODACC ({announcements.length})
        </h3>
      </div>

      <div className="space-y-4">
        {announcements.map((announcement, index) => (
          <div key={announcement.id || index} className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {announcement.typeAnnonce || 'Annonce'}
                  </h4>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                    {announcement.tribunal || 'BODACC'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Publié le {new Date(announcement.dateParution).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>

            {announcement.denomination && (
              <p className="text-sm text-gray-900 dark:text-white mb-3">
                <strong>Entreprise:</strong> {announcement.denomination}
              </p>
            )}

            {announcement.details && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Détails:</p>
                <div className="bg-gray-50 dark:bg-dark-card rounded-lg p-3">
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                    {announcement.details.length > 300 
                      ? `${announcement.details.substring(0, 300)}...` 
                      : announcement.details
                    }
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>N° {announcement.numeroAnnonce || 'N/A'}</span>
              {announcement.ville && (
                <span>{announcement.ville}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompanyFinancialTab({ company }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <span className="mr-2">💰</span>
          Informations financières
        </h3>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Capital Social */}
        {company.capitalSocial && (
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Capital Social</p>
                <p className="text-2xl font-bold">
                  {company.capitalSocial.toLocaleString()} €
                </p>
              </div>
              <span className="text-3xl opacity-80">💰</span>
            </div>
          </div>
        )}

        {/* Company Age */}
        {company.dateCreation && (
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Ancienneté</p>
                <p className="text-2xl font-bold">
                  {new Date().getFullYear() - new Date(company.dateCreation).getFullYear()} ans
                </p>
              </div>
              <span className="text-3xl opacity-80">📅</span>
            </div>
          </div>
        )}

        {/* Status */}
        <div className={`rounded-xl p-6 text-white ${
          company.active 
            ? 'bg-gradient-to-r from-green-500 to-green-600' 
            : 'bg-gradient-to-r from-red-500 to-red-600'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${company.active ? 'text-green-100' : 'text-red-100'}`}>
                Statut de l&apos;entreprise
              </p>
              <p className="text-2xl font-bold">
                {company.active ? 'Active' : 'Inactive'}
              </p>
            </div>
            <span className="text-3xl opacity-80">
              {company.active ? '✅' : '❌'}
            </span>
          </div>
        </div>
      </div>

      {/* Financial Details */}
      <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-6">
        <h4 className="font-medium text-gray-900 dark:text-white mb-4">
          Détails financiers
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <InfoItem label="Capital social" value={company.capitalSocial ? `${company.capitalSocial.toLocaleString()} €` : 'Non renseigné'} />
            <InfoItem label="Forme juridique" value={company.formeJuridique || 'Non renseignée'} />
            <InfoItem label="Code APE" value={company.codeAPE || 'Non renseigné'} />
          </div>
          <div className="space-y-4">
            <InfoItem label="Date de création" value={company.dateCreation ? new Date(company.dateCreation).toLocaleDateString('fr-FR') : 'Non renseignée'} />
            <InfoItem label="Effectif" value={company.effectif || 'Non renseigné'} />
            <InfoItem label="Statut" value={company.active ? 'Active' : 'Inactive'} />
          </div>
        </div>

        {/* Note */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start">
            <span className="text-blue-500 mr-3 mt-0.5">ℹ️</span>
            <div>
              <h5 className="font-medium text-blue-900 dark:text-blue-300 mb-1">
                Informations financières limitées
              </h5>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Les données financières détaillées ne sont disponibles que pour les entreprises ayant publié leurs comptes annuels. 
                Consultez les documents PDF pour plus d&apos;informations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

//==============================================================================
// Helper Components
//==============================================================================

function InfoItem({ label, value, copyable = false }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
        {label}
      </p>
      <div className="text-sm text-gray-900 dark:text-white">
        {copyable && value ? (
          <InlineNumberWithCopy 
            number={value}
            label={label}
            variant="default"
          />
        ) : (
          <span>{value || 'Non renseigné'}</span>
        )}
      </div>
    </div>
  );
}

function InfoItemWithSiret({ label, siret, siretSource, siretLabel }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
        {label}
      </p>
      <div className="text-sm text-gray-900 dark:text-white">
        <SiretDisplay 
          siret={siret}
          siretSource={siretSource}
          siretLabel={siretLabel}
          variant="clean-with-source"
        />
      </div>
    </div>
  );
}

function CompanyDetailsSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        <div className="flex space-x-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28"></div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex-1 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i}>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-1"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i}>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-1"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-xl h-48"></div>
          <div className="bg-gray-200 dark:bg-gray-700 rounded-xl h-32"></div>
        </div>
      </div>
    </div>
  );
}

function CompanyNotFound({ siren, error }) {
  return (
    <div className="text-center py-12">
      <div className="text-gray-400 dark:text-gray-500 text-6xl mb-6">🏢</div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Entreprise introuvable
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
        {siren 
          ? `Aucune entreprise trouvée avec le SIREN ${siren}. Vérifiez que le numéro est correct.`
          : 'SIREN non spécifié dans l\'URL.'
        }
      </p>
      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg max-w-md mx-auto">
          <p className="text-sm text-red-600 dark:text-red-400">
            Erreur: {error.message}
          </p>
        </div>
      )}
      <div className="mt-8 space-x-4">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          ← Retour
        </button>
        <Link
          href="/"
          className="inline-flex items-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          🏠 Accueil
        </Link>
      </div>
    </div>
  );
}
