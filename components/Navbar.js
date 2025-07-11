// components/Navbar.js - Simplified Navbar (No Firebase Required)
import { useState } from 'react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/router'
import {
  Building2,
  Sun,
  Moon,
  User,
  LogOut,
  Menu,
  X,
  Search,
  BarChart3,
  ChevronDown
} from 'lucide-react'

export default function Navbar() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  // Mock user for demo - replace with real auth later
  const user = null // Set to null for now, or { email: 'demo@example.com' } for testing

  const navigation = [
    { name: 'Recherche', href: '/', icon: Search },
    { name: 'Tableau de bord', href: '/dashboard', icon: BarChart3 },
  ]

  const handleLogout = async () => {
    try {
      // Mock logout - replace with real logout later
      console.log('Logout clicked')
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div
            className="flex items-center cursor-pointer group animate-fade-in"
            onClick={() => router.push('/')}
          >
            <div className="relative flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-800 rounded-xl mr-3 shadow-lg group-hover:shadow-xl transition-all duration-300">
              <Building2 className="h-5 w-5 text-white" />
              <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-neutral-900 dark:text-white">
                Plateforme Entreprise
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 -mt-1">
                Données officielles
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {user && navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 ${
                  router.pathname === item.href
                    ? 'text-primary-700 bg-primary-50 dark:bg-primary-900/20 dark:text-primary-400 shadow-sm'
                    : 'text-neutral-700 dark:text-neutral-300 hover:text-primary-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:hover:text-primary-400'
                }`}
              >
                <item.icon className="h-4 w-4 mr-2" />
                {item.name}
              </a>
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200 hover:scale-105"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            {/* User Menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200 hover:scale-105"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-800 rounded-full flex items-center justify-center shadow-md">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-medium text-neutral-900 dark:text-white truncate max-w-32">
                      {user.email}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      Compte
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-neutral-500" />
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 py-2 z-50 animate-scale-in">
                    <div className="px-4 py-2 border-b border-neutral-100 dark:border-neutral-700">
                      <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                        {user.email}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Utilisateur connecté
                      </p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-accent-600 dark:text-accent-400 hover:bg-accent-50 dark:hover:bg-accent-900/20 transition-colors duration-200"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-2 rounded-lg font-medium hover:from-primary-700 hover:to-primary-800 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105"
              >
                Connexion
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200 hover:scale-105"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-neutral-200 dark:border-neutral-700 py-4 animate-slide-down">
            {user && navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 mb-1 hover:scale-105 ${
                  router.pathname === item.href
                    ? 'text-primary-700 bg-primary-50 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'text-neutral-700 dark:text-neutral-300 hover:text-primary-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                <item.icon className="h-4 w-4 mr-3" />
                {item.name}
              </a>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
