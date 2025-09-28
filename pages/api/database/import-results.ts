// API endpoint for importing pipeline results
import type { NextApiRequest, NextApiResponse } from 'next';
import DatabaseClient from '../../../lib/database/client';
import fs from 'fs';
import path from 'path';

interface ImportRequest {
  execution_id: string;
  query: string;
  location_name?: string;
  results_path: string;
  status: 'completed' | 'failed';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { execution_id, query, location_name, results_path, status }: ImportRequest = req.body;

    if (!execution_id || !query || !results_path) {
      return res.status(400).json({
        success: false,
        error: 'execution_id, query, and results_path are required'
      });
    }

    const db = DatabaseClient.getInstance();

    // Find or create location
    let location_id = null;
    if (location_name) {
      const locations = db.getLocations();
      const location = locations.find(loc =>
        loc.name.toLowerCase() === location_name.toLowerCase() ||
        loc.aliases.some(alias => alias.toLowerCase() === location_name.toLowerCase())
      );
      location_id = location?.id || null;
    }

    // Create or update pipeline run
    const existingRuns = db.getPipelineRuns({ execution_id });
    let runId: string;

    if (existingRuns.length > 0) {
      runId = existingRuns[0].id;
      db.updatePipelineRun(runId, {
        status,
        completed_at: new Date().toISOString(),
        results_path
      });
    } else {
      runId = db.createPipelineRun(query, location_id, execution_id);
      db.updatePipelineRun(runId, {
        status,
        completed_at: new Date().toISOString(),
        results_path
      });
    }

    // Import business data if status is completed
    if (status === 'completed') {
      try {
        // Look for places_norm.jsonl in the results directory
        const normalizedPath = path.join(results_path, 'places', 'places_norm.jsonl');

        if (fs.existsSync(normalizedPath)) {
          const rawData = fs.readFileSync(normalizedPath, 'utf-8');
          // Parse JSONL format (one JSON object per line)
          const businessData = rawData.trim().split('\n').map(line => JSON.parse(line));

          // Also load scores if available
          const scoresPath = path.join(results_path, 'scores', 'scores_condensed.jsonl');
          let scoresData: any[] = [];
          if (fs.existsSync(scoresPath)) {
            const scoresRawData = fs.readFileSync(scoresPath, 'utf-8');
            scoresData = scoresRawData.trim().split('\n').map(line => JSON.parse(line));
          }

          // Create a map of scores by entity_id for quick lookup
          const scoresMap = new Map();
          scoresData.forEach(score => {
            scoresMap.set(score.entity_id, score);
          });

          if (Array.isArray(businessData)) {
            const businesses = businessData.map((business: any) => {
              // Get the corresponding scores for this business
              const scoreData = scoresMap.get(business.entity_id);

              return {
                entity_id: business.entity_id || business.name?.replace(/\s+/g, '_').toLowerCase(),
                pipeline_run_id: runId,
                name: business.name,
                category: business.category || business.metadata?.types?.[0],
                website: business.website,
                phone: business.phone,
                address: business.address ? {
                  formatted: business.address.formatted,
                  line1: business.address.line1,
                  city: business.address.city,
                  region: business.address.region,
                  postal: business.address.postal,
                  country: business.address.country
                } : undefined,
                lat: business.lat,
                lon: business.lon,
                google_data: {
                  rating: business.metadata?.rating,
                  ratings_count: business.metadata?.ratings_count,
                  business_status: business.metadata?.business_status,
                  price_level: business.metadata?.price_level,
                  types: business.metadata?.types,
                  hours: business.metadata?.hours,
                  raw_data: business.metadata?.raw_data
                },
                scores: scoreData?.dimb_scores ? {
                  D: scoreData.dimb_scores.D,
                  O: scoreData.dimb_scores.O,
                  I: scoreData.dimb_scores.I,
                  M: scoreData.dimb_scores.M,
                  B: scoreData.dimb_scores.B
                } : undefined,
                overall_score: scoreData?.overall_score || business.overall_score || business.final_score,
                overall_note: scoreData?.overall_note || business.overall_note || business.note,
                scored_at: scoreData?.scored_at ? new Date(scoreData.scored_at).toISOString() : undefined
              };
            });

            // Bulk import businesses
            db.bulkCreateBusinesses(businesses);

            // Update pipeline run with business count
            db.updatePipelineRun(runId, {
              total_businesses: businesses.length
            });

            res.status(200).json({
              success: true,
              message: `Imported ${businesses.length} businesses for pipeline run`,
              data: {
                pipeline_run_id: runId,
                businesses_imported: businesses.length
              }
            });
          } else {
            res.status(200).json({
              success: true,
              message: 'Pipeline run recorded, but no valid business data found',
              data: { pipeline_run_id: runId }
            });
          }
        } else {
          res.status(200).json({
            success: true,
            message: 'Pipeline run recorded, but places_norm.jsonl not found',
            data: { pipeline_run_id: runId }
          });
        }
      } catch (parseError) {
        console.error('Error parsing business data:', parseError);
        res.status(200).json({
          success: true,
          message: 'Pipeline run recorded, but failed to parse business data',
          data: { pipeline_run_id: runId }
        });
      }
    } else {
      res.status(200).json({
        success: true,
        message: 'Pipeline run recorded with failed status',
        data: { pipeline_run_id: runId }
      });
    }

  } catch (error) {
    console.error('Import results error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}