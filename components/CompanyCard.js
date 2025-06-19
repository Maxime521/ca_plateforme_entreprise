// components/CompanyCard.js - Modern Financial Company Card
export default function CompanyCard({ company, onClick }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const getStatusBadge = (active) => {
    return active ? (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400 border border-success-200 dark:border-success-800">
        <span className="w-2 h-2 bg-success-500 rounded-full mr-2"></span>
        Active
      </span>
    ) : (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400 border border-error-200 dark:border-error-800">
        <span className="w-2 h-2 bg-error-500 rounded-full mr-2"></span>
        Inactive
      </span>
    );
  };

  const getSourceBadge = (source) => {
    const sourceConfig = {
      local: { 
        label: 'Local', 
        icon: '💾', 
        className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700' 
      },
      insee: { 
        label: 'INSEE', 
        icon: '🏛️', 
        className: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' 
      },
      bodacc: { 
        label: 'BODACC', 
        icon: '📰', 
        className: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800' 
      }
    };

    const config = sourceConfig[source] || sourceConfig.local;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border ${config.className}`}>
        <span className="mr-1">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  return (
    <div 
      onClick={() => onClick(company)}
      className="group bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl rounded-2xl shadow-card hover:shadow-card-hover border border-gray-200/50 dark:border-dark-border/50 p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center mb-2">
            <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
              <span className="text-white text-xl">🏢</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {company.denomination || 'Entreprise sans nom'}
              </h3>
              <p className="text-sm text-primary-600 dark:text-primary-400 font-medium">
                SIREN: {company.siren}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end space-y-2 ml-4">
          {getStatusBadge(company.active)}
          {company.source && getSourceBadge(company.source)}
        </div>
      </div>

      {/* Company Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Left Column */}
        <div className="space-y-3">
          {company.formeJuridique && (
            <InfoItem
              icon="⚖️"
              label="Forme juridique"
              value={company.formeJuridique}
            />
          )}
          
          {company.codeAPE && (
            <InfoItem
              icon="💼"
              label="Code APE"
              value={`${company.codeAPE}${company.libelleAPE ? ` - ${company.libelleAPE}` : ''}`}
            />
          )}
          
          {company.effectif && (
            <InfoItem
              icon="👥"
              label="Effectif"
              value={company.effectif}
            />
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          {company.dateCreation && (
            <InfoItem
              icon="📅"
              label="Date de création"
              value={formatDate(company.dateCreation)}
            />
          )}
          
          {company.capitalSocial && (
            <InfoItem
              icon="💰"
              label="Capital social"
              value={`${company.capitalSocial.toLocaleString()} €`}
            />
          )}
          
          {company.siegeSocial !== undefined && (
            <InfoItem
              icon="🏛️"
              label="Siège social"
              value={company.siegeSocial ? "Oui" : "Non"}
            />
          )}
        </div>
      </div>

      {/* Address */}
      {company.adresseSiege && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-dark-card rounded-xl">
          <div className="flex items-start">
            <span className="text-gray-400 dark:text-gray-500 mr-3 mt-0.5 text-lg">📍</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adresse</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {company.adresseSiege}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Additional Information for BODACC sources */}
      {company.source === 'bodacc' && company.lastAnnouncement && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
          <div className="flex items-start">
            <span className="text-green-500 mr-3 mt-0.5 text-lg">📰</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                Dernière annonce BODACC
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                {company.lastAnnouncement.type}
              </p>
              <p className="text-xs text-green-500 dark:text-green-400 mt-1">
                {formatDate(company.lastAnnouncement.date)}
                {company.lastAnnouncement.tribunal && ` • ${company.lastAnnouncement.tribunal}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-dark-border">
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
          {company.siret && (
            <span className="mr-4">SIRET: {company.siret}</span>
          )}
          <span>Cliquer pour plus de détails</span>
        </div>
        
        <button className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-all duration-200 hover:scale-105 shadow-lg opacity-0 group-hover:opacity-100">
          Voir plus
          <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Helper component for information items
function InfoItem({ icon, label, value }) {
  return (
    <div className="flex items-start">
      <span className="text-gray-400 dark:text-gray-500 mr-3 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
          {label}
        </p>
        <p className="text-sm text-gray-900 dark:text-white font-medium truncate">
          {value || 'N/A'}
        </p>
      </div>
    </div>
  );
}
