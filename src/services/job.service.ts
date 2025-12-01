import { prisma } from '../db/prisma';

export async function createJob(data: {
  type: string;
  userId: string;
  payload: unknown;
  runAt?: Date;
}) {
  return prisma.job.create({
    data: {
      type: data.type,
      userId: data.userId,
      payload: data.payload as object,
      status: 'queued',
      runAt: data.runAt || new Date(),
    },
  });
}

export async function claimNextJob() {
  // Use FOR UPDATE SKIP LOCKED to ensure only one worker processes each job
  const result = await prisma.$queryRaw<unknown[]>`
    SELECT * FROM "Job"
    WHERE status = 'queued' AND "runAt" <= NOW()
    ORDER BY "runAt" ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  `;

  if (result.length === 0) return null;

  const job = result[0] as {
    id: string;
    type: string;
    userId: string;
    payload: unknown;
    status: string;
    attempts: number;
    maxAttempts: number;
  };

  // Mark as processing
  await prisma.job.update({
    where: { id: job.id },
    data: { status: 'processing' },
  });

  return job;
}

export async function updateJob(
  id: string,
  data: {
    status?: string;
    result?: unknown;
    error?: string;
    nextRunAt?: Date;
    attempts?: number;
  }
) {
  return prisma.job.update({
    where: { id },
    data,
  });
}

