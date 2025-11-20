import { prisma } from '../db/prisma';
import { nextOccurrence } from '../utils/rrule';

export async function createTask(userId: string, data: any) {
  const { title, details, due, repeat } = data;

  return prisma.studyTask.create({
    data: {
      userId,
      title,
      details,
      due: new Date(due),
      repeat,
      status: 'pending',
    },
  });
}

export async function getTasks(userId: string, status?: string) {
  const where: any = { userId };
  if (status) {
    where.status = status;
  }

  return prisma.studyTask.findMany({
    where,
    orderBy: { due: 'asc' },
  });
}

export async function updateTaskStatus(taskId: string, status: string) {
  const task = await prisma.studyTask.findUnique({
    where: { id: taskId },
  });

  if (!task) throw new Error('Task not found');

  // If task is recurring and completed, create next occurrence
  if (task.repeat && status === 'completed') {
    const nextDue = nextOccurrence(task.repeat, new Date());
    if (nextDue) {
      await prisma.studyTask.create({
        data: {
          userId: task.userId,
          title: task.title,
          details: task.details,
          due: nextDue,
          repeat: task.repeat,
          status: 'pending',
        },
      });
    }
  }

  return prisma.studyTask.update({
    where: { id: taskId },
    data: { status },
  });
}

