import { SearchResult } from '../types/SearchResult';

const MOCK_RESULTS: SearchResult[] = [
  {
    title: 'Market Opportunity Assessment',
    snippet: 'Comprehensive analysis revealing strong product-market fit indicators across key customer segments with 78% satisfaction rates.',
    score: 0.94,
    tag: 'Market Research'
  },
  {
    title: 'Customer Retention Analysis',
    snippet: 'Data shows 85% monthly retention with increasing usage patterns, indicating solid PMF foundation for growth.',
    score: 0.89,
    tag: 'Customer Analytics'
  },
  {
    title: 'Competitive Positioning Report',
    snippet: 'Unique value proposition identified with minimal direct competition in target market vertical.',
    score: 0.82,
    tag: 'Competition'
  },
  {
    title: 'Revenue Growth Metrics',
    snippet: 'Consistent 20% month-over-month revenue growth demonstrates sustainable demand and pricing power.',
    score: 0.76,
    tag: 'Financial'
  },
  {
    title: 'Product Usage Insights',
    snippet: 'High feature adoption rates and daily active user growth confirm strong product-market alignment.',
    score: 0.71,
    tag: 'Product Analytics'
  }
];

export async function searchPMF(query: string): Promise<SearchResult[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
  
  // Simulate API errors (10% chance)
  if (Math.random() < 0.1) {
    throw new Error('Search service temporarily unavailable');
  }
  
  // Return empty results for empty queries
  if (!query.trim()) {
    return [];
  }
  
  // Return randomized subset of mock results
  const numResults = 2 + Math.floor(Math.random() * 4);
  return MOCK_RESULTS.slice(0, numResults);
}

// Future backend integration point:
// Replace the above implementation with:
/*
export async function searchPMF(query: string): Promise<SearchResult[]> {
  const response = await fetch('/api/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  
  if (!response.ok) {
    throw new Error('Search request failed');
  }
  
  const data = await response.json();
  return data.results;
}
*/