//==============================================================================
// utils/rolePermissions.js - FIXED COMPLETE VERSION
//==============================================================================

// Define role-based permissions
export const ROLES = {
  ADMIN: 'admin',
  USER: 'user'
};

export const PERMISSIONS = {
  // Search permissions
  SEARCH_BASIC: 'search_basic',
  SEARCH_ADVANCED: 'search_advanced',
  
  // API permissions
  API_VIEW: 'api_view',
  API_CONFIGURE: 'api_configure',
  API_TEST: 'api_test',
  
  // Data permissions
  DATA_VIEW: 'data_view',
  DATA_EXPORT: 'data_export',
  DATA_IMPORT: 'data_import',
  DATA_DELETE: 'data_delete',
  
  // Analytics permissions
  ANALYTICS_VIEW: 'analytics_view',
  ANALYTICS_EXPORT: 'analytics_export',
  
  // User management
  USER_MANAGE: 'user_manage',
  ROLE_ASSIGN: 'role_assign'
};

export const FEATURES = {
  SEARCH: 'search',
  COMPANIES: 'companies',
  DOCUMENTS: 'documents', // Now available for users too
  ANALYTICS: 'analytics',
  SETTINGS: 'settings',
  API_SETTINGS: 'api_settings',
  DATA_MANAGEMENT: 'data_management',
  USER_MANAGEMENT: 'user_management'
};

// Role-based feature access
export const getRolePermissions = (role) => {
  switch (role) {
    case ROLES.ADMIN:
      return {
        features: Object.values(FEATURES), // Admin gets everything
        permissions: Object.values(PERMISSIONS)
      };
    
    case ROLES.USER:
    default:
      return {
        features: [
          FEATURES.SEARCH,
          FEATURES.COMPANIES,
          FEATURES.DOCUMENTS, // ✅ RESTORED for users
          FEATURES.SETTINGS // Limited settings
        ],
        permissions: [
          PERMISSIONS.SEARCH_BASIC,
          PERMISSIONS.DATA_VIEW
        ]
      };
  }
};

// ✅ FIXED: Check if user can access a feature
export const canAccessFeature = (userRole, feature) => {
  const rolePermissions = getRolePermissions(userRole);
  return rolePermissions.features.includes(feature);
};

// ✅ FIXED: Check if user has a specific permission
export const hasPermission = (userRole, permission) => {
  const rolePermissions = getRolePermissions(userRole);
  return rolePermissions.permissions.includes(permission);
};

// ✅ FIXED: Get filtered navigation items based on role
export const getNavigationForRole = (userRole) => {
  const baseNavigation = [
    { 
      name: 'Recherche', 
      href: '/', 
      icon: '🔍',
      description: 'Rechercher des entreprises',
      feature: FEATURES.SEARCH
    },
    { 
      name: 'Entreprises', 
      href: '/companies', 
      icon: '🏢',
      description: 'Base de données',
      feature: FEATURES.COMPANIES
    },
    { 
      name: 'Documents', // ✅ RESTORED for users
      href: '/documents', 
      icon: '📄',
      description: 'Documents officiels',
      feature: FEATURES.DOCUMENTS
    },
    { 
      name: 'Analyses', 
      href: '/analytics', 
      icon: '📊',
      description: 'Tableaux de bord',
      feature: FEATURES.ANALYTICS
    },
    { 
      name: 'Paramètres', 
      href: '/settings', 
      icon: '⚙️',
      description: 'Configuration',
      feature: FEATURES.SETTINGS
    }
  ];

  // ✅ FIXED: Use the canAccessFeature function correctly
  return baseNavigation.filter(item => 
    canAccessFeature(userRole, item.feature)
  );
};

// Additional utility functions
export const isAdmin = (userRole) => userRole === ROLES.ADMIN;
export const isUser = (userRole) => userRole === ROLES.USER;

// Get user-friendly role name
export const getRoleName = (role) => {
  switch (role) {
    case ROLES.ADMIN:
      return 'Administrateur';
    case ROLES.USER:
      return 'Utilisateur';
    default:
      return 'Inconnu';
  }
};

// Get role color for UI
export const getRoleColor = (role) => {
  switch (role) {
    case ROLES.ADMIN:
      return {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        text: 'text-yellow-800 dark:text-yellow-300',
        border: 'border-yellow-200 dark:border-yellow-800'
      };
    case ROLES.USER:
      return {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-800 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800'
      };
    default:
      return {
        bg: 'bg-gray-100 dark:bg-gray-900/30',
        text: 'text-gray-800 dark:text-gray-300',
        border: 'border-gray-200 dark:border-gray-800'
      };
  }
};

// Feature descriptions for UI
export const getFeatureDescription = (feature) => {
  const descriptions = {
    [FEATURES.SEARCH]: 'Recherche d\'entreprises dans les bases officielles',
    [FEATURES.COMPANIES]: 'Consultation de la base de données d\'entreprises',
    [FEATURES.DOCUMENTS]: 'Accès aux documents officiels et publications',
    [FEATURES.ANALYTICS]: 'Tableaux de bord et analyses avancées',
    [FEATURES.SETTINGS]: 'Configuration du compte et préférences',
    [FEATURES.API_SETTINGS]: 'Configuration des intégrations API',
    [FEATURES.DATA_MANAGEMENT]: 'Gestion et synchronisation des données',
    [FEATURES.USER_MANAGEMENT]: 'Administration des utilisateurs'
  };
  return descriptions[feature] || 'Fonctionnalité';
};

// Check what features a user is missing (for upgrade suggestions)
export const getMissingFeatures = (userRole) => {
  const userFeatures = getRolePermissions(userRole).features;
  const allFeatures = Object.values(FEATURES);
  return allFeatures.filter(feature => !userFeatures.includes(feature));
};

// Get upgrade suggestions for users
export const getUpgradeSuggestions = (userRole) => {
  if (userRole === ROLES.ADMIN) return [];
  
  const missingFeatures = getMissingFeatures(userRole);
  return missingFeatures.map(feature => ({
    feature,
    description: getFeatureDescription(feature),
    requiredRole: ROLES.ADMIN
  }));
};
