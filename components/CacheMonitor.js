import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

export default function CacheMonitor() {
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(10000) // 10 seconds

  // Cache statistics query
  const { data: cacheStats, isLoading, refetch } = useQuery({
    queryKey: ['cache-stats'],
    queryFn: async () => {
      const response = await fetch('/api/cache/stats', {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CACHE_API_KEY || 'dev-cache-key'}`
        }
      })
      if (!response.ok) throw new Error('Failed to fetch cache stats')
      return response.json()
    },
    refetchInterval: isAutoRefresh ? refreshInterval : false,
    retry: 1,
  })

  const getStatusColor = (status) => {
    if (status === 'redis' && cacheStats?.connected) return 'text-green-600'
    if (status === 'memory') return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusIcon = (status) => {
    if (status === 'redis' && cacheStats?.connected) return '🟢'
    if (status === 'memory') return '🟡'
    return '🔴'
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Cache Performance Monitor
          </h2>
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
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
            </select>
            
            {/* Manual refresh */}
            <button
              onClick={() => refetch()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm font-medium"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Cache Status
              </h3>
              <span className="text-2xl">
                {getStatusIcon(cacheStats?.type)}
              </span>
            </div>
            <p className={`mt-2 text-lg font-bold ${getStatusColor(cacheStats?.type)}`}>
              {cacheStats?.type === 'redis' && cacheStats?.connected ? 'Redis Active' :
               cacheStats?.type === 'memory' ? 'Memory Fallback' : 'Disconnected'}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Hit Rate
            </h3>
            <p className="text-lg font-bold text-green-600">
              {cacheStats?.performance?.hitRate?.toFixed(1) || 'N/A'}%
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Response Time
            </h3>
            <p className="text-lg font-bold text-blue-600">
              {cacheStats?.performance?.avgResponseTime?.cached?.toFixed(0) || 'N/A'}ms
            </p>
            <p className="text-xs text-gray-500">
              vs {cacheStats?.performance?.avgResponseTime?.uncached?.toFixed(0) || 'N/A'}ms uncached
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Cache Size
            </h3>
            <p className="text-lg font-bold text-purple-600">
              {cacheStats?.type === 'memory' ? 
                `${cacheStats?.size || 0} items` :
                `${(cacheStats?.performance?.cacheSizeBytes / 1024 / 1024)?.toFixed(1) || 0}MB`
              }
            </p>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Response Time Comparison */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Performance Improvement
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Cached Requests</span>
                <span className="font-medium text-green-600">
                  {cacheStats?.performance?.avgResponseTime?.cached?.toFixed(0) || 'N/A'}ms
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Uncached Requests</span>
                <span className="font-medium text-red-600">
                  {cacheStats?.performance?.avgResponseTime?.uncached?.toFixed(0) || 'N/A'}ms
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Improvement</span>
                <span className="font-bold text-blue-600">
                  {cacheStats?.performance?.avgResponseTime?.improvement || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Cache Details */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Cache Details
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Type</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {cacheStats?.type || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Connected</span>
                <span className={`font-medium ${cacheStats?.connected ? 'text-green-600' : 'text-red-600'}`}>
                  {cacheStats?.connected ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Uptime</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {Math.floor(cacheStats?.monitoring?.uptime / 3600) || 0}h {Math.floor((cacheStats?.monitoring?.uptime % 3600) / 60) || 0}m
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {cacheStats?.performance?.recommendedActions?.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-3">
              Recommendations
            </h3>
            <div className="space-y-2">
              {cacheStats.performance.recommendedActions.map((rec, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <span className={`inline-block w-2 h-2 rounded-full mt-2 ${
                    rec.type === 'critical' ? 'bg-red-500' :
                    rec.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}></span>
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      {rec.message}
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-300">
                      {rec.action}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Last updated: {cacheStats?.monitoring?.timestamp ? 
              new Date(cacheStats.monitoring.timestamp).toLocaleTimeString() : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  )
}