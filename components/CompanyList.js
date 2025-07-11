import { motion } from 'framer-motion'
import {
  Building2,
  MapPin,
  Briefcase,
  Users,
  Calendar,
  ExternalLink,
  ChevronRight,
  Star,
  TrendingUp
} from 'lucide-react'

export default function CompanyList({ companies, onCompanySelect }) {
  if (!companies || companies.length === 0) {
    return null
  }

  const getStatusBadge = (status) => {
    const isActive = status === 'A' || status === 'active'
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        isActive 
          ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300'
          : 'bg-accent-100 text-accent-800 dark:bg-accent-900/30 dark:text-accent-300'
      }`}>
        <div className={`w-1.5 h-1.5 rounded-full mr-1 ${
          isActive ? 'bg-primary-500' : 'bg-accent-500'
        }`}></div>
        {isActive ? 'Actif' : 'Inactif'}
      </span>
    )
  }

  const formatAddress = (address) => {
    if (typeof address === 'string') return address
    
    const parts = []
    if (address?.numeroVoieEtablissement) parts.push(address.numeroVoieEtablissement)
    if (address?.typeVoieEtablissement) parts.push(address.typeVoieEtablissement)
    if (address?.libelleVoieEtablissement) parts.push(address.libelleVoieEtablissement)
    if (address?.codePostalEtablissement) parts.push(address.codePostalEtablissement)
    if (address?.libelleCommuneEtablissement) parts.push(address.libelleCommuneEtablissement)
    
    return parts.join(' ') || 'Adresse non disponible'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
          {companies.length} entreprise{companies.length > 1 ? 's' : ''} trouvée{companies.length > 1 ? 's' : ''}
        </h3>
        <div className="flex items-center text-sm text-neutral-500 dark:text-neutral-400">
          <TrendingUp className="h-4 w-4 mr-1" />
          Triées par pertinence
        </div>
      </div>

      <div className="grid gap-4">
        {companies.map((company, index) => (
          <motion.div
            key={company.siren || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-lg transition-all duration-300 group cursor-pointer"
            onClick={() => onCompanySelect(company.siren)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {/* Company Header */}
                <div className="flex items-center mb-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-lg mr-3 group-hover:scale-110 transition-transform duration-300">
                    <Building2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-semibold text-neutral-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200">
                      {company.name || company.denominationUniteLegale || 'Nom non disponible'}
                    </h4>
                    <div className="flex items-center mt-1 space-x-3">
                      <span className="text-sm text-neutral-500 dark:text-neutral-400 font-mono">
                        SIREN: {company.siren}
                      </span>
                      {getStatusBadge(company.status)}
                    </div>
                  </div>
                </div>

                {/* Company Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center text-sm text-neutral-600 dark:text-neutral-300">
                    <MapPin className="h-4 w-4 mr-2 text-neutral-400 flex-shrink-0" />
                    <span className="truncate">{formatAddress(company.address)}</span>
                  </div>
                  
                  {company.activity && (
                    <div className="flex items-center text-sm text-neutral-600 dark:text-neutral-300">
                      <Briefcase className="h-4 w-4 mr-2 text-neutral-400 flex-shrink-0" />
                      <span className="truncate">{company.activity}</span>
                    </div>
                  )}
                </div>

                {/* Additional Info */}
                <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <div className="flex items-center space-x-4">
                    {company.employees && (
                      <div className="flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        {company.employees} employés
                      </div>
                    )}
                    {company.creationDate && (
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        Créée en {new Date(company.creationDate).getFullYear()}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center text-primary-600 dark:text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="text-xs font-medium mr-1">Voir détails</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <motion.button
                className="ml-4 p-2 text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 opacity-0 group-hover:opacity-100 transition-all duration-200"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation()
                  onCompanySelect(company.siren)
                }}
              >
                <ExternalLink className="h-5 w-5" />
              </motion.button>
            </div>

            {/* Hover Effect Line */}
            <div className="h-0.5 bg-gradient-to-r from-primary-500 to-primary-700 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left mt-4"></div>
          </motion.div>
        ))}
      </div>

      {/* Load More Button (if needed) */}
      {companies.length >= 10 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center pt-6"
        >
          <button className="px-6 py-3 border-2 border-primary-200 dark:border-primary-800 text-primary-600 dark:text-primary-400 rounded-xl font-medium hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200">
            Charger plus de résultats
          </button>
        </motion.div>
      )}
    </div>
  )
}
