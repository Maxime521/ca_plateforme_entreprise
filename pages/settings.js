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

// Admin Settings Component - CLEANED UP
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
        {/* Admin Header - CLEANED UP */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Paramètres Administrateur
          </h1>
          {/* REMOVED: Role badge from header */}
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
              
              {/* Profile Tab - CLEANED UP */}
              {activeTab === 'profile' && (
                <AdminProfileTab 
                  settings={settings} 
                  setSettings={setSettings} 
                  handleSettingChange={handleSettingChange} 
                  user={user}
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

// User Settings Component - CLEANED UP
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
        {/* User Header - CLEANED UP */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Mes Paramètres
          </h1>
          {/* REMOVED: Role badge from header */}
          <p className="text-gray-600 dark:text-gray-200">
            Personnalisez votre expérience utilisateur
          </p>
        </div>

        {/* COMPLETELY REMOVED: Notice for limited access */}

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
// Admin Tab Components - CLEANED UP
//==============================================================================

function AdminProfileTab({ settings, setSettings, handleSettingChange, user }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Profil Administrateur
      </h2>
      
      <div className="space-y-6">
        <div className="flex items-center space-x-6">
          {/* CLEANED UP: Only basic avatar without role indicator */}
          <div className="h-20 w-20 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
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
              Nom d&apos;affichage
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

        {/* Admin notifications with more options */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Notifications d&apos;administration
          </h3>
          <div className="space-y-4">
            {Object.entries(settings.notifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {key === 'email' && 'Notifications par email'}
                    {key === 'push' && 'Notifications push'}
                    {key === 'weekly' && 'Rapport hebdomadaire'}
                    {key === 'errors' && 'Alertes d&apos;erreur syst&egrave;me'}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {key === 'errors' && 'Alertes critiques pour les erreurs API et syst&egrave;me'}
                    {key === 'weekly' && 'Rapport automatique des m&eacute;triques de la plateforme'}
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

// Other admin components remain the same but with cleaned up user icons...
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

        {/* API Configuration continues... */}
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
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminDataTab({ settings, setSettings }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Gestion des données - Administration
      </h2>
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <div className="flex items-start">
          <span className="text-2xl mr-3">🛠️</span>
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-1">
              Contrôle total des données
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Gérez la synchronisation, l&apos;archivage et l&apos;exportation des données pour toute la plateforme.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminDisplayTab({ settings, setSettings, toggleTheme, isDark }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Préférences d&apos;affichage - Administration
      </h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Thème de l&apos;interface
          </h3>
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{isDark ? '🌙' : '☀️'}</span>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mode {isDark ? 'sombre' : 'clair'}
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Changez l&apos;apparence globale de l&apos;interface
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
      </div>
    </div>
  );
}

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
      </div>
    </div>
  );
}

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

        {/* Users Table - CLEANED UP */}
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
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {/* CLEANED UP: Simple avatar without role indicators */}
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
                      {user.role === 'admin' ? 'Admin' : 'User'}
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
// User-Only Tab Components - CLEANED UP
//==============================================================================

function UserProfileTab({ settings, setSettings, user }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Mon Profil
      </h2>
      
      <div className="space-y-6">
        <div className="flex items-center space-x-6">
          {/* CLEANED UP: Simple avatar without role indicators */}
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
              Nom d&apos;affichage
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
      </div>
    </div>
  );
}

function UserDisplayTab({ settings, setSettings, toggleTheme, isDark }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Préférences d&apos;affichage
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
                  Changez l&apos;apparence de l&apos;interface
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
      </div>
    </div>
  );
}

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
          </div>
        </div>
      </div>
    </div>
  );
}
