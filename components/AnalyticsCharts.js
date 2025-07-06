import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';

// Colors for charts
const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export function CompaniesBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis 
          dataKey="region" 
          angle={-45}
          textAnchor="end"
          height={80}
          fontSize={12}
          stroke="#9ca3af"
        />
        <YAxis stroke="#9ca3af" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1f2937', 
            border: 'none', 
            borderRadius: '8px',
            color: '#fff'
          }}
        />
        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CompanyFormPieChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ form, percentage }) => `${form}: ${percentage}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="count"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1f2937', 
            border: 'none', 
            borderRadius: '8px',
            color: '#fff'
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function DocumentsAreaChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="month" stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1f2937', 
            border: 'none', 
            borderRadius: '8px',
            color: '#fff'
          }}
        />
        <Area 
          type="monotone" 
          dataKey="documents" 
          stackId="1" 
          stroke="#3b82f6" 
          fill="#3b82f6" 
          fillOpacity={0.3}
        />
        <Area 
          type="monotone" 
          dataKey="processed" 
          stackId="1" 
          stroke="#22c55e" 
          fill="#22c55e" 
          fillOpacity={0.3}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SectorGrowthChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="horizontal">
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis type="number" stroke="#9ca3af" />
        <YAxis 
          dataKey="sector" 
          type="category" 
          width={100}
          fontSize={12}
          stroke="#9ca3af"
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1f2937', 
            border: 'none', 
            borderRadius: '8px',
            color: '#fff'
          }}
          formatter={(value, name) => [
            name === 'growth' ? `${value}%` : value,
            name === 'growth' ? 'Croissance' : 'Entreprises'
          ]}
        />
        <Bar dataKey="companies" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        <Bar dataKey="growth" fill="#22c55e" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ApiUsageLineChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="month" stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1f2937', 
            border: 'none', 
            borderRadius: '8px',
            color: '#fff'
          }}
        />
        <Line 
          type="monotone" 
          dataKey="sirene" 
          stroke="#3b82f6" 
          strokeWidth={3}
          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
        />
        <Line 
          type="monotone" 
          dataKey="rne" 
          stroke="#22c55e" 
          strokeWidth={3}
          dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: '#22c55e', strokeWidth: 2 }}
        />
        <Line 
          type="monotone" 
          dataKey="bodacc" 
          stroke="#f59e0b" 
          strokeWidth={3}
          dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Fallback component for loading state
export function ChartSkeleton({ height = 300 }) {
  return (
    <div 
      className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center"
      style={{ height: `${height}px` }}
    >
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading charts...</p>
      </div>
    </div>
  );
}