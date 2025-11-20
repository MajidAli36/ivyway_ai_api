import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import * as plannerService from '../services/planner.service';

export async function createTask(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const result = await plannerService.createTask(userId, req.body);
  res.status(201).json({ task: result });
}

export async function getTasks(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const status = req.query.status as string | undefined;

  const tasks = await plannerService.getTasks(userId, status);
  res.json({ tasks });
}

export async function updateTask(req: AuthRequest, res: Response): Promise<void> {
  const { taskId } = req.params;
  const { status } = req.body;

  const result = await plannerService.updateTaskStatus(taskId, status);
  res.json({ task: result });
}

