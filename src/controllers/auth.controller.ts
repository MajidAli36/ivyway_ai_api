import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../db/prisma';
import * as authService from '../services/auth.service';

export async function register(req: AuthRequest, res: Response): Promise<void> {
  const data = req.body;
  const result = await authService.registerUser(data);
  
  // Map fullName to name for frontend compatibility
  res.status(201).json({
    ...result,
    user: {
      ...result.user,
      name: result.user.fullName,
    },
  });
}

export async function login(req: AuthRequest, res: Response): Promise<void> {
  const data = req.body;
  const result = await authService.loginUser(data);
  
  // Map fullName to name for frontend compatibility
  res.json({
    ...result,
    user: {
      ...result.user,
      name: result.user.fullName,
    },
  });
}

export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      bio: true,
      profileImage: true,
      language: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Map fullName to name for frontend compatibility
  res.json({ 
    user: {
      ...user,
      name: user.fullName,
    }
  });
}

export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const data = req.body;
  const result = await authService.updateUserProfile(userId, data);
  
  // Map fullName to name for frontend compatibility
  res.json({
    user: {
      ...result.user,
      name: result.user.fullName,
    },
  });
}

export async function refreshToken(req: AuthRequest, res: Response): Promise<void> {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token is required' });
    return;
  }

  const result = await authService.refreshUserTokens(refreshToken);
  
  res.json({
    ...result,
    user: {
      ...result.user,
      name: result.user.fullName,
    },
  });
}

export async function logout(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  await authService.logoutUser(userId);
  
  res.json({ message: 'Logged out successfully' });
}

