// API endpoint for pipeline run management
import type { NextApiRequest, NextApiResponse } from 'next';
import DatabaseClient from '../../../lib/database/client';
import { withAuth, AuthenticatedRequest } from '../../../lib/auth/middleware';
import { PipelineRunFilters } from '../../../lib/types/database';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const db = DatabaseClient.getInstance();

  try {
    if (req.method === 'GET') {
      // Get pipeline runs with optional filtering
      const filters: PipelineRunFilters = {
        status: req.query.status as string,
        location_id: req.query.location_id as string,
        query: req.query.query as string,
        date_from: req.query.date_from as string,
        date_to: req.query.date_to as string
      };

      const runs = db.getPipelineRuns(filters);

      res.status(200).json({
        success: true,
        data: runs,
        count: runs.length
      });

    } else if (req.method === 'POST') {
      // Create new pipeline run
      const { query, location_id, execution_id } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Query is required'
        });
      }

      const runId = db.createPipelineRun(query, location_id, execution_id);

      res.status(201).json({
        success: true,
        data: { id: runId }
      });

    } else if (req.method === 'PUT') {
      // Update pipeline run status/results
      const { id } = req.query;
      const updates = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Pipeline run ID is required'
        });
      }

      db.updatePipelineRun(id as string, updates);

      res.status(200).json({
        success: true,
        message: 'Pipeline run updated'
      });

    } else {
      res.status(405).json({ success: false, error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Pipeline runs API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

export default withAuth(handler);