import React, { useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SearchBar from '../components/SearchBar';
import Dashboard from '../components/Dashboard';
import LeafletMapSelector from '../components/LeafletMapSelector';
import AuthGuard from '../components/AuthGuard';
import { searchPMF } from '../lib/api';
import { saveQuery } from '../lib/db';
import { SearchResult } from '../types/SearchResult';

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
}

const initialState: SearchState = {
  results: [],
  isLoading: false,
  error: null,
  hasSearched: false,
};

export default function Home() {
  const router = useRouter();
  const [state, setState] = useState<SearchState>(initialState);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    radius: number;
  } | null>(null);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    router.push('/login');
  }, [router]);

  const handleSearch = useCallback(async (query: string, options?: any) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      hasSearched: true,
    }));

    try {
      const results = await searchPMF(query, selectedLocation || undefined);
      setState(prev => ({
        ...prev,
        results,
        isLoading: false,
      }));

      // Save query and response to database
      try {
        const avgScore = results.length > 0 
          ? results.reduce((sum, r) => sum + r.score, 0) / results.length 
          : 0;
        
        await saveQuery(query, results, { 
          model: 'mock-v0', 
          score: Number(avgScore.toFixed(3)),
          resultsCount: results.length
        });
      } catch (dbError) {
        console.error('Failed to save query to database:', dbError);
        // Don't fail the search if database save fails
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Search failed',
        results: [],
        isLoading: false,
      }));
    }
  }, []);

  const handleLocationSelect = useCallback((location: { lat: number; lng: number; radius: number }) => {
    setSelectedLocation(location);
    console.log('Selected location:', location);
  }, []);

  const openMap = useCallback(() => {
    setIsMapOpen(true);
  }, []);

  const closeMap = useCallback(() => {
    setIsMapOpen(false);
  }, []);

  return (
    <AuthGuard>
      <Head>
        <title>Project Echo Ridge Search</title>
        <meta name="description" content="PMF Search Engine - Production Ready" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen bg-white">
        <div className="container mx-auto px-6 py-12">
          <nav className="flex justify-end space-x-6 mb-8">
            <Link
              href="/database"
              className="text-gray-600 hover:text-black font-medium"
            >
              Database
            </Link>
            <Link
              href="/about"
              className="text-gray-600 hover:text-black font-medium"
            >
              About
            </Link>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-red-600 font-medium"
            >
              Logout
            </button>
          </nav>

          <header className="text-center mb-16">
            <h1 className="text-3xl font-bold text-black tracking-tight">
              Project Echo Ridge Search
            </h1>
          </header>

          <div className="max-w-5xl mx-auto">
            <SearchBar
              onSearch={handleSearch}
              isLoading={state.isLoading}
              selectedLocation={selectedLocation}
              onClearLocation={() => setSelectedLocation(null)}
            />
            
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8">
              <button
                onClick={openMap}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 font-medium"
              >
                🗺️ Select Location
              </button>
              {selectedLocation && (
                <div className="text-sm text-gray-600 flex items-center text-center sm:text-left">
                  📍 {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)} 
                  <br className="sm:hidden" />
                  <span className="sm:ml-1">
                    ({selectedLocation.radius >= 1000 
                      ? `${(selectedLocation.radius / 1000).toFixed(1)}km` 
                      : `${selectedLocation.radius}m`} radius)
                  </span>
                </div>
              )}
            </div>

            <Dashboard 
              results={state.results}
              isLoading={state.isLoading}
              error={state.error}
              hasSearched={state.hasSearched}
            />
          </div>
        </div>

        <LeafletMapSelector
          isOpen={isMapOpen}
          onSelect={handleLocationSelect}
          onClose={closeMap}
        />
      </main>
    </AuthGuard>
  );
}