import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

interface TokenPayload {
  sub: string; // User ID
  role: string; // User role/tier
  type: 'access' | 'refresh';
}

interface User {
  id: string;
  tier: string;
}

type TokenType = 'access' | 'refresh';

type TokenExpiration = '15m' | '7d';

export function generateToken({
  user,
  type,
  secret,
  expiresIn,
}: {
  user: User;
  type: TokenType;
  secret: string;
  expiresIn: TokenExpiration;
}) {
  return jwt.sign({ sub: user.id, role: user.tier, type: type }, secret, { expiresIn: expiresIn });
}

export function generateAccessToken(user: { id: string; tier: string }) {
  return generateToken({
    user,
    type: 'access',
    secret: ACCESS_SECRET,
    expiresIn: '15m',
  });
}

export function generateRefreshToken(user: { id: string; tier: string }) {
  return generateToken({
    user,
    type: 'refresh',
    secret: REFRESH_SECRET,
    expiresIn: '7d',
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
}
