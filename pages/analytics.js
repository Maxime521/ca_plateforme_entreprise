// pages/analytics.js - UPDATED with Modern Export Button

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Analytics() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('last12months');
  const [selectedMetric, setSelectedMetric] = useState('companies');

  // Mock analytics data (keeping existing data)
  const mockData = {
    summary: {
      totalCompanies: 1247,
      activeCompanies: 1156,
      documentsProcessed: 8943,
      apiCalls: 23456,
      growthRate: 12.5,
      avgProcessingTime: 2.3
    },
    companiesByRegion: [
      { region: 'Île-de-France', count: 423, percentage: 33.9 },
      { region: 'Auvergne-Rhône-Alpes', count: 187, percentage: 15.0 },
      { region: 'Provence-Alpes-Côte d\'Azur', count: 156, percentage: 12.5 },
      { region: 'Nouvelle-Aquitaine', count: 134, percentage: 10.7 },
      { region: 'Occitanie', count: 98, percentage: 7.9 },
      { region: 'Autres', count: 249, percentage: 20.0 }
    ],
    companiesByForm: [
      { form: 'SAS', count: 567, color: '#22c55e' },
      { form: 'SARL', count: 324, color: '#3b82f6' },
      { form: 'SA', count: 189, color: '#f59e0b' },
      { form: 'EURL', count: 98, color: '#ef4444' },
      { form: 'Autres', count: 69, color: '#8b5cf6' }
    ],
    documentsByMonth: [
      { month: 'Jan', documents: 650, processed: 620 },
      { month: 'Feb', documents: 720, processed: 695 },
      { month: 'Mar', documents: 890, processed: 875 },
      { month: 'Apr', documents: 780, processed: 760 },
      { month: 'May', documents: 950, processed: 920 },
      { month: 'Jun', documents: 1100, processed: 1075 },
      { month: 'Jul', documents: 980, processed: 965 },
      { month: 'Aug', documents: 650, processed: 640 },
      { month: 'Sep', documents: 1200, processed: 1180 },
      { month: 'Oct', documents: 1350, processed: 1320 },
      { month: 'Nov', documents: 1180, processed: 1160 },
      { month: 'Dec', documents: 890, processed: 870 }
    ],
    sectorGrowth: [
      { sector: 'Technologie', companies: 234, growth: 18.5 },
      { sector: 'Santé', companies: 156, growth: 22.3 },
      { sector: 'Énergie', companies: 145, growth: 15.7 },
      { sector: 'Commerce', companies: 289, growth: 8.9 },
      { sector: 'Conseil', companies: 198, growth: 12.1 },
      { sector: 'Manufacturing', companies: 178, growth: 6.4 }
    ],
    apiUsage: [
      { month: 'Jan', sirene: 1200, rne: 800, bodacc: 400 },
      { month: 'Feb', sirene: 1350, rne: 900, bodacc: 450 },
      { month: 'Mar', sirene: 1500, rne: 1000, bodacc: 500 },
      { month: 'Apr', sirene: 1400, rne: 950, bodacc: 480 },
      { month: 'May', sirene: 1600, rne: 1100, bodacc: 550 },
      { month: 'Jun', sirene: 1800, rne: 1200, bodacc: 600 }
    ]
  };

  // Export function
  const handleExportReport = async () => {
    try {
      // Show loading state
      const button = document.getElementById('export-btn');
      const originalContent = button.innerHTML;
      button.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Génération...
      `;
      button.disabled = true;

      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Reset button
      button.innerHTML = originalContent;
      button.disabled = false;
      
      // Show success
      alert('Rapport exporté avec succès !');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Erreur lors de l\'export');
    }
  };

  // Existing StatCard component
  const StatCard = ({ title, value, subtitle, icon, trend, color = 'green' }) => {
    const colorClasses = {
      green: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30',
      blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30',
      orange: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30',
      red: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30'
    };

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
            <span className="text-2xl">{icon}</span>
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center">
            <span className={`text-sm font-medium ${trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {trend > 0 ? '↗️' : '↘️'} {Math.abs(trend)}%
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">vs mois dernier</span>
          </div>
        )}
      </div>
    );
  };

  if (!user) {
    return <div>Accès non autorisé</div>;
  }

  return (
    <Layout>
      <div className="py-8 px-4 sm:px-6 lg:px-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* UPDATED Header with Modern Export Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Analyses & Tableaux de Bord
              </h1>
              <p className="text-gray-600 dark:text-gray-200">
                Visualisez les tendances et performances de votre base de données
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="last7days">7 derniers jours</option>
                <option value="last30days">30 derniers jours</option>
                <option value="last12months">12 derniers mois</option>
                <option value="lastyear">Année dernière</option>
              </select>
              
              {/* MODERN EXPORT BUTTON */}
              <button
                id="export-btn"
                onClick={handleExportReport}
                className="group relative inline-flex items-center justify-center px-6 py-2.5 overflow-hidden font-medium transition-all duration-300 ease-in-out bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 border border-blue-500/20"
              >
                {/* Background Animation */}
                <span className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-400/20 via-transparent to-blue-800/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                
                {/* Icon */}
                <svg 
                  className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:scale-110" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                  />
                </svg>
                
                {/* Text */}
                <span className="relative z-10 text-sm font-semibold tracking-wide">
                  Exporter Rapport
                </span>
                
                {/* Shine Effect */}
                <span className="absolute inset-0 -top-1 -left-1 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700 ease-in-out"></span>
              </button>
            </div>
          </div>

          {/* Rest of the analytics content remains the same */}
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Entreprises totales"
              value={mockData.summary.totalCompanies.toLocaleString()}
              subtitle={`${mockData.summary.activeCompanies} actives`}
              icon="🏢"
              trend={12.5}
              color="green"
            />
            <StatCard
              title="Documents traités"
              value={mockData.summary.documentsProcessed.toLocaleString()}
              subtitle="Ce mois"
              icon="📄"
              trend={8.2}
              color="blue"
            />
            <StatCard
              title="Appels API"
              value={mockData.summary.apiCalls.toLocaleString()}
              subtitle="Toutes sources"
              icon="🔌"
              trend={15.7}
              color="orange"
            />
            <StatCard
              title="Temps moyen"
              value={`${mockData.summary.avgProcessingTime}s`}
              subtitle="Traitement document"
              icon="⚡"
              trend={-5.3}
              color="green"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Companies by Region */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Répartition par région
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mockData.companiesByRegion}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="region" 
                    stroke="#6b7280"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f3f4f6'
                    }}
                  />
                  <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Companies by Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Formes juridiques
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={mockData.companiesByForm}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ form, count }) => {
                      const total = mockData.companiesByForm.reduce((sum, item) => sum + item.count, 0);
                      return `${form}: ${((count/total)*100).toFixed(1)}%`;
                    }}
                  >
                    {mockData.companiesByForm.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f3f4f6'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Document Processing Timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Traitement des documents (12 derniers mois)
              </h3>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-gray-600 dark:text-gray-300">Documents reçus</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-gray-600 dark:text-gray-300">Documents traités</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={mockData.documentsByMonth}>
                <defs>
                  <linearGradient id="documentsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="processedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f3f4f6'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="documents"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#documentsGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="processed"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#processedGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom Grid - Sector Growth and API Usage */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Sector Growth */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Croissance par secteur
              </h3>
              <div className="space-y-4">
                {mockData.sectorGrowth.map((sector, index) => (
                  <div key={sector.sector} className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{sector.sector}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{sector.companies} entreprises</span>
                        </div>
                        <div className="mt-1 flex items-center">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(sector.growth * 4, 100)}%` }}
                            ></div>
                          </div>
                          <span className={`text-sm font-medium ${sector.growth > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {sector.growth > 0 ? '+' : ''}{sector.growth}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* API Usage */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Utilisation des API
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockData.apiUsage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f3f4f6'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sirene"
                    stroke="#22c55e"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    name="SIRENE"
                  />
                  <Line
                    type="monotone"
                    dataKey="rne"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    name="RNE"
                  />
                  <Line
                    type="monotone"
                    dataKey="bodacc"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    name="BODACC"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-gray-600 dark:text-gray-300">SIRENE</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-gray-600 dark:text-gray-300">RNE</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                  <span className="text-gray-600 dark:text-gray-300">BODACC</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Insights */}
          <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="mr-2">💡</span>
              Insights automatiques
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Tendance positive</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Le secteur de la santé montre une croissance de +22.3% ce mois, dépassant la moyenne nationale.
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Performance API</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Le temps de réponse moyen a diminué de 5.3% grâce aux optimisations récentes.
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Pic d'activité</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Octobre a enregistré le plus grand nombre de documents traités (1,320).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
