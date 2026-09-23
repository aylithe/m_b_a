import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

type ValidationShape = {
  body?: unknown;
  query?: unknown;
  params?: unknown;
};

export function validate<T extends ValidationShape>(schema: z.ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const errors = result.error.issues.map((err) => ({
        field: err.path.slice(1).join('.'),
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errors,
        },
      });
    }

    const data = result.data;

    req.body = data.body as typeof req.body;
    req.query = data.query as typeof req.query;
    req.params = data.params as typeof req.params;

    next();
  };
}
