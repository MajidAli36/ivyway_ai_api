import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../utils/jwt';
import { prisma } from '../db/prisma';

export interface AuthRequest extends Request {
  user?: JWTPayload & { id: string };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Unauthorized: Invalid user' });
      return;
    }

    req.user = { ...payload, id: user.id };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

/**
 * Optional authentication - doesn't fail if no token (for guest users)
 */
export async function authenticateOptional(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      // No token - allow as guest
      req.user = undefined;
      next();
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true },
    });

    if (user) {
      req.user = { ...payload, id: user.id };
    } else {
      req.user = undefined;
    }
    
    next();
  } catch (error) {
    // Invalid token - allow as guest
    req.user = undefined;
    next();
  }
}

export function authorize(..._roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // For now, we'll implement role check if needed
    // You can extend this to check roles from the database
    next();
  };
}

