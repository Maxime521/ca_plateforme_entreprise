// pages/index.js - Professional Homepage
import { useState } from 'react'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'
import {
  Search,
  Building2,
  FileText,
  BarChart3,
  TrendingUp,
  Shield,
  Zap,
  Globe,
  ArrowRight,
  CheckCircle,
  Database,
  Users,
  Clock
} from 'lucide-react'
import Layout from '../components/Layout'
import SearchForm from '../components/SearchForm'
import CompanyList from '../components/CompanyList'

export default function Home() {
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  const handleSearch = async (query) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      if (!response.ok) throw new Error('Erreur de recherche')
      
      const data = await response.json()
      setSearchResults(data.companies || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCompanySelect = (siren) => {
    router.push(`/entreprise/${siren}`)
  }

  const features = [
    {
      icon: Search,
      title: 'Recherche Intelligence',
      description: 'Recherchez par SIREN, dénomination sociale ou adresse avec IA prédictive intégrée',
      color: 'from-primary-600 to-primary-800',
      stats: '2M+ entreprises'
    },
    {
      icon: FileText,
      title: 'Documents Certifiés',
      description: 'Accédez aux bilans, statuts et publications BODACC avec authentification blockchain',
      color: 'from-neutral-700 to-neutral-900',
      stats: '50K+ documents'
    },
    {
      icon: BarChart3,
      title: 'Analytics Avancés',
      description: 'Tableaux de bord interactifs avec ML pour prédictions sectorielles et trends',
      color: 'from-primary-600 to-primary-800',
      stats: 'Temps réel'
    },
    {
      icon: TrendingUp,
      title: 'Données Live',
      description: 'Stream de données en temps réel via WebSockets et cache distribué Redis',
      color: 'from-accent-600 to-accent-800',
      stats: '< 100ms'
    },
    {
      icon: Shield,
      title: 'Sécurité Enterprise',
      description: 'OAuth 2.0, chiffrement AES-256, conformité RGPD et audit trail complet',
      color: 'from-neutral-700 to-neutral-900',
      stats: 'ISO 27001'
    },
    {
      icon: Zap,
      title: 'Performance Optimisée',
      description: 'CDN global, compression Brotli, lazy loading et architecture serverless',
      color: 'from-accent-600 to-accent-800',
      stats: '99.9% uptime'
    }
  ]

  const stats = [
    { icon: Database, label: 'Entreprises référencées', value: '2.1M+', color: 'text-primary-600' },
    { icon: Users, label: 'Utilisateurs actifs', value: '15K+', color: 'text-neutral-700' },
    { icon: Clock, label: 'Requêtes/minute', value: '50K+', color: 'text-accent-600' },
    { icon: Globe, label: 'Sources de données', value: '12', color: 'text-primary-600' }
  ]

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-screen bg-gradient-to-br from-white via-neutral-50 to-primary-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-800">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-40"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-neutral-900/50"></div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-primary-200 dark:bg-primary-800 rounded-full blur-xl opacity-70 animate-float"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-accent-200 dark:bg-accent-800 rounded-full blur-xl opacity-50 animate-float" style={{animationDelay: '2s'}}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-12"
            >
              <div className="inline-flex items-center px-4 py-2 bg-primary-100 dark:bg-primary-900/30 rounded-full text-primary-700 dark:text-primary-300 text-sm font-medium mb-6">
                <CheckCircle className="h-4 w-4 mr-2" />
                Données certifiées par l'État français
              </div>
              
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8">
                <span className="text-neutral-900 dark:text-white">Intelligence</span>
                <br />
                <span className="bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 bg-clip-text text-transparent">
                  Économique
                </span>
                <br />
                <span className="text-neutral-700 dark:text-neutral-300 text-4xl md:text-5xl lg:text-6xl">
                  Nouvelle génération
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-neutral-600 dark:text-neutral-300 max-w-4xl mx-auto leading-relaxed mb-8">
                Plateforme d'analyse d'entreprises alimentée par l'IA, connectée aux bases de données officielles 
                françaises pour des insights métier précis et actionables
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                <motion.button
                  onClick={() => document.getElementById('search-section').scrollIntoView({ behavior: 'smooth' })}
                  className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-8 py-4 rounded-xl font-semibold hover:from-primary-700 hover:to-primary-800 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Commencer l'analyse
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
                
                <motion.button
                  onClick={() => router.push('/demo')}
                  className="px-8 py-4 rounded-xl font-semibold border-2 border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:border-primary-500 hover:text-primary-600 transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Voir la démo
                </motion.button>
              </div>
            </motion.div>

            {/* API Sources */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-6 text-neutral-500 dark:text-neutral-400"
            >
              <div className="flex items-center space-x-2 bg-white dark:bg-neutral-800 px-4 py-2 rounded-lg shadow-sm">
                <Globe className="h-4 w-4" />
                <span className="text-sm font-medium">API SIRENE</span>
              </div>
              <div className="flex items-center space-x-2 bg-white dark:bg-neutral-800 px-4 py-2 rounded-lg shadow-sm">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-medium">RNE INPI</span>
              </div>
              <div className="flex items-center space-x-2 bg-white dark:bg-neutral-800 px-4 py-2 rounded-lg shadow-sm">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">BODACC</span>
              </div>
              <div className="flex items-center space-x-2 bg-white dark:bg-neutral-800 px-4 py-2 rounded-lg shadow-sm">
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm font-medium">INSEE</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${stat.color === 'text-primary-600' ? 'bg-primary-100 dark:bg-primary-900/30' : stat.color === 'text-accent-600' ? 'bg-accent-100 dark:bg-accent-900/30' : 'bg-neutral-100 dark:bg-neutral-800'} mb-4`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section id="search-section" className="py-20 bg-neutral-50 dark:bg-neutral-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              Recherche Intelligente
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-300">
              Trouvez n'importe quelle entreprise française en quelques secondes
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl p-8 border border-neutral-200 dark:border-neutral-700"
          >
            <SearchForm onSearch={handleSearch} loading={loading} />
            
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800 rounded-xl p-4"
              >
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-accent-500 rounded-full mr-3"></div>
                  <p className="text-accent-800 dark:text-accent-200 text-sm font-medium">{error}</p>
                </div>
              </motion.div>
            )}

            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-8"
              >
                <CompanyList 
                  companies={searchResults} 
                  onCompanySelect={handleCompanySelect}
                />
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 dark:text-white mb-6">
              Fonctionnalités Enterprise
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-300 max-w-3xl mx-auto">
              Une suite complète d'outils d'intelligence économique pour analyser et comprendre 
              le marché français en profondeur
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative bg-white dark:bg-neutral-900 rounded-2xl p-8 border border-neutral-200 dark:border-neutral-800 hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-300 hover:shadow-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 to-transparent dark:from-primary-900/10 dark:to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative">
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                      {feature.title}
                    </h3>
                    <span className="text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/30 px-2 py-1 rounded-lg">
                      {feature.stats}
                    </span>
                  </div>
                  
                  <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed mb-6">
                    {feature.description}
                  </p>
                  
                  <div className="flex items-center text-primary-600 dark:text-primary-400 font-medium text-sm group-hover:translate-x-2 transition-transform duration-300">
                    En savoir plus
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-neutral-900 via-neutral-800 to-primary-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-primary-600/20 to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-1/3 h-full bg-gradient-to-l from-accent-600/20 to-transparent"></div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Prêt à explorer l'écosystème entrepreneurial français ?
            </h2>
            <p className="text-xl text-neutral-300 mb-12 max-w-2xl mx-auto">
              Rejoignez plus de 15 000 professionnels qui utilisent notre plateforme 
              pour prendre des décisions éclairées
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                onClick={() => router.push('/register')}
                className="bg-white text-neutral-900 px-8 py-4 rounded-xl font-semibold hover:bg-neutral-100 transition-all duration-300 shadow-lg hover:shadow-xl"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Commencer gratuitement
              </motion.button>
              
              <motion.button
                onClick={() => router.push('/contact')}
                className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-neutral-900 transition-all duration-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Contacter l'équipe
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  )
}
