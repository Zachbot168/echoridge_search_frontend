// API endpoint for business data management
import type { NextApiRequest, NextApiResponse } from 'next';
import DatabaseClient from '../../../lib/database/client';
import { withAuth, AuthenticatedRequest } from '../../../lib/auth/middleware';
import { BusinessSearchFilters } from '../../../lib/types/database';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const db = DatabaseClient.getInstance();

  try {
    if (req.method === 'GET') {
      // Get businesses with optional filtering
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

    } else if (req.method === 'POST') {
      // Create new business (for manual entries or imports)
      const businessData = req.body;

      if (!businessData.entity_id || !businessData.pipeline_run_id || !businessData.name) {
        return res.status(400).json({
          success: false,
          error: 'entity_id, pipeline_run_id, and name are required'
        });
      }

      const businessId = db.createBusiness(businessData);

      res.status(201).json({
        success: true,
        data: { id: businessId }
      });

    } else {
      res.status(405).json({ success: false, error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Businesses API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

export default withAuth(handler);