import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../db/prisma';
import * as authService from '../services/auth.service';

export async function register(req: AuthRequest, res: Response): Promise<void> {
  const data = req.body;
  const result = await authService.registerUser(data);
  res.status(201).json(result);
}

export async function login(req: AuthRequest, res: Response): Promise<void> {
  const data = req.body;
  const result = await authService.loginUser(data);
  res.json(result);
}

export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      language: true,
      timezone: true,
      createdAt: true,
      Profile: true,
    },
  });

  res.json({ user });
}

