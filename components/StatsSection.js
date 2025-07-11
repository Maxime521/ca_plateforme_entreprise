import { TrendingUp, Building2, FileText, Users, Search } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function StatsSection() {
  const [counters, setCounters] = useState({
    companies: 0,
    documents: 0,
    users: 0,
    searches: 0
  })

  useEffect(() => {
    const targets = {
      companies: 10500000,
      documents: 2800000,
      users: 45000,
      searches: 1250000
    }

    const duration = 2000
    const steps = 60
    const stepDuration = duration / steps

    let currentStep = 0

    const timer = setInterval(() => {
      currentStep++
      const progress = currentStep / steps

      setCounters({
        companies: Math.floor(targets.companies * progress),
        documents: Math.floor(targets.documents * progress),
        users: Math.floor(targets.users * progress),
        searches: Math.floor(targets.searches * progress)
      })

      if (currentStep >= steps) {
        clearInterval(timer)
        setCounters(targets)
      }
    }, stepDuration)

    return () => clearInterval(timer)
  }, [])

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`
    }
    return num.toLocaleString()
  }

  const stats = [
    {
      icon: Building2,
      value: formatNumber(counters.companies),
      label: 'Entreprises référencées',
      color: 'text-primary-400',
      bgColor: 'bg-primary-500/10',
      borderColor: 'border-primary-500/20'
    },
    {
      icon: FileText,
      value: formatNumber(counters.documents),
      label: 'Documents disponibles',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20'
    },
    {
      icon: Users,
      value: formatNumber(counters.users),
      label: 'Utilisateurs actifs',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20'
    },
    {
      icon: Search,
      value: formatNumber(counters.searches),
      label: 'Recherches effectuées',
      color: 'text-accent-400',
      bgColor: 'bg-accent-500/10',
      borderColor: 'border-accent-500/20'
    }
  ]

  return (
    <section className="py-16">
      <div className="text-center mb-12">
        <h3 className="text-3xl font-bold text-white mb-4">
          Une plateforme de <span className="gradient-text">confiance</span>
        </h3>
        <p className="text-dark-300 text-lg max-w-2xl mx-auto">
          Des millions d'entreprises nous font confiance pour leurs recherches de données officielles
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon
          return (
            <div
              key={index}
              className={`glass-effect rounded-2xl p-8 text-center group hover:scale-105 transition-all duration-300 border ${stat.borderColor} card-hover`}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="relative mb-6">
                <div className={`${stat.bgColor} rounded-2xl p-4 inline-block group-hover:scale-110 transition-transform duration-300`}>
                  <IconComponent className={`h-8 w-8 ${stat.color}`} />
                </div>
                <div className={`absolute -inset-4 ${stat.bgColor} rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-300 blur-xl`}></div>
              </div>
              
              <div className="space-y-2">
                <div className={`text-4xl font-bold ${stat.color} font-mono tracking-tight`}>
                  {stat.value}
                </div>
                <div className="text-dark-300 font-medium text-sm leading-relaxed">
                  {stat.label}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-dark-700/50">
                <div className="flex items-center justify-center text-xs text-dark-400">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span>Mis à jour en temps réel</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Trust indicators */}
      <div className="mt-16 text-center">
        <div className="glass-effect rounded-2xl p-8 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="flex items-center justify-center space-x-3">
              <div className="h-3 w-3 bg-primary-500 rounded-full animate-pulse"></div>
              <span className="text-dark-300 font-medium">Données certifiées INSEE</span>
            </div>
            <div className="flex items-center justify-center space-x-3">
              <div className="h-3 w-3 bg-primary-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
              <span className="text-dark-300 font-medium">Mise à jour quotidienne</span>
            </div>
            <div className="flex items-center justify-center space-x-3">
              <div className="h-3 w-3 bg-primary-500 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
              <span className="text-dark-300 font-medium">API haute performance</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
