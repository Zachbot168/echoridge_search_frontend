import React from 'react';
import { SearchResult } from '../types/SearchResult';

interface ResultCardProps {
  result: SearchResult;
}

const ResultCard: React.FC<ResultCardProps> = ({ result }) => {
  return (
    <div className="border border-gray-300 rounded-md p-6 bg-white">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-black">{result.title}</h3>
        {result.score && (
          <span className="text-sm text-gray-500 ml-4 font-mono">
            {(result.score * 100).toFixed(0)}%
          </span>
        )}
      </div>
      
      <p className="text-gray-700 mb-4 leading-relaxed">
        {result.snippet}
      </p>
      
      {result.tag && (
        <div className="flex justify-start">
          <span className="inline-block bg-gray-100 text-gray-600 px-2 py-1 text-xs font-medium rounded">
            {result.tag}
          </span>
        </div>
      )}
    </div>
  );
};

export default ResultCard;