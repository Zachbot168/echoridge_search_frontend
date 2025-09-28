// API endpoint for location management
import type { NextApiRequest, NextApiResponse } from 'next';
import DatabaseClient from '../../../lib/database/client';
import { withAuth, AuthenticatedRequest } from '../../../lib/auth/middleware';
import { CreateLocationInput } from '../../../lib/types/database';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const db = DatabaseClient.getInstance();

  try {
    if (req.method === 'GET') {
      // Get all locations
      const locations = db.getLocations();

      res.status(200).json({
        success: true,
        data: locations,
        count: locations.length
      });

    } else if (req.method === 'POST') {
      // Create new location
      const locationData: CreateLocationInput = req.body;

      if (!locationData.name || !locationData.center_lat || !locationData.center_lon) {
        return res.status(400).json({
          success: false,
          error: 'name, center_lat, and center_lon are required'
        });
      }

      const locationId = db.createLocation(locationData);

      res.status(201).json({
        success: true,
        data: { id: locationId }
      });

    } else {
      res.status(405).json({ success: false, error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Locations API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

export default withAuth(handler);