import crypto from 'crypto';
import { appEvents } from '../lib/events';
import { AUTH_EVENTS } from '../events/auth.events';
import { refreshTokenRepository, userRepository } from '../repositories/index';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../lib/tokens';
import { hashPassword, verifyPassword } from '../lib/password';

const REFRESH_TOKEN_EXPIRATION_PERIOD = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function register(data: { email: string; name: string; password: string }) {
  const existing = await userRepository.findByEmail(data.email);
  if (existing) throw new Error('Email already registered');
  const passwordHash = await hashPassword(data.password);
  const user = await userRepository.create({
    email: data.email.toLowerCase().trim(),
    passwordHash,
    name: data.name,
  });

  // Emit and move on. Don't wait for listeners.
  appEvents.emit(AUTH_EVENTS.USER_REGISTERED, {
    id: user.id,
    email: user.email,
    tier: user.tier,
  });

  return { id: user.id, email: user.email, tier: user.tier };
}

export async function login(data: { email: string; password: string; deviceInfo?: string }) {
  const user = await userRepository.findByEmail(data.email);

  if (!user || !user.isActive) {
    // Emit the failure event before throwing
    appEvents.emit(AUTH_EVENTS.LOGIN_FAILED, {
      email: data.email,
      deviceInfo: data.deviceInfo,
      reason: 'user_not_found',
    });
    throw new Error('Invalid credentials');
  }

  const valid = await verifyPassword(data.password, user.passwordHash);
  if (!valid) {
    appEvents.emit(AUTH_EVENTS.LOGIN_FAILED, {
      email: data.email,
      deviceInfo: data.deviceInfo,
      reason: 'wrong_password',
    });
    throw new Error('Invalid credentials');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  await refreshTokenRepository.create({
    userId: user.id,
    token: tokenHash,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRATION_PERIOD),
  });

  // Emit success event
  appEvents.emit(AUTH_EVENTS.USER_LOGGED_IN, {
    userId: user.id,
    deviceInfo: data.deviceInfo,
  });

  return { accessToken, refreshToken, user: { id: user.id, email: user.email, tier: user.tier } };
}

export async function refresh(rawRefreshToken: string) {
  // Verify the JWT signature and expiration
  let payload;
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new Error('Invalid refresh token');
  }

  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }

  // Check if this token exists in the database (not revoked)
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

  const stored = await refreshTokenRepository.findByToken(tokenHash);

  if (!stored || stored.expiresAt < new Date()) {
    throw new Error('Refresh token expired or revoked');
  }

  // Get the user
  const user = await userRepository.findById(payload.sub);
  if (!user || !user.isActive) {
    throw new Error('User not found or inactive');
  }

  // Rotate: delete the old token, create a new one
  await refreshTokenRepository.delete({ token: tokenHash });

  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);
  const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

  await refreshTokenRepository.create({
    userId: user.id,
    token: newHash,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRATION_PERIOD),
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function logout(rawRefreshToken: string) {
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

  // Delete the token. If it doesn't exist, that's fine.
  await refreshTokenRepository.delete({
    token: tokenHash,
  });
}
