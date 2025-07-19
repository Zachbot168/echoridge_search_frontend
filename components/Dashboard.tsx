import React from 'react';
import { SearchResult } from '../types/SearchResult';
import ResultCard from './ResultCard';

interface DashboardProps {
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ results, isLoading, error, hasSearched }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center py-16">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 text-sm">Searching...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="border border-gray-300 rounded-md p-6 bg-gray-50">
          <p className="text-gray-800 font-medium mb-2">Search Error</p>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Enter a search query above to find PMF insights</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-600">No results found</p>
        <p className="text-gray-500 text-sm mt-1">Try a different search query</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <p className="text-gray-600 text-sm">
          {results.length} result{results.length !== 1 ? 's' : ''} found
        </p>
      </div>
      
      <div className="space-y-4">
        {results.map((result, index) => (
          <ResultCard key={`${result.title}-${index}`} result={result} />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;