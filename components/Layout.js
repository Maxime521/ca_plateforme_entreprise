// components/Layout.js - Role-Based Layout System
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { getNavigationForRole, canAccessFeature, FEATURES } from '../utils/rolePermissions';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Layout({ children }) {
  const { user, logout, userRole, isAdmin, canAccessFeature: userCanAccessFeature } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Get role-based navigation
  const navigation = getNavigationForRole(userRole);

  // Role-based page access control
  useEffect(() => {
    if (mounted && user) {
      const currentPath = router.pathname;
      
      // Check if current page requires admin access
      const adminOnlyPaths = ['/analytics', '/documents'];
      const settingsPath = '/settings';
      
      if (adminOnlyPaths.includes(currentPath) && !isAdmin()) {
        router.push('/');
      }
    }
  }, [mounted, user, userRole, router]);

  if (!mounted) {
    return <div className="min-h-screen bg-gray-50 dark:bg-dark-bg" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-primary-50/30 to-secondary-50 dark:from-dark-bg dark:via-dark-surface dark:to-dark-card transition-colors duration-300">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" 
            onClick={() => setSidebarOpen(false)} 
          />
          <div className="fixed inset-y-0 left-0 flex w-80 flex-col bg-white dark:bg-dark-surface shadow-2xl">
            <SidebarContent 
              navigation={navigation} 
              user={user} 
              userRole={userRole}
              isAdmin={isAdmin()}
              logout={logout} 
              toggleTheme={toggleTheme} 
              isDark={isDark} 
              onClose={() => setSidebarOpen(false)}
              currentPath={router.pathname}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-80 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-dark-border/50">
          <SidebarContent 
            navigation={navigation} 
            user={user}
            userRole={userRole}
            isAdmin={isAdmin()}
            logout={logout} 
            toggleTheme={toggleTheme} 
            isDark={isDark}
            currentPath={router.pathname}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-80 flex flex-col flex-1">
        {/* Mobile header */}
        <div className="sticky top-0 z-40 flex h-20 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-border/50 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="px-6 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div className="flex-1 flex justify-between items-center px-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">DC</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white ml-3">DataCorp</h1>
              {/* Role indicator for mobile */}
              <RoleBadge role={userRole} size="sm" className="ml-3" />
            </div>
            
            <button
              onClick={toggleTheme}
              className="p-3 rounded-xl bg-gray-100 dark:bg-dark-card hover:bg-gray-200 dark:hover:bg-dark-border transition-all duration-200 hover:scale-105"
            >
              <span className="text-xl">
                {isDark ? '☀️' : '🌙'}
              </span>
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ navigation, user, userRole, isAdmin, logout, toggleTheme, isDark, onClose, currentPath }) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Logo and header */}
      <div className="flex h-20 items-center px-6 border-b border-gray-200/50 dark:border-dark-border/50">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold">DC</span>
          </div>
          <div className="ml-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">DataCorp</h1>
            <div className="flex items-center space-x-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Enterprise Platform</p>
              <RoleBadge role={userRole} size="xs" />
            </div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 lg:hidden"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Role-specific feature notice */}
      {!isAdmin && (
        <div className="mx-4 my-3 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl">
          <div className="flex items-center">
            <span className="text-blue-500 mr-2">👤</span>
            <div>
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Mode Utilisateur</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Accès limité aux fonctionnalités de base</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-2 px-4 py-6">
        {navigation.map((item) => {
          const isActive = currentPath === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-card hover:text-primary-600 dark:hover:text-primary-400'
              }`}
              onClick={onClose}
            >
              <span className="text-xl mr-4 transition-transform group-hover:scale-110">
                {item.icon}
              </span>
              <div className="flex-1">
                <div className="font-medium">{item.name}</div>
                <div className={`text-xs ${isActive ? 'text-primary-100' : 'text-gray-500 dark:text-gray-400'}`}>
                  {item.description}
                </div>
              </div>
              {isActive && (
                <div className="w-2 h-2 bg-white rounded-full opacity-75"></div>
              )}
            </Link>
          );
        })}
      </nav>
      
      {/* Theme toggle */}
      <div className="px-4 pb-4">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-card transition-all duration-200 border border-gray-200 dark:border-dark-border hover:border-primary-300 dark:hover:border-primary-600"
        >
          <span className="text-xl mr-4 transition-transform hover:scale-110">
            {isDark ? '☀️' : '🌙'}
          </span>
          <span className="font-medium">
            {isDark ? 'Mode clair' : 'Mode sombre'}
          </span>
        </button>
      </div>
      
      {/* User profile */}
      {user && (
        <div className="border-t border-gray-200/50 dark:border-dark-border/50 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 relative">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                <span className="text-lg font-medium text-white">
                  {user.email?.[0]?.toUpperCase()}
                </span>
              </div>
              {/* Role indicator on avatar */}
              {isAdmin && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                  <span className="text-xs">👑</span>
                </div>
              )}
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                {user.displayName || user.email}
              </p>
              <div className="flex items-center space-x-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </p>
                <RoleBadge role={userRole} size="xs" />
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-500 dark:text-gray-300 dark:hover:text-red-400 transition-colors"
              title="Déconnexion"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Role Badge Component
function RoleBadge({ role, size = 'sm', className = '' }) {
  const isAdmin = role === 'admin';
  
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm'
  };

  return (
    <span className={`
      inline-flex items-center rounded-full font-medium
      ${sizeClasses[size]}
      ${isAdmin 
        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800' 
        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
      }
      ${className}
    `}>
      {isAdmin ? (
        <>
          <span className="mr-1">👑</span>
          Admin
        </>
      ) : (
        <>
          <span className="mr-1">👤</span>
          User
        </>
      )}
    </span>
  );
}
