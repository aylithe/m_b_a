import 'dotenv/config';
import express from 'express';
import authRoutes from './routes/auth';
import documentRoutes from './routes/document';
import adminRoutes from './routes/admin';
import './events/auth.events';
import './events/admin.events';
import './events/document.events';
import './events/cache.events';
import './events/security.events';
import { errorHandler } from './middleware/errorHandler';
import './queues/document.worker';
import { bullBoardAdapter } from './config/bull-board';
import { verifyWebhookSignature } from './middleware/verifyWebhook';
import { authLimiter, apiLimiter } from './middleware/rateLimiter';

const app = express();
const port = 3000;

const secret = process.env.WEBHOOK_SECRET;

app.use(
  '/webhooks',
  verifyWebhookSignature(secret!, 'x-signature'),
  express.raw({
    type: 'application/json',
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/admin', adminRoutes);

// Auth routes: IP-based limiting
app.use('/api/v1/auth', authLimiter, authRoutes);

// All authenticated API routes: general limiter
app.use('/api/v1', apiLimiter);

app.use('/admin/queues', bullBoardAdapter.getRouter());

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.path} not found` },
  });
});

// Global error handler (MUST be last)
app.use(errorHandler);
