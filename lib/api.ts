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

export async function searchPMF(query: string, geofence?: { lat: number; lng: number; radius: number }, maxResults: number = 5): Promise<SearchResult[]> {
  // Return empty results for empty queries
  if (!query.trim()) {
    return [];
  }

  try {
    // First, try to search existing database for historical results
    console.log('Searching database for existing results...');
    try {
      const response = await fetch(`/api/search/businesses?query=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.length > 0) {
          console.log(`Found ${data.data.length} existing results in database`);
          // Transform database results to SearchResult format
          const existingResults = data.data.map((business: any) => ({
            title: business.name,
            snippet: `${business.website ? `${business.website} | ` : ''}${business.address?.formatted || `${business.address?.city}, ${business.address?.region}`} | Final Score: ${(business.overall_score || 0).toFixed(2)} | ${business.phone || 'No phone'}`,
            score: business.overall_score || 0,
            tag: 'Database Result',
            metadata: {
              id: business.id,
              entity_id: business.entity_id,
              coordinates: { lat: business.lat, lng: business.lon },
              scores: business.scores,
              overall_note: business.overall_note
            }
          }));

          if (existingResults.length >= 10) {
            return existingResults;
          }
        }
      }
    } catch (dbError) {
      console.warn('Database search failed, falling back to pipeline:', dbError);
    }

    // If no sufficient database results, run fresh pipeline
    console.log('Running fresh pipeline search...');
    const pipelineApiUrl = process.env.NEXT_PUBLIC_PIPELINE_API_BASE_URL || 'http://localhost:8082';

    // Prepare request payload
    const requestPayload: any = {
      query: query,
      max_results: maxResults,
      provider: 'google'
    };

    // Add geofence if provided
    if (geofence) {
      requestPayload.geofence = {
        type: 'center',
        coordinates: [geofence.lat, geofence.lng, geofence.radius]
      };
    }

    console.log('Starting pipeline execution:', requestPayload);

    // Step 1: Execute pipeline
    const executeResponse = await fetch(`${pipelineApiUrl}/v1/pipeline/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    if (!executeResponse.ok) {
      throw new Error(`Pipeline execution failed: ${executeResponse.status}`);
    }

    const { job_id } = await executeResponse.json();
    console.log('Pipeline job started:', job_id);

    // Step 2: Poll for completion
    let attempts = 0;
    const maxAttempts = 60; // 10 minutes max (10s intervals)

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      attempts++;

      const statusResponse = await fetch(`${pipelineApiUrl}/v1/pipeline/status/${job_id}`);
      if (!statusResponse.ok) {
        throw new Error(`Status check failed: ${statusResponse.status}`);
      }

      const status = await statusResponse.json();
      console.log(`Pipeline status (attempt ${attempts}):`, status.status, status.message);

      // Fetch and display logs for better debugging
      try {
        const logsResponse = await fetch(`${pipelineApiUrl}/v1/pipeline/logs/${job_id}`);
        if (logsResponse.ok) {
          const logsData = await logsResponse.json();
          console.log('Pipeline logs:', logsData.logs);
          if (logsData.logs && logsData.logs.length > 0) {
            console.log('Latest pipeline output:', logsData.logs.slice(-5).join('\n'));
          }
        }
      } catch (logError) {
        console.warn('Could not fetch logs:', logError);
      }

      if (status.status === 'completed') {
        // Step 3: Get results
        const resultsResponse = await fetch(`${pipelineApiUrl}/v1/pipeline/results/${job_id}`);
        if (!resultsResponse.ok) {
          throw new Error(`Results fetch failed: ${resultsResponse.status}`);
        }

        const results = await resultsResponse.json();
        console.log('Pipeline completed, results:', results.results.companies.length, 'companies');

        // Wait a moment for the import to complete, then fetch from database
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
          const dbResponse = await fetch(`/api/search/businesses?query=${encodeURIComponent(query)}`);
          if (dbResponse.ok) {
            const dbData = await dbResponse.json();
            if (dbData.success && dbData.data && dbData.data.length > 0) {
              console.log('Successfully retrieved results from database after pipeline import');
              return dbData.data.map((business: any) => ({
                title: business.name,
                snippet: `${business.website ? `${business.website} | ` : ''}${business.address?.formatted || `${business.address?.city}, ${business.address?.region}`} | Final Score: ${(business.overall_score || 0).toFixed(2)} | ${business.phone || 'No phone'}`,
                score: business.overall_score || 0,
                tag: 'Fresh Result',
                metadata: {
                  id: business.id,
                  entity_id: business.entity_id,
                  coordinates: { lat: business.lat, lng: business.lon },
                  scores: business.scores,
                  overall_note: business.overall_note
                }
              }));
            }
          }
        } catch (dbError) {
          console.warn('Failed to fetch from database after pipeline, using pipeline results:', dbError);
        }

        // Fallback to pipeline results if database fetch fails
        return results.results.companies.map((company: any) => ({
          title: company.name,
          snippet: `${company.domain ? `${company.domain} | ` : ''}${company.address || `${company.city}, ${company.state}`} | Final Score: ${(company.final_score || 0).toFixed(2)} | ${company.phone || 'No phone'}`,
          score: company.final_score || 0,
          tag: 'Fresh Result',
          metadata: {
            id: company.id,
            coordinates: company.coordinates,
            rating: company.rating,
            total_ratings: company.total_ratings
          }
        }));

      } else if (status.status === 'failed') {
        throw new Error(`Pipeline failed: ${status.error || status.message}`);
      }

      // Continue polling for pending/running status
    }

    throw new Error('Pipeline execution timed out (10 minutes)');

  } catch (error) {
    console.error('Pipeline search error:', error);

    // Fallback to historical catalog search if pipeline fails
    try {
      console.log('Falling back to historical catalog...');
      const catalogApiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8081';
      const response = await fetch(`${catalogApiUrl}/v1/catalog/companies?q=${encodeURIComponent(query)}&limit=10`);

      if (response.ok) {
        const data = await response.json();
        return data.companies.map((company: any) => ({
          title: company.name,
          snippet: `${company.domain ? `${company.domain} | ` : ''}${company.city}, ${company.state} | Final Score: ${company.final_score.toFixed(2)} | Industry: ${company.industry}`,
          score: company.final_score,
          tag: 'Historical'
        }));
      }
    } catch (fallbackError) {
      console.error('Fallback search also failed:', fallbackError);
    }

    throw new Error('Search service temporarily unavailable');
  }
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