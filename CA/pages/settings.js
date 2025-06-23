//==============================================================================
// PART 3: Role-Based Settings Page - Admin and User Views
//==============================================================================

// pages/settings.js - Completely Redesigned with Role-Based Access
import { useState } from 'react';
import Layout from '../components/Layout';
import RoleGuard from '../components/RoleGuard';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { FEATURES } from '../utils/rolePermissions';

export default function Settings() {
  const { user, userRole, isAdmin } = useAuth();
  
  if (!user) {
    return <div>Accès non autorisé</div>;
  }

  return (
    <RoleGuard requiredFeature={FEATURES.SETTINGS}>
      <Layout>
        {isAdmin() ? <AdminSettings /> : <UserSettings />}
      </Layout>
    </RoleGuard>
  );
}

// Admin Settings Component - Full Featured
function AdminSettings() {
  const { user } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [settings, setSettings] = useState({
    // Profile settings
    displayName: user?.displayName || '',
    email: user?.email || '',
    notifications: {
      email: true,
      push: false,
      weekly: true,
      errors: true
    },
    // API settings
    apiKeys: {
      insee: '••••••••••••••••',
      inpi: '••••••••••••••••',
      bodacc: 'Public API'
    },
    apiLimits: {
      perSecond: 10,
      perMinute: 100
    },
    // Data settings
    dataRetention: 365,
    autoSync: true,
    syncFrequency: 'daily',
    // Display settings
    language: 'fr',
    timezone: 'Europe/Paris',
    dateFormat: 'DD/MM/YYYY',
    currency: 'EUR'
  });

  const adminTabs = [
    { id: 'profile', name: 'Profil', icon: '👤' },
    { id: 'api', name: 'API & Intégrations', icon: '🔌' },
    { id: 'data', name: 'Données', icon: '💾' },
    { id: 'display', name: 'Affichage', icon: '🎨' },
    { id: 'security', name: 'Sécurité', icon: '🔒' },
    { id: 'users', name: 'Utilisateurs', icon: '👥' }
  ];

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const handleSave = () => {
    alert('Paramètres sauvegardés avec succès!');
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Admin Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Paramètres Administrateur
            </h1>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
              <span className="mr-1">👑</span>
              Admin
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-200">
            Configuration avancée de la plateforme et gestion des utilisateurs
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Admin Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <ul className="space-y-2">
                {adminTabs.map((tab) => (
                  <li key={tab.id}>
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="mr-3">{tab.icon}</span>
                      {tab.name}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Admin Content */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              
              {/* Profile Tab - Same as before */}
              {activeTab === 'profile' && (
                <AdminProfileTab 
                  settings={settings} 
                  setSettings={setSettings} 
                  handleSettingChange={handleSettingChange} 
                />
              )}

              {/* API Tab - Full Featured for Admin */}
              {activeTab === 'api' && (
                <AdminAPITab 
                  settings={settings} 
                  showApiKeys={showApiKeys}
                  setShowApiKeys={setShowApiKeys}
                  handleSettingChange={handleSettingChange} 
                />
              )}

              {/* Data Tab - Full Data Management for Admin */}
              {activeTab === 'data' && (
                <AdminDataTab 
                  settings={settings} 
                  setSettings={setSettings} 
                />
              )}

              {/* Display Tab */}
              {activeTab === 'display' && (
                <AdminDisplayTab 
                  settings={settings} 
                  setSettings={setSettings}
                  toggleTheme={toggleTheme}
                  isDark={isDark}
                />
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <AdminSecurityTab />
              )}

              {/* Users Tab - Admin Only */}
              {activeTab === 'users' && (
                <AdminUsersTab />
              )}

              {/* Save Button */}
              <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="flex justify-end space-x-3">
                  <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                    Annuler
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                  >
                    Sauvegarder les modifications
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// User Settings Component - Simplified
function UserSettings() {
  const { user } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [settings, setSettings] = useState({
    // Limited profile settings
    displayName: user?.displayName || '',
    email: user?.email || '',
    notifications: {
      email: true,
      weekly: true
    },
    // Basic display settings only
    language: 'fr',
    timezone: 'Europe/Paris',
    dateFormat: 'DD/MM/YYYY'
  });

  // Simplified tabs for regular users
  const userTabs = [
    { id: 'profile', name: 'Profil', icon: '👤' },
    { id: 'display', name: 'Affichage', icon: '🎨' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' }
  ];

  const handleSave = () => {
    alert('Paramètres sauvegardés avec succès!');
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* User Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Mes Paramètres
            </h1>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              <span className="mr-1">👤</span>
              Utilisateur
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-200">
            Personnalisez votre expérience utilisateur
          </p>
        </div>

        {/* Notice for limited access */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl">
          <div className="flex items-start">
            <span className="text-blue-500 mr-3 mt-0.5 text-lg">ℹ️</span>
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-1">
                Compte Utilisateur Standard
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Vous avez accès aux paramètres de base. Pour accéder aux fonctionnalités avancées comme la configuration des API et la gestion des données, contactez votre administrateur.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* User Sidebar - Simplified */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <ul className="space-y-2">
                {userTabs.map((tab) => (
                  <li key={tab.id}>
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="mr-3">{tab.icon}</span>
                      {tab.name}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* User Content - Simplified */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              
              {/* Profile Tab - Basic */}
              {activeTab === 'profile' && (
                <UserProfileTab 
                  settings={settings} 
                  setSettings={setSettings} 
                  user={user}
                />
              )}

              {/* Display Tab - Basic */}
              {activeTab === 'display' && (
                <UserDisplayTab 
                  settings={settings} 
                  setSettings={setSettings}
                  toggleTheme={toggleTheme}
                  isDark={isDark}
                />
              )}

              {/* Notifications Tab - Simplified */}
              {activeTab === 'notifications' && (
                <UserNotificationsTab 
                  settings={settings} 
                  setSettings={setSettings}
                />
              )}

              {/* Save Button */}
              <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="flex justify-end space-x-3">
                  <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                    Annuler
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Sauvegarder
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

//==============================================================================
// Admin Tab Components - Full Featured
//==============================================================================

function AdminProfileTab({ settings, setSettings, handleSettingChange }) {
  const { user } = useAuth();
  
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Profil Administrateur
      </h2>
      
      <div className="space-y-6">
        <div className="flex items-center space-x-6">
          <div className="h-20 w-20 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg">
            <span className="text-2xl font-medium text-white">
              {user.email?.[0]?.toUpperCase()}
            </span>
          </div>
          <div>
            <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              Changer la photo
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              JPG, GIF ou PNG. Max 1MB.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nom d'affichage
            </label>
            <input
              type="text"
              value={settings.displayName}
              onChange={(e) => setSettings(prev => ({ ...prev, displayName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email (Admin)
            </label>
            <input
              type="email"
              value={settings.email}
              onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Admin notifications with more options */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Notifications d'administration
          </h3>
          <div className="space-y-4">
            {Object.entries(settings.notifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {key === 'email' && 'Notifications par email'}
                    {key === 'push' && 'Notifications push'}
                    {key === 'weekly' && 'Rapport hebdomadaire'}
                    {key === 'errors' && 'Alertes d\'erreur système'}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {key === 'errors' && 'Alertes critiques pour les erreurs API et système'}
                    {key === 'weekly' && 'Rapport automatique des métriques de la plateforme'}
                  </p>
                </div>
                <button
                  onClick={() => handleSettingChange('notifications', key, !value)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    value ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    value ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
// Admin API Tab - Full Featured (Admin Only)
function AdminAPITab({ settings, showApiKeys, setShowApiKeys, handleSettingChange }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Configuration des API - Administration
      </h2>
      
      <div className="space-y-6">
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-2xl mr-3">🔧</span>
            <div>
              <h3 className="font-medium text-green-900 dark:text-green-300 mb-1">
                Accès Administrateur aux API
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Configurez et gérez toutes les intégrations API de la plateforme. Ces paramètres affectent tous les utilisateurs.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Clé API INSEE (SIRENE) - Production
            </label>
            <div className="flex space-x-2">
              <input
                type={showApiKeys ? 'text' : 'password'}
                value={settings.apiKeys.insee}
                onChange={(e) => handleSettingChange('apiKeys', 'insee', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Votre clé API INSEE"
              />
              <button
                onClick={() => setShowApiKeys(!showApiKeys)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {showApiKeys ? '👁️' : '🙈'}
              </button>
              <button className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                🧪 Tester
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">
                Obtenez votre clé sur <a href="https://api.insee.fr" className="text-green-600 dark:text-green-400 hover:underline">api.insee.fr</a>
              </span>
              <span className="text-green-600 dark:text-green-400">✅ Connecté</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Clé API INPI (RNE) - Production
            </label>
            <div className="flex space-x-2">
              <input
                type={showApiKeys ? 'text' : 'password'}
                value={settings.apiKeys.inpi}
                onChange={(e) => handleSettingChange('apiKeys', 'inpi', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Votre clé API INPI"
              />
              <button
                onClick={() => setShowApiKeys(!showApiKeys)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {showApiKeys ? '👁️' : '🙈'}
              </button>
              <button className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                🧪 Tester
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">
                Créez un compte sur <a href="https://data.inpi.fr" className="text-green-600 dark:text-green-400 hover:underline">data.inpi.fr</a>
              </span>
              <span className="text-orange-600 dark:text-orange-400">⚠️ Non connecté</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API BODACC (Public)
            </label>
            <input
              type="text"
              value={settings.apiKeys.bodacc}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              API publique - aucune clé requise • ✅ Opérationnel
            </p>
          </div>
        </div>

        {/* Advanced API Configuration */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Configuration avancée des API
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Limite par seconde (Global)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.apiLimits.perSecond}
                  onChange={(e) => handleSettingChange('apiLimits', 'perSecond', parseInt(e.target.value))}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">appels/sec</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Limite par minute (Global)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={settings.apiLimits.perMinute}
                  onChange={(e) => handleSettingChange('apiLimits', 'perMinute', parseInt(e.target.value))}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">appels/min</span>
              </div>
            </div>
          </div>
          
          {/* API Status Dashboard */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">API INSEE</p>
                  <p className="text-xs text-green-600 dark:text-green-400">1,234 requêtes/jour</p>
                </div>
                <span className="text-green-500">✅</span>
              </div>
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-300">API INPI</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400">Configuration requise</p>
                </div>
                <span className="text-orange-500">⚠️</span>
              </div>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">API BODACC</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">876 requêtes/jour</p>
                </div>
                <span className="text-blue-500">✅</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Admin Data Management Tab - Full Featured (Admin Only)
function AdminDataTab({ settings, setSettings }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Gestion des données - Administration
      </h2>
      
      <div className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-2xl mr-3">🛠️</span>
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-1">
                Contrôle total des données
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Gérez la synchronisation, l'archivage et l'exportation des données pour toute la plateforme.
              </p>
            </div>
          </div>
        </div>

        {/* Data Sync Settings */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Synchronisation automatique
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Synchronisation automatique des données
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Met à jour automatiquement les données des entreprises depuis les API officielles
                </p>
              </div>
              <button
                onClick={() => setSettings(prev => ({ ...prev, autoSync: !prev.autoSync }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.autoSync ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.autoSync ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fréquence de synchronisation
              </label>
              <select
                value={settings.syncFrequency}
                onChange={(e) => setSettings(prev => ({ ...prev, syncFrequency: e.target.value }))}
                disabled={!settings.autoSync}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
              >
                <option value="hourly">Toutes les heures</option>
                <option value="daily">Quotidienne</option>
                <option value="weekly">Hebdomadaire</option>
                <option value="monthly">Mensuelle</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Retention */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Conservation et archivage
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Durée de conservation (jours)
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="30"
                max="2555"
                value={settings.dataRetention}
                onChange={(e) => setSettings(prev => ({ ...prev, dataRetention: parseInt(e.target.value) }))}
                className="flex-1"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[80px]">
                {settings.dataRetention} jours
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Les données plus anciennes seront automatiquement archivées
            </p>
          </div>
        </div>

        {/* Data Actions */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Actions sur les données
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button className="p-4 border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors text-left">
              <div className="text-2xl mb-2">📤</div>
              <h4 className="font-medium text-green-800 dark:text-green-300">Exporter tout</h4>
              <p className="text-sm text-green-600 dark:text-green-400">Exporter toutes les données en CSV/JSON</p>
            </button>
            
            <button className="p-4 border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-left">
              <div className="text-2xl mb-2">📥</div>
              <h4 className="font-medium text-blue-800 dark:text-blue-300">Importer données</h4>
              <p className="text-sm text-blue-600 dark:text-blue-400">Importer depuis fichiers CSV/Excel</p>
            </button>
            
            <button className="p-4 border-2 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/30 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors text-left">
              <div className="text-2xl mb-2">🔄</div>
              <h4 className="font-medium text-orange-800 dark:text-orange-300">Sync manuel</h4>
              <p className="text-sm text-orange-600 dark:text-orange-400">Forcer la synchronisation</p>
            </button>
            
            <button className="p-4 border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors text-left">
              <div className="text-2xl mb-2">📊</div>
              <h4 className="font-medium text-purple-800 dark:text-purple-300">Rapport qualité</h4>
              <p className="text-sm text-purple-600 dark:text-purple-400">Analyse de la qualité des données</p>
            </button>
            
            <button className="p-4 border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-900/50 transition-colors text-left">
              <div className="text-2xl mb-2">🗂️</div>
              <h4 className="font-medium text-gray-800 dark:text-gray-300">Archiver ancien</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Archiver données obsolètes</p>
            </button>
            
            <button className="p-4 border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors text-left">
              <div className="text-2xl mb-2">🗑️</div>
              <h4 className="font-medium text-red-800 dark:text-red-300">Purger données</h4>
              <p className="text-sm text-red-600 dark:text-red-400">Supprimer définitivement</p>
            </button>
          </div>
        </div>

        {/* Database Statistics */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Statistiques de la base de données
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">1,247</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Entreprises</div>
            </div>
            <div className="text-center p-4 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">8,943</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Documents</div>
            </div>
            <div className="text-center p-4 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">4.2GB</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Taille DB</div>
            </div>
            <div className="text-center p-4 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">99.8%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Uptime</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Admin Display Tab
function AdminDisplayTab({ settings, setSettings, toggleTheme, isDark }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Préférences d'affichage - Administration
      </h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Thème de l'interface
          </h3>
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{isDark ? '🌙' : '☀️'}</span>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mode {isDark ? 'sombre' : 'clair'}
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Changez l'apparence globale de l'interface
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isDark ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isDark ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Langue
            </label>
            <select
              value={settings.language}
              onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fuseau horaire
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
              <option value="Europe/London">Europe/London (UTC+0)</option>
              <option value="America/New_York">America/New_York (UTC-5)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Format de date
            </label>
            <select
              value={settings.dateFormat}
              onChange={(e) => setSettings(prev => ({ ...prev, dateFormat: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Devise
            </label>
            <select
              value={settings.currency}
              onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="EUR">Euro (€)</option>
              <option value="USD">US Dollar ($)</option>
              <option value="GBP">British Pound (£)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

// Admin Security Tab
function AdminSecurityTab() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Sécurité - Administration
      </h2>
      
      <div className="space-y-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-2xl mr-3">🔒</span>
            <div>
              <h3 className="font-medium text-yellow-900 dark:text-yellow-300 mb-1">
                Sécurité administrateur
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Gérez la sécurité globale de la plateforme et les accès utilisateurs.
              </p>
            </div>
          </div>
        </div>

        {/* Password Change */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Mot de passe administrateur
          </h3>
          <div className="space-y-4">
            <input
              type="password"
              placeholder="Mot de passe actuel"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <input
              type="password"
              placeholder="Nouveau mot de passe"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <input
              type="password"
              placeholder="Confirmer le nouveau mot de passe"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
              Mettre à jour le mot de passe
            </button>
          </div>
        </div>

        {/* 2FA Settings */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Authentification à deux facteurs
          </h3>
          <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  2FA activée pour l'admin
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Sécurité renforcée pour les comptes administrateur
                </p>
              </div>
              <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                ✅ Configurée
              </button>
            </div>
          </div>
        </div>

        {/* System Security */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Sécurité du système
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Logs de sécurité</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Surveillez les accès système</p>
              <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Voir les logs →
              </button>
            </div>
            <div className="p-4 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Sauvegarde</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Dernière sauvegarde: il y a 2h</p>
              <button className="text-sm text-green-600 dark:text-green-400 hover:underline">
                Créer sauvegarde →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Admin Users Management Tab
function AdminUsersTab() {
  const [users] = useState([
    { id: 1, name: 'Admin Principal', email: 'admin@datacorp.fr', role: 'admin', status: 'active', lastLogin: '2024-01-15' },
    { id: 2, name: 'Jean Dupont', email: 'jean.dupont@example.com', role: 'user', status: 'active', lastLogin: '2024-01-14' },
    { id: 3, name: 'Marie Martin', email: 'marie.martin@example.com', role: 'user', status: 'active', lastLogin: '2024-01-13' },
    { id: 4, name: 'Pierre Durand', email: 'pierre.durand@example.com', role: 'user', status: 'inactive', lastLogin: '2024-01-10' }
  ]);

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Gestion des utilisateurs
      </h2>
      
      <div className="space-y-6">
        <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-2xl mr-3">👥</span>
            <div>
              <h3 className="font-medium text-purple-900 dark:text-purple-300 mb-1">
                Gestion complète des utilisateurs
              </h3>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                Créez, modifiez et gérez les accès utilisateurs de la plateforme.
              </p>
            </div>
          </div>
        </div>

        {/* Add User Button */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Utilisateurs ({users.length})
          </h3>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            ➕ Ajouter utilisateur
          </button>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Dernière connexion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {user.name[0]}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'admin' 
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    }`}>
                      {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {user.status === 'active' ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(user.lastLogin).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 dark:text-blue-400 hover:underline">
                        Modifier
                      </button>
                      {user.role !== 'admin' && (
                        <button className="text-red-600 dark:text-red-400 hover:underline">
                          Supprimer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

//==============================================================================
// User-Only Tab Components - Simplified
//==============================================================================

// User Profile Tab - Simplified
function UserProfileTab({ settings, setSettings, user }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Mon Profil
      </h2>
      
      <div className="space-y-6">
        <div className="flex items-center space-x-6">
          <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
            <span className="text-xl font-medium text-white">
              {user.email?.[0]?.toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {user.displayName || user.email}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Compte utilisateur standard
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nom d'affichage
            </label>
            <input
              type="text"
              value={settings.displayName}
              onChange={(e) => setSettings(prev => ({ ...prev, displayName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={settings.email}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Contactez votre administrateur pour modifier votre email
            </p>
          </div>
        </div>

        {/* Basic account info */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
            Informations du compte
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Statut:</span>
              <span className="ml-2 text-green-600 dark:text-green-400 font-medium">Actif</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Type de compte:</span>
              <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">Utilisateur</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Membre depuis:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">Janvier 2024</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Dernière connexion:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">Aujourd'hui</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// User Display Tab - Basic Settings Only
function UserDisplayTab({ settings, setSettings, toggleTheme, isDark }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Préférences d'affichage
      </h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Thème
          </h3>
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{isDark ? '🌙' : '☀️'}</span>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mode {isDark ? 'sombre' : 'clair'}
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Changez l'apparence de l'interface
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isDark ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isDark ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Langue
            </label>
            <select
              value={settings.language}
              onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Format de date
            </label>
            <select
              value={settings.dateFormat}
              onChange={(e) => setSettings(prev => ({ ...prev, dateFormat: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
        </div>

        {/* Limited options notice */}
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-blue-500 mr-3 mt-0.5">ℹ️</span>
            <div>
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300">
                Options limitées
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                Les paramètres avancés comme le fuseau horaire et la devise sont configurés par l'administrateur.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// User Notifications Tab - Simplified
function UserNotificationsTab({ settings, setSettings }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Mes Notifications
      </h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Préférences de notification
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notifications par email
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Recevez des mises à jour importantes par email
                </p>
              </div>
              <button
                onClick={() => setSettings(prev => ({ 
                  ...prev, 
                  notifications: { ...prev.notifications, email: !prev.notifications.email }
                }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notifications.email ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.notifications.email ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rapport hebdomadaire
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Résumé hebdomadaire de votre activité
                </p>
              </div>
              <button
                onClick={() => setSettings(prev => ({ 
                  ...prev, 
                  notifications: { ...prev.notifications, weekly: !prev.notifications.weekly }
                }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notifications.weekly ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.notifications.weekly ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Notification examples */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Types de notifications
          </h3>
          <div className="space-y-3">
            <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-green-500 mr-3">✅</span>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Nouvelles fonctionnalités
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Informations sur les mises à jour de la plateforme
                </div>
              </div>
            </div>
            
            <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-blue-500 mr-3">📊</span>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Rapports d'activité
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Résumés de vos recherches et consultations
                </div>
              </div>
            </div>
            
            <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-orange-500 mr-3">🔔</span>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Maintenance système
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Notifications de maintenance planifiée
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact admin notice */}
        <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-orange-500 mr-3 mt-0.5">📞</span>
            <div>
              <h4 className="text-sm font-medium text-orange-900 dark:text-orange-300">
                Besoin d'aide ?
              </h4>
              <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                Pour des notifications personnalisées ou des questions sur votre compte, contactez votre administrateur.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
