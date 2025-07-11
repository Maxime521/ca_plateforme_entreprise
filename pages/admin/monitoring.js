// pages/admin/monitoring.js - Monitoring dashboard for admins
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import { useAuth } from '../../hooks/useAuth'

export default function MonitoringDashboard() {
  const { user, loading } = useAuth()
  const [refreshInterval, setRefreshInterval] = useState(30000) // 30 seconds
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)

  // Redirect if not admin
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      window.location.href = '/'
    }
  }, [user, loading])

  // Health check query
  const { data: healthData, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await fetch('/api/health')
      if (!response.ok) throw new Error('Health check failed')
      return response.json()
    },
    refetchInterval: isAutoRefresh ? refreshInterval : false,
    retry: 1,
  })

  // Metrics query
  const { data: metricsData, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['metrics'],
    queryFn: async () => {
      const response = await fetch('/api/metrics', {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_METRICS_API_KEY || 'dev-key'}`
        }
      })
      if (!response.ok) throw new Error('Metrics fetch failed')
      return response.json()
    },
    refetchInterval: isAutoRefresh ? refreshInterval : false,
    retry: 1,
  })

  const handleRefreshAll = () => {
    refetchHealth()
    refetchMetrics()
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  if (!user || user.role !== 'admin') {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Accès non autorisé
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Vous devez être administrateur pour accéder à cette page.
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Monitoring Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Surveillance en temps réel de la plateforme
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Auto-refresh toggle */}
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isAutoRefresh}
                onChange={(e) => setIsAutoRefresh(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Auto-refresh
              </span>
            </label>
            
            {/* Refresh interval */}
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-800"
              disabled={!isAutoRefresh}
            >
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
              <option value={60000}>1min</option>
              <option value={300000}>5min</option>
            </select>
            
            {/* Manual refresh */}
            <button
              onClick={handleRefreshAll}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Actualiser
            </button>
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          
          {/* Overall Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                État Global
              </h3>
              <div className={`w-4 h-4 rounded-full ${
                healthData?.status === 'healthy' ? 'bg-green-500' : 
                healthData?.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
            </div>
            <p className={`mt-2 text-2xl font-bold ${
              healthData?.status === 'healthy' ? 'text-green-600' : 
              healthData?.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {healthLoading ? 'Loading...' : (healthData?.status || 'Unknown')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Dernière vérification: {healthData?.timestamp ? new Date(healthData.timestamp).toLocaleTimeString() : 'N/A'}
            </p>
          </div>

          {/* Database Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Base de données
              </h3>
              <div className={`w-4 h-4 rounded-full ${
                metricsData?.database?.connected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
            </div>
            <p className={`mt-2 text-2xl font-bold ${
              metricsData?.database?.connected ? 'text-green-600' : 'text-red-600'
            }`}>
              {metricsLoading ? 'Loading...' : (metricsData?.database?.connected ? 'Connecté' : 'Déconnecté')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {metricsData?.database?.companies ? `${metricsData.database.companies} entreprises` : 'N/A'}
            </p>
          </div>

          {/* Uptime */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Temps de fonctionnement
            </h3>
            <p className="text-2xl font-bold text-blue-600">
              {healthData?.uptime ? `${Math.floor(healthData.uptime / 3600)}h ${Math.floor((healthData.uptime % 3600) / 60)}m` : 'N/A'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Depuis le dernier redémarrage
            </p>
          </div>

          {/* Memory Usage */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Utilisation mémoire
            </h3>
            <p className="text-2xl font-bold text-purple-600">
              {metricsData?.performance?.memory_usage_mb ? `${metricsData.performance.memory_usage_mb}MB` : 'N/A'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {metricsData?.performance?.memory_usage_percent ? `${metricsData.performance.memory_usage_percent}% utilisé` : 'Pourcentage N/A'}
            </p>
          </div>
        </div>

        {/* Health Checks Detail */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Vérifications de santé
            </h2>
          </div>
          <div className="p-6">
            {healthLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {healthData?.checks && Object.entries(healthData.checks).map(([key, check]) => (
                  <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        check.status === 'healthy' ? 'bg-green-500' : 
                        check.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white capitalize">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {check.message || 'Aucun message'}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      check.status === 'healthy' ? 'bg-green-100 text-green-800' : 
                      check.status === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {check.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* Database Metrics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Métriques Base de Données
              </h2>
            </div>
            <div className="p-6">
              {metricsLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Entreprises</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {metricsData?.database?.companies || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Documents</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {metricsData?.database?.documents || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Utilisateurs</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {metricsData?.database?.users || 'N/A'}
                    </span>
                  </div>
                  {metricsData?.database?.activity_24h && (
                    <>
                      <hr className="my-4 border-gray-200 dark:border-gray-700" />
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Activité 24h
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Nouveaux documents</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {metricsData.database.activity_24h.new_documents}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Utilisateurs actifs</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {metricsData.database.activity_24h.active_users}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* API Metrics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Métriques API
              </h2>
            </div>
            <div className="p-6">
              {metricsLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Requêtes aujourd&apos;hui</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {metricsData?.api?.requests_today || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Erreurs aujourd&apos;hui</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {metricsData?.api?.errors_today || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Taux d&apos;erreur</span>
                    <span className={`font-medium ${
                      parseFloat(metricsData?.api?.error_rate) > 5 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {metricsData?.api?.error_rate || 'N/A'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Informations Système
            </h2>
          </div>
          <div className="p-6">
            {metricsLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Application</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Version</span>
                      <span className="text-gray-900 dark:text-white">{metricsData?.application?.version || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Environnement</span>
                      <span className="text-gray-900 dark:text-white">{metricsData?.application?.environment || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Système</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Node.js</span>
                      <span className="text-gray-900 dark:text-white">{metricsData?.system?.version || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Plateforme</span>
                      <span className="text-gray-900 dark:text-white">{metricsData?.system?.platform || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Mémoire</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Heap utilisé</span>
                      <span className="text-gray-900 dark:text-white">
                        {metricsData?.system?.memory?.heapUsed ? 
                          `${Math.round(metricsData.system.memory.heapUsed / 1024 / 1024)}MB` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Heap total</span>
                      <span className="text-gray-900 dark:text-white">
                        {metricsData?.system?.memory?.heapTotal ? 
                          `${Math.round(metricsData.system.memory.heapTotal / 1024 / 1024)}MB` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </Layout>
  )
}