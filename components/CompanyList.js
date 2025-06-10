import { Building2, MapPin, Calendar, Activity } from 'lucide-react'

export default function CompanyList({ companies, onCompanySelect }) {
  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Résultats de recherche ({companies.length})
      </h3>
      <div className="space-y-4">
        {companies.map((company) => (
          <div
            key={company.siren}
            onClick={() => onCompanySelect(company.siren)}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md cursor-pointer transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <Building2 className="h-5 w-5 text-gray-400 mr-2" />
                  <h4 className="text-lg font-semibold text-gray-900">
                    {company.denomination}
                  </h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <span className="font-medium mr-2">SIREN:</span>
                    {company.siren}
                  </div>
                  <div className="flex items-center">
                    <Activity className="h-4 w-4 mr-1" />
                    <span className="font-medium mr-2">APE:</span>
                    {company.apeCode} - {company.apeLibelle}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span className="font-medium mr-2">Adresse:</span>
                    {company.adresse}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span className="font-medium mr-2">Création:</span>
                    {company.dateCreation}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  company.active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {company.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
