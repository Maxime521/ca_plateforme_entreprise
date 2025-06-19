import { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

export default function Settings() {
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
      daily: 1000,
      monthly: 25000
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

  const tabs = [
    { id: 'profile', name: 'Profil', icon: '👤' },
    { id: 'api', name: 'API & Intégrations', icon: '🔌' },
    { id: 'data', name: 'Données', icon: '💾' },
    { id: 'display', name: 'Affichage', icon: '🎨' },
    { id: 'security', name: 'Sécurité', icon: '🔒' }
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
    // Here you would typically save to your backend
    alert('Paramètres sauvegardés avec succès!');
  };

  if (!user) {
    return <div>Accès non autorisé</div>;
  }

  return (
    <Layout>
      <div className="py-8 px-4 sm:px-6 lg:px-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Paramètres
            </h1>
            <p className="text-gray-600 dark:text-gray-200">
              Configurez votre compte et vos préférences
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <div className="lg:w-64 flex-shrink-0">
              <nav className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <ul className="space-y-2">
                  {tabs.map((tab) => (
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

            {/* Main Content */}
            <div className="flex-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                      Informations du profil
                    </h2>
                    
                    <div className="space-y-6">
                      <div className="flex items-center space-x-6">
                        <div className="h-20 w-20 rounded-full bg-green-600 flex items-center justify-center">
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
                            Email
                          </label>
                          <input
                            type="email"
                            value={settings.email}
                            onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                          Préférences de notification
                        </h3>
                        <div className="space-y-4">
                          {Object.entries(settings.notifications).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between">
                              <div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {key === 'email' && 'Notifications par email'}
                                  {key === 'push' && 'Notifications push'}
                                  {key === 'weekly' && 'Rapport hebdomadaire'}
                                  {key === 'errors' && 'Alertes d\'erreur'}
                                </span>
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
                )}

                {/* API Tab */}
                {activeTab === 'api' && (
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                      Configuration des API
                    </h2>
                    
                    <div className="space-y-6">
                      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                        <div className="flex items-start">
                          <span className="text-2xl mr-3">ℹ️</span>
                          <div>
                            <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-1">
                              Configuration des clés API
                            </h3>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              Configurez vos clés d'accès aux APIs gouvernementales françaises pour accéder aux données officielles.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Clé API INSEE (SIRENE)
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
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Obtenez votre clé sur <a href="https://api.insee.fr" className="text-green-600 dark:text-green-400 hover:underline">api.insee.fr</a>
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Clé API INPI (RNE)
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
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Créez un compte sur <a href="https://data.inpi.fr" className="text-green-600 dark:text-green-400 hover:underline">data.inpi.fr</a>
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            API BODACC
                          </label>
                          <input
                            type="text"
                            value={settings.apiKeys.bodacc}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            API publique - aucune clé requise
                          </p>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                          Limites d'utilisation
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Limite quotidienne
                            </label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                value={settings.apiLimits.daily}
                                onChange={(e) => handleSettingChange('apiLimits', 'daily', parseInt(e.target.value))}
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                              <span className="text-sm text-gray-500 dark:text-gray-400">appels/jour</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Limite mensuelle
                            </label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                value={settings.apiLimits.monthly}
                                onChange={(e) => handleSettingChange('apiLimits', 'monthly', parseInt(e.target.value))}
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                              <span className="text-sm text-gray-500 dark:text-gray-400">appels/mois</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Data Tab */}
                {activeTab === 'data' && (
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                      Gestion des données
                    </h2>
                    
                    <div className="space-y-6">
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
                                Met à jour automatiquement les données des entreprises
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

                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                          Conservation des données
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
                            <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[60px]">
                              {settings.dataRetention} jours
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Les données plus anciennes seront automatiquement archivées
                          </p>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                          Actions sur les données
                        </h3>
                        <div className="space-y-3">
                          <button className="w-full sm:w-auto px-4 py-2 border border-green-600 text-green-600 dark:text-green-400 rounded-md hover:bg-green-50 dark:hover:bg-green-900/30">
                            📤 Exporter toutes les données
                          </button>
                          <button className="w-full sm:w-auto px-4 py-2 border border-blue-600 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 ml-0 sm:ml-3">
                            📥 Importer données
                          </button>
                          <button className="w-full sm:w-auto px-4 py-2 border border-red-600 text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 ml-0 sm:ml-3">
                            🗑️ Purger les données anciennes
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Display Tab */}
                {activeTab === 'display' && (
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
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                      Sécurité
                    </h2>
                    
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                          Mot de passe
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Mot de passe actuel
                            </label>
                            <input
                              type="password"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              placeholder="Entrez votre mot de passe actuel"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Nouveau mot de passe
                            </label>
                            <input
                              type="password"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              placeholder="Entrez un nouveau mot de passe"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Confirmer le nouveau mot de passe
                            </label>
                            <input
                              type="password"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              placeholder="Confirmez votre nouveau mot de passe"
                            />
                          </div>
                          <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                            Mettre à jour le mot de passe
                          </button>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                          Authentification à deux facteurs
                        </h3>
                        <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                2FA désactivée
                              </span>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Ajoutez une couche de sécurité supplémentaire
                              </p>
                            </div>
                            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                              Activer 2FA
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                          Sessions actives
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">💻</span>
                              <div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Chrome sur Windows
                                </span>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  Session actuelle • Paris, France
                                </p>
                              </div>
                            </div>
                            <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                              Actuelle
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">📱</span>
                              <div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Safari sur iPhone
                                </span>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  Il y a 2 heures • Paris, France
                                </p>
                              </div>
                            </div>
                            <button className="text-sm text-red-600 dark:text-red-400 hover:underline">
                              Déconnecter
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                          Zone de danger
                        </h3>
                        <div className="p-4 border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-medium text-red-900 dark:text-red-300">
                                Supprimer le compte
                              </h4>
                              <p className="text-sm text-red-700 dark:text-red-300">
                                Cette action est irréversible. Toutes vos données seront définitivement supprimées.
                              </p>
                            </div>
                            <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                              Supprimer mon compte
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
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
    </Layout>
  );
}
