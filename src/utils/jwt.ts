import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface JWTPayload {
  userId: string;
  email: string;
}

export function signAccessToken(payload: JWTPayload): string {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set');
  }
  const secret: string = env.JWT_SECRET;
  // JWT accepts string formats like "15m", "7d" or numbers in seconds
  const options: SignOptions = {
    expiresIn: parseInt(env.JWT_EXPIRE as string) || 900 as number,
  };
  return jwt.sign(payload, secret, options);
}

export function signRefreshToken(payload: JWTPayload): string {
  if (!env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET is not set');
  }
  const secret: string = env.JWT_REFRESH_SECRET;
  // JWT accepts string formats like "15m", "7d" or numbers in seconds
  const options: SignOptions = {
    expiresIn: parseInt(env.JWT_REFRESH_EXPIRE as string) || 604800 as number,
  };
  return jwt.sign(payload, secret, options);
}

export function verifyAccessToken(token: string): JWTPayload {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set');
  }
  const secret: string = env.JWT_SECRET;
  const decoded = jwt.verify(token, secret);
  if (typeof decoded === 'string' || !decoded || !('userId' in decoded)) {
    throw new Error('Invalid token payload');
  }
  return decoded as JWTPayload;
}

export function verifyRefreshToken(token: string): JWTPayload {
  if (!env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET is not set');
  }
  const secret: string = env.JWT_REFRESH_SECRET;
  const decoded = jwt.verify(token, secret);
  if (typeof decoded === 'string' || !decoded || !('userId' in decoded)) {
    throw new Error('Invalid token payload');
  }
  return decoded as JWTPayload;
}

