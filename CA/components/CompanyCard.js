import { Building2, MapPin, Calendar, Activity } from 'lucide-react';

export default function CompanyCard({ company, onClick }) {
  return (
    <div 
      onClick={() => onClick(company)}
      className="bg-white dark:bg-[#1e293b] rounded-lg shadow-sm border border-gray-200 dark:border-[#334155] p-6 hover:shadow-md dark:hover:shadow-lg transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <span className="text-green-600 dark:text-green-400 mr-2 text-lg">🏢</span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
              {company.denomination}
            </h3>
          </div>
          
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center">
              <span className="font-medium w-16 text-gray-500 dark:text-gray-400">SIREN:</span>
              <span className="text-blue-600 dark:text-blue-400">{company.siren}</span>
            </div>
            
            {company.formeJuridique && (
              <div className="flex items-center">
                <span className="font-medium w-16 text-gray-500 dark:text-gray-400">Forme:</span>
                <span>{company.formeJuridique}</span>
              </div>
            )}
            
            {company.adresseSiege && (
              <div className="flex items-start">
                <span className="text-gray-400 dark:text-gray-500 mr-1">📍</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{company.adresseSiege}</span>
              </div>
            )}
            
            {company.libelleAPE && (
              <div className="flex items-start">
                <span className="text-gray-400 dark:text-gray-500 mr-1">💼</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{company.libelleAPE}</span>
              </div>
            )}
            
            {company.dateCreation && (
              <div className="flex items-center text-xs">
                <span className="text-gray-400 dark:text-gray-500 mr-1">📅</span>
                <span className="text-gray-500 dark:text-gray-400">
                  Créée le {new Date(company.dateCreation).toLocaleDateString('fr-FR')}
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="ml-4">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            company.active 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800' 
              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}>
            {company.active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
    </div>
  );
}
