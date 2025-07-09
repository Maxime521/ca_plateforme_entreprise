import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { DocumentCartProvider } from '../hooks/useDocumentCart';
import { getNavigationForRole, canAccessFeature, FEATURES } from '../utils/rolePermissions';
import DocumentCartIcon from './DocumentCartIcon';
import DocumentCartSidebar from './DocumentCartSidebar';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useDocumentCart } from '../hooks/useDocumentCart';
import UserProfileManager from './UserProfileManager';


export default function Layout({ children }) {
  const { user, logout, userRole, isAdmin, canAccessFeature: userCanAccessFeature } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    
    // Load sidebar state from localStorage
    if (typeof window !== 'undefined') {
      try {
        const savedSidebarState = localStorage.getItem('sidebar-expanded');
        if (savedSidebarState !== null) {
          setSidebarExpanded(JSON.parse(savedSidebarState));
        }
      } catch (error) {
        console.error('Error loading sidebar state:', error);
      }
    }
  }, []);

  // Save sidebar state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && mounted) {
      try {
        localStorage.setItem('sidebar-expanded', JSON.stringify(sidebarExpanded));
      } catch (error) {
        console.error('Error saving sidebar state:', error);
      }
    }
  }, [sidebarExpanded, mounted]);

  // Get role-based navigation
  const navigation = getNavigationForRole(userRole);

  // Role-based page access control
  useEffect(() => {
    if (mounted && user) {
      const currentPath = router.pathname;
      
      // Check if current page requires admin access
      const adminOnlyPaths = ['/analytics'];
      
      if (adminOnlyPaths.includes(currentPath) && !isAdmin()) {
        router.push('/');
      }
    }
  }, [mounted, user, userRole, router, isAdmin]);

  if (!mounted) {
    return <div className="min-h-screen bg-gray-50 dark:bg-dark-bg" />;
  }

  return (
    <DocumentCartProvider>
      <LayoutWithCartProvider>{children}</LayoutWithCartProvider>
    </DocumentCartProvider>
  );
}

function LayoutWithCartProvider({ children }) {
  const { user, logout, userRole, isAdmin, canAccessFeature: userCanAccessFeature } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { isOpen: cartSidebarOpen } = useDocumentCart();

  useEffect(() => {
    setMounted(true);
    
    // Load sidebar state from localStorage
    if (typeof window !== 'undefined') {
      try {
        const savedSidebarState = localStorage.getItem('sidebar-expanded');
        if (savedSidebarState !== null) {
          setSidebarExpanded(JSON.parse(savedSidebarState));
        }
      } catch (error) {
        console.error('Error loading sidebar state:', error);
      }
    }
  }, []);

  // Save sidebar state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && mounted) {
      try {
        localStorage.setItem('sidebar-expanded', JSON.stringify(sidebarExpanded));
      } catch (error) {
        console.error('Error saving sidebar state:', error);
      }
    }
  }, [sidebarExpanded, mounted]);

  // Get role-based navigation
  const navigation = getNavigationForRole(userRole);

  // Role-based page access control
  useEffect(() => {
    if (mounted && user) {
      const currentPath = router.pathname;
      
      // Check if current page requires admin access
      const adminOnlyPaths = ['/analytics'];
      
      if (adminOnlyPaths.includes(currentPath) && !isAdmin()) {
        router.push('/');
      }
    }
  }, [mounted, user, userRole, router, isAdmin]);

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
              expanded={true}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar - NOW EXPANDABLE */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ${
        sidebarExpanded ? 'lg:w-80' : 'lg:w-20'
      }`}>
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
            expanded={sidebarExpanded}
            onToggleExpanded={() => setSidebarExpanded(!sidebarExpanded)}
          />
        </div>
      </div>

      {/* Main content - ADJUSTED for expandable sidebar */}
      <div className={`lg:flex lg:flex-col lg:flex-1 transition-all duration-300 ${
        sidebarExpanded ? 'lg:pl-80' : 'lg:pl-20'
      }`}>
        
        {/* Mobile header with FIXED cart positioning */}
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
            </div>
            
            {/* FIXED: Cart in top right corner for mobile */}
            <div className="flex items-center space-x-3">
              <DocumentCartIcon />
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative">
          {children}
        </main>
      </div>

      {/* Document Cart Sidebar */}
      <DocumentCartSidebar />
      
      {/* Floating Controls for Desktop - hidden when cart sidebar is open */}
      {!cartSidebarOpen && (
        <div className="hidden lg:flex fixed top-8 right-8 z-50 flex-col items-end gap-4">
          {/* Theme Toggle on top */}
          {/* Cart Icon below */}
        </div>
      )}
    </div>
  );
}

function SidebarContent({ navigation, user, userRole, isAdmin, logout, toggleTheme, isDark, onClose, currentPath, expanded = true, onToggleExpanded }) {
  return (
    <div className="flex flex-col h-full">
      
      {/* Logo and header - Fixed height */}
      <div className="flex-shrink-0 flex h-20 items-center px-6 border-b border-gray-200/50 dark:border-dark-border/50">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold">DC</span>
          </div>
          {expanded && (
            <div className="ml-3">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">DataCorp</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Enterprise Platform</p>
            </div>
          )}
        </div>
        
        {/* Toggle button for desktop */}
        {!onClose && onToggleExpanded && (
          <button
            onClick={onToggleExpanded}
            className="ml-auto p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card transition-all duration-200"
            title={expanded ? "Réduire la sidebar" : "Étendre la sidebar"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {expanded ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              )}
            </svg>
          </button>
        )}
      </div>

      {/* Navigation - Scrollable area, no x-scroll */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 space-y-2">
        {navigation.map((item) => {
          const isActive = currentPath === item.href;
          return (
            <div className="relative group" key={item.name}>
              <Link
                href={item.href}
                className={`flex items-center ${expanded ? 'px-4' : 'justify-center'} py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-card hover:text-primary-600 dark:hover:text-primary-400'
                }`}
                onClick={onClose}
                title={!expanded ? item.name : undefined}
              >
                <span className={`text-xl transition-transform group-hover:scale-110 ${!expanded ? 'mx-auto' : ''}`}>{item.icon}</span>
                {expanded && (
                  <>
                    <div className="flex-1 ml-4">
                      <div className="font-medium">{item.name}</div>
                      <div className={`text-xs ${isActive ? 'text-primary-100' : 'text-gray-500 dark:text-gray-400'}`}>{item.description}</div>
                    </div>
                    {isActive && <div className="w-2 h-2 bg-white rounded-full opacity-75"></div>}
                  </>
                )}
              </Link>
              {/* Tooltip for collapsed sidebar */}
              {!expanded && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200">
                  <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                    {item.name}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>
      {/* Bottom section - Fixed height */}
      <div className="flex-shrink-0 px-4 pb-4 space-y-3">
        {/* Cart section */}
        <div className="flex justify-center">
          <div className={`flex items-center space-x-2 px-4 py-2 bg-gray-50 dark:bg-dark-card rounded-xl ${!expanded ? 'justify-center' : ''}`}>            <DocumentCartIcon />
            {expanded && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Documents</span>}
          </div>
        </div>
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-card transition-all duration-200 border border-gray-200 dark:border-dark-border hover:border-primary-300 dark:hover:border-primary-600 ${!expanded ? 'justify-center' : ''}`}
          title={!expanded ? (isDark ? 'Mode clair' : 'Mode sombre') : undefined}
        >
          <span className="text-xl transition-transform hover:scale-110">{isDark ? '☀️' : '🌙'}</span>
          {expanded && <span className="font-medium ml-4">{isDark ? 'Mode clair' : 'Mode sombre'}</span>}
        </button>
      </div>
      {/* User profile - Fixed height */}
      {user && (
        <div className="flex-shrink-0 border-t border-gray-200/50 dark:border-dark-border/50 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 relative">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                <span className="text-lg font-medium text-white">{user.email?.[0]?.toUpperCase()}</span>
              </div>
              {/* ADDED: Admin crown icon */}
              {isAdmin && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white dark:border-dark-surface">
                  <span className="text-xs">👑</span>
                </div>
              )}
            </div>
            {expanded && (
              <UserProfileManager user={user}>
                <div className="ml-3 flex-1 min-w-0 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md p-1 -m-1 transition-colors" title="Click to edit profile">
                  {/* User Name - Shows database display name or falls back to email */}
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {user.displayName || user.email}
                  </p>
                  {/* Email and Admin Badge */}
                  <div className="flex items-center space-x-2 mt-0.5">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                    {/* Admin text indicator */}
                    {isAdmin && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 px-1.5 py-0.5 rounded-md font-medium flex-shrink-0">
                        Admin
                      </span>
                    )}
                  </div>
                  {/* Edit hint */}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to edit
                  </p>
                </div>
              </UserProfileManager>
            )}
            <button
              onClick={logout}
              className={`p-2 text-gray-400 hover:text-red-500 dark:text-gray-300 dark:hover:text-red-400 transition-colors flex-shrink-0 ${!expanded ? 'ml-auto' : ''}`}
              title={!expanded ? "Déconnexion" : undefined}
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