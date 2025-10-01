// Database management dashboard
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AuthGuard from '../../components/AuthGuard';
import { DashboardStats } from '../../lib/types/database';

interface TabProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

function DatabaseTabs({ activeTab, setActiveTab }: TabProps) {
  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'businesses', name: 'Business Logs', icon: '🏢' },
    { id: 'locations', name: 'Locations', icon: '📍' },
    { id: 'pipeline-runs', name: 'Pipeline Runs', icon: '⚙️' }
  ];

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`${
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
          >
            <span>{tab.icon}</span>
            <span>{tab.name}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function DashboardTab() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/database/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Dashboard stats loaded:', data.data);
        setStats(data.data);
      } else {
        console.error('Dashboard API failed:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleCleanup = async () => {
    if (!confirm('This will remove all corrupted business data. New pipeline runs will repopulate the database correctly. Continue?')) {
      return;
    }

    setCleanupLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/database/cleanup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Database cleaned! Removed ${data.data.businesses_removed} corrupted business records.`);
        // Refresh the stats
        setLoading(true);
        await fetchStats();
      } else {
        const errorData = await response.json();
        alert(`Cleanup failed: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
      alert('Cleanup failed. Check console for details.');
    } finally {
      setCleanupLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading dashboard...</div>;
  }

  if (!stats) {
    return <div className="text-center py-8 text-red-600">Failed to load dashboard data</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900">Pipeline Runs</h3>
          <p className="text-3xl font-bold text-indigo-600">{stats.total_pipeline_runs}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900">Businesses Analyzed</h3>
          <p className="text-3xl font-bold text-green-600">{stats.total_businesses}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900">Locations Tracked</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.total_locations}</p>
        </div>
      </div>

      {/* Database Actions */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Database Management</h3>
            <p className="text-sm text-gray-600 mt-1">Clean up corrupted data associations</p>
          </div>
          <button
            onClick={handleCleanup}
            disabled={cleanupLoading}
            className={`px-4 py-2 rounded-md font-medium text-sm ${
              cleanupLoading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
            }`}
          >
            {cleanupLoading ? 'Cleaning...' : 'Clean Database'}
          </button>
        </div>
      </div>

      {/* Recent Runs */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Recent Pipeline Runs</h3>
        </div>
        <div className="p-6">
          {stats.recent_runs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No pipeline runs yet</p>
          ) : (
            <div className="space-y-3">
              {stats.recent_runs.slice(0, 5).map((run) => (
                <div key={run.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="font-medium">{run.query}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(run.started_at).toLocaleDateString()} •
                      {(run as any).location_name || 'No location'}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    run.status === 'completed' ? 'bg-green-100 text-green-800' :
                    run.status === 'failed' ? 'bg-red-100 text-red-800' :
                    run.status === 'running' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {run.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Top Business Categories</h3>
          </div>
          <div className="p-6">
            {stats.top_categories.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No business data yet</p>
            ) : (
              <div className="space-y-2">
                {stats.top_categories.slice(0, 5).map((category) => (
                  <div key={category.category} className="flex justify-between items-center">
                    <span className="text-sm font-medium">{category.category}</span>
                    <span className="text-sm text-gray-600">{category.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Score Distribution</h3>
          </div>
          <div className="p-6">
            {stats.score_distribution.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No score data yet</p>
            ) : (
              <div className="space-y-2">
                {stats.score_distribution.map((score) => (
                  <div key={score.score_range} className="flex justify-between items-center">
                    <span className="text-sm font-medium">{score.score_range}</span>
                    <span className="text-sm text-gray-600">{score.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BusinessLogsTab() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'created_at' | 'overall_score'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/database/businesses', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setBusinesses(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch businesses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBusinesses();
  }, []);

  const sortedBusinesses = [...businesses].sort((a, b) => {
    let aValue = sortBy === 'created_at' ? new Date(a.created_at).getTime() : (a.overall_score || 0);
    let bValue = sortBy === 'created_at' ? new Date(b.created_at).getTime() : (b.overall_score || 0);

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  if (loading) {
    return <div className="text-center py-8">Loading business data...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Business Logs ({businesses.length} businesses)</h3>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'created_at' | 'overall_score')}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="created_at">Sort by Date</option>
              <option value="overall_score">Sort by Score</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm hover:bg-gray-50"
            >
              {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
            </button>
          </div>
        </div>
      </div>
      <div className="p-6">
        {businesses.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No businesses found</p>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {sortedBusinesses.slice(0, 50).map((business) => (
              <div key={business.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-lg">{business.name}</h4>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
                    {business.overall_score ? `${(business.overall_score * 100).toFixed(0)}%` : 'No Score'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">
                      <span className="font-medium">Website:</span>{' '}
                      {business.website ? (
                        <a href={business.website} target="_blank" rel="noopener noreferrer"
                           className="text-blue-600 hover:underline">
                          {business.website}
                        </a>
                      ) : 'No website'}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Phone:</span> {business.phone || 'No phone'}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Category:</span> {business.category}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-600">
                      <span className="font-medium">Address:</span>{' '}
                      {business.address?.formatted || 'No address'}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Created:</span>{' '}
                      {new Date(business.created_at).toLocaleDateString()}
                    </p>
                    {business.scored_at && (
                      <p className="text-gray-600">
                        <span className="font-medium">Scored:</span>{' '}
                        {new Date(business.scored_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {business.overall_note && (
                  <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                    <span className="font-medium">Score Analysis:</span> {business.overall_note}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LocationsTab() {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/database/dashboard', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Extract unique locations from recent runs
          const uniqueLocations = new Map();
          data.data?.recent_runs?.forEach((run: any) => {
            if (run.location_name) {
              uniqueLocations.set(run.location_name, {
                name: run.location_name,
                runs_count: (uniqueLocations.get(run.location_name)?.runs_count || 0) + 1,
                last_run: run.started_at
              });
            }
          });
          setLocations(Array.from(uniqueLocations.values()));
        }
      } catch (error) {
        console.error('Failed to fetch locations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading locations...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold">Location Management ({locations.length} locations)</h3>
      </div>
      <div className="p-6">
        {locations.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No locations found</p>
        ) : (
          <div className="space-y-4">
            {locations.map((location, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-lg">{location.name}</h4>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                    {location.runs_count} run{location.runs_count !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-gray-600 text-sm">
                  <span className="font-medium">Last searched:</span>{' '}
                  {new Date(location.last_run).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PipelineRunsTab() {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/database/dashboard', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setRuns(data.data?.recent_runs || []);
        }
      } catch (error) {
        console.error('Failed to fetch pipeline runs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRuns();
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading pipeline runs...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold">Pipeline Runs ({runs.length} runs)</h3>
      </div>
      <div className="p-6">
        {runs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No pipeline runs found</p>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {runs.map((run) => (
              <div key={run.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-lg">{run.query}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    run.status === 'completed' ? 'bg-green-100 text-green-800' :
                    run.status === 'failed' ? 'bg-red-100 text-red-800' :
                    run.status === 'running' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {run.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">
                      <span className="font-medium">Location:</span> {run.location_name || 'No location'}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Started:</span>{' '}
                      {run.started_at ? new Date(run.started_at).toLocaleString() : 'Unknown'}
                    </p>
                    {run.completed_at && (
                      <p className="text-gray-600">
                        <span className="font-medium">Completed:</span>{' '}
                        {new Date(run.completed_at).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-gray-600">
                      <span className="font-medium">Execution ID:</span>{' '}
                      <code className="text-xs bg-gray-100 px-1 rounded">{run.execution_id || 'N/A'}</code>
                    </p>
                    {run.total_businesses && (
                      <p className="text-gray-600">
                        <span className="font-medium">Businesses Found:</span> {run.total_businesses}
                      </p>
                    )}
                    {run.results_path && (
                      <p className="text-gray-600">
                        <span className="font-medium">Results Path:</span>{' '}
                        <code className="text-xs bg-gray-100 px-1 rounded break-all">
                          {run.results_path.split('\\').pop() || run.results_path}
                        </code>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DatabasePage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('auth_user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.href = '/login';
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab />;
      case 'businesses':
        return <BusinessLogsTab />;
      case 'locations':
        return <LocationsTab />;
      case 'pipeline-runs':
        return <PipelineRunsTab />;
      default:
        return <DashboardTab />;
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">EchoRidge Database</h1>
                <p className="text-sm text-gray-600">Pipeline Management Dashboard</p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Welcome, {user?.email}
                </span>
                <Link
                  href="/"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Search
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4">
              <DatabaseTabs activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>
            <div className="px-6 py-6">
              {renderTabContent()}
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}