// components/Layout.js - Simplified Layout (No Firebase Required)
import Navbar from './Navbar'
import { useRouter } from 'next/router'

export default function Layout({ children, requireAuth = false }) {
  const router = useRouter()

  // For now, we'll skip authentication requirement
  // You can enable this later when Firebase is set up
  
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 transition-colors duration-300">
      <Navbar />
      <main className="relative">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg mr-3">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 114 0 2 2 0 01-4 0zm8-2a2 2 0 100 4 2 2 0 000-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-neutral-900 dark:text-white">
                  Plateforme Entreprise
                </span>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4 max-w-md">
                Plateforme d'intelligence économique alimentée par les données officielles françaises.
              </p>
              <div className="flex space-x-4 text-sm text-neutral-500 dark:text-neutral-400">
                <span>API SIRENE</span>
                <span>•</span>
                <span>RNE INPI</span>
                <span>•</span>
                <span>BODACC</span>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">
                Plateforme
              </h3>
              <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                <li><a href="/" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Recherche</a></li>
                <li><a href="/dashboard" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Tableau de bord</a></li>
                <li><a href="/api" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">
                Support
              </h3>
              <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                <li><a href="/help" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Centre d'aide</a></li>
                <li><a href="/contact" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Contact</a></li>
                <li><a href="/privacy" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Confidentialité</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-neutral-200 dark:border-neutral-800 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              © 2025 Plateforme Entreprise. Tous droits réservés.
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 sm:mt-0">
              Données certifiées par l'État français
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
