import { appEvents } from '../lib/events';
import { logger } from '../lib/logger';
import { usageLogRepository, conversationRepository } from '../repositories/index';

// ── Define the event names as constants ─────────────
export const AUTH_EVENTS = {
  USER_REGISTERED: 'auth:user-registered',
  USER_LOGGED_IN: 'auth:user-logged-in',
  USER_LOGGED_OUT: 'auth:user-logged-out',
  TOKEN_REFRESHED: 'auth:token-refreshed',
  LOGIN_FAILED: 'auth:login-failed',
};

// ── Register listeners ─────────────────────────────

// Listener 1: Log signups for analytics
appEvents.on(AUTH_EVENTS.USER_REGISTERED, async (user) => {
  try {
    await usageLogRepository.create({
      userId: user.id,
      action: 'signup',
      tokens: 0,
      costUsd: 0,
      metadata: {
        email: user.email,
        tier: user.tier,
        registeredAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    // Log but don't crash. This is a side effect.
    logger.error('Failed to log signup', {
      userId: user.id,
      email: user.email,
      correlationId: user.correlationId,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
  }
});

// Listener 2: Create a default welcome conversation
appEvents.on(AUTH_EVENTS.USER_REGISTERED, async (user) => {
  try {
    await conversationRepository.create({
      userId: user.id,
      title: 'Welcome to DocuChat',
    });
  } catch (error) {
    logger.error('Failed to create welcome conversation', {
      userId: user.id,
      email: user.email,
      correlationId: user.correlationId,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
  }
});

// Listener 3: Log login events (useful for security audits)
appEvents.on(AUTH_EVENTS.USER_LOGGED_IN, async (data) => {
  try {
    await usageLogRepository.create({
      userId: data.userId,
      action: 'login',
      tokens: 0,
      costUsd: 0,
      metadata: {
        deviceInfo: data.deviceInfo,
        loginAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to log login', {
      userId: data.userId,
      deviceInfo: data.deviceInfo,
      correlationId: data.correlationId,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
  }
});

// Listener 4: Track failed login attempts
appEvents.on(AUTH_EVENTS.LOGIN_FAILED, async (data) => {
  try {
    logger.warn('Failed login attempt', {
      email: data.email,
      deviceInfo: data.deviceInfo,
      correlationId: data.correlationId,
    });
    // In Week 3 we'll add rate limiting based on failed attempts
  } catch (error) {
    logger.error('Failed to log failed login', {
      email: data.email,
      deviceInfo: data.deviceInfo,
      correlationId: data.correlationId,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
  }
});
