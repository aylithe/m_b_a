import { Router } from 'express';
import * as authService from '../services/auth.services';
import { logger } from '../lib/logger';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const correlationId = req.correlationId;
    logger.info('Register request received', {
      correlationId,
      email: req.body?.email,
      userAgent: req.headers['user-agent'],
    });
    const user = await authService.register({ ...req.body, correlationId });
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const correlationId = req.correlationId;
    const result = await authService.login({
      ...req.body,
      deviceInfo: req.headers['user-agent'],
      correlationId,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const result = await authService.refresh(req.body.refreshToken);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    await authService.logout(req.body.refreshToken);
    res.json({ message: 'Logged out' });
  } catch (error) {
    next(error);
  }
});

export default router;
