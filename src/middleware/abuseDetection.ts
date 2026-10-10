import { Request, Response, NextFunction } from 'express';
import { cacheRedis } from '../lib/cache';
import { logger } from '../lib/logger';

export async function trackSuspiciousActivity(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.id;
  const correlationId = (req as any).correlationId;
  if (!userId) return next();

  // Track unique documents accessed in last 5 minutes
  if (req.path.match(/\/documents\/[\w-]+$/)) {
    const key = `access-pattern:${userId}`;
    const docId = typeof req.params?.id === 'string' ? req.params.id : undefined;

    if (docId) {
      await cacheRedis.sadd(key, docId);
      await cacheRedis.expire(key, 300); // 5 minute window

      const uniqueDocs = await cacheRedis.scard(key);
      if (uniqueDocs > 50) {
        logger.warn('Suspicious document access burst', {
          correlationId,
          userId,
          documentId: docId,
          uniqueDocs,
          windowSeconds: 300,
        });
        // In production: emit event, alert admin, temporarily throttle
      }
    }
  }

  next();
}
