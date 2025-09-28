// API endpoint for dashboard statistics
import type { NextApiRequest, NextApiResponse } from 'next';
import DatabaseClient from '../../../lib/database/client';
import { withAuth, AuthenticatedRequest } from '../../../lib/auth/middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const db = DatabaseClient.getInstance();

  try {
    if (req.method === 'GET') {
      const stats = db.getDashboardStats();

      res.status(200).json({
        success: true,
        data: stats
      });

    } else {
      res.status(405).json({ success: false, error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

export default withAuth(handler);