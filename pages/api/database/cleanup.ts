// API endpoint for cleaning up corrupted database data
import type { NextApiRequest, NextApiResponse } from 'next';
import DatabaseClient from '../../../lib/database/client';
import { withAuth, AuthenticatedRequest } from '../../../lib/auth/middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const db = DatabaseClient.getInstance();

  try {
    // Get current counts before cleanup
    const beforeStats = db.getDashboardStats();

    // Clear all businesses (they will be re-imported correctly on next pipeline runs)
    const deleteBusinessesResult = db.db.prepare('DELETE FROM businesses').run();

    // Keep pipeline_runs table but reset business counts to 0
    db.db.prepare('UPDATE pipeline_runs SET total_businesses = 0').run();

    // Get counts after cleanup
    const afterStats = db.getDashboardStats();

    res.status(200).json({
      success: true,
      message: 'Database cleaned up successfully',
      data: {
        before: {
          businesses: beforeStats.total_businesses,
          pipeline_runs: beforeStats.total_pipeline_runs
        },
        after: {
          businesses: afterStats.total_businesses,
          pipeline_runs: afterStats.total_pipeline_runs
        },
        businesses_removed: deleteBusinessesResult.changes
      }
    });

  } catch (error) {
    console.error('Database cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Database cleanup failed'
    });
  }
}

export default withAuth(handler);