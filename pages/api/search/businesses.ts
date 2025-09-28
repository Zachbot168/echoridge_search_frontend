// Public API endpoint for business search (no auth required)
import type { NextApiRequest, NextApiResponse } from 'next';
import DatabaseClient from '../../../lib/database/client';
import { BusinessSearchFilters } from '../../../lib/types/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const db = DatabaseClient.getInstance();

  try {
    const filters: BusinessSearchFilters = {
      query: req.query.query as string,
      category: req.query.category as string,
      min_score: req.query.min_score ? parseFloat(req.query.min_score as string) : undefined,
      max_score: req.query.max_score ? parseFloat(req.query.max_score as string) : undefined,
      has_website: req.query.has_website ? req.query.has_website === 'true' : undefined,
      pipeline_run_id: req.query.pipeline_run_id as string,
      location_id: req.query.location_id as string
    };

    const businesses = db.getBusinesses(filters);

    res.status(200).json({
      success: true,
      data: businesses,
      count: businesses.length
    });

  } catch (error) {
    console.error('Public business search API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}