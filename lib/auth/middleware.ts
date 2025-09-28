// Authentication middleware for API routes
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken, extractTokenFromHeader, JWTPayload } from './jwt';

export interface AuthenticatedRequest extends NextApiRequest {
  user: JWTPayload;
}

export function withAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const token = extractTokenFromHeader(req.headers.authorization);

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Authorization token required'
        });
      }

      const payload = verifyToken(token);

      if (!payload) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }

      // Add user to request object
      (req as AuthenticatedRequest).user = payload;

      return handler(req as AuthenticatedRequest, res);

    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
}

export function withAdminAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void
) {
  return withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    return handler(req, res);
  });
}