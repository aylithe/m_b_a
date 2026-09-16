import { PrismaClient } from '@prisma/client';

// Create ONE instance and export it
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
});
