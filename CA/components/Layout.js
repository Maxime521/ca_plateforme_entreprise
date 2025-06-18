// ===== components/Layout.js - COMPLETE FILE =====
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark, mounted, setLightMode, setDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Recherche', href: '/', icon: '🔍' },
    { name: 'Entreprises', href: '/companies', icon: '🏢' },
    { name: 'Documents', href: '/documents', icon: '📄' },
    { name: 'Analyses', href: '/analytics', icon: '📊' },
    { name: 'Paramètres', href: '/settings', icon: '⚙️' },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300`}>
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white dark:bg-[#1e293b] shadow-xl">
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-[#334155]">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">DataCorp</h1>
            <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100">
              ✕
            </button>
          </div>
          <SidebarContent navigation={navigation} user={user} logout={logout} toggleTheme={toggleTheme} isDark={isDark} setLightMode={setLightMode} setDarkMode={setDarkMode} mounted={mounted} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-[#1e293b] border-r border-gray-200 dark:border-[#334155]">
          <div className="flex h-16 items-center px-4 border-b border-gray-200 dark:border-[#334155]">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">DataCorp</h1>
          </div>
          <SidebarContent navigation={navigation} user={user} logout={logout} toggleTheme={toggleTheme} isDark={isDark} setLightMode={setLightMode} setDarkMode={setDarkMode} mounted={mounted} />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <div className="sticky top-0 z-10 flex h-16 bg-white dark:bg-[#1e293b] border-b border-gray-200 dark:border-[#334155] lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="px-4 text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500"
          >
            ☰
          </button>
          <div className="flex-1 flex justify-between items-center px-4">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">DataCorp</h1>
            <button
              onClick={() => {
                console.log('📱 Mobile theme button clicked');
                toggleTheme();
              }}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border-2 border-gray-300 dark:border-[#334155] rounded-lg hover:border-green-500 transition-all duration-200"
            >
              <span className="text-xl transition-transform duration-200 hover:scale-110">
                {isDark ? '☀️' : '🌙'}
              </span>
            </button>
          </div>
        </div>

        <main className="flex-1 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ navigation, user, logout, toggleTheme, isDark, setLightMode, setDarkMode, mounted }) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => (
          <a
            key={item.name}
            href={item.href}
            className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#334155] hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <span className="mr-3 text-lg">{item.icon}</span>
            {item.name}
          </a>
        ))}
      </nav>
      
      {/* Theme Toggle */}
      <div className="px-2 pb-4">
        <button
          onClick={() => {
            console.log('🖱️ Theme button clicked, current theme:', isDark ? 'dark' : 'light');
            toggleTheme();
          }}
          className="w-full flex items-center px-3 py-3 text-sm font-medium rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#334155] hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-200 border-2 border-gray-200 dark:border-[#334155] hover:border-green-500"
        >
          <span className="mr-3 text-xl transition-transform duration-200 hover:scale-110">
            {isDark ? '☀️' : '🌙'}
          </span>
          <span className="font-semibold">
            {isDark ? 'Mode clair' : 'Mode sombre'}
          </span>
        </button>
      </div>
      
      {user && (
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-[#334155] p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user.email?.[0]?.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                {user.displayName || user.email}
              </p>
              <button
                onClick={logout}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center mt-1"
              >
                🚪 Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
