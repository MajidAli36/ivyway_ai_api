import { prisma } from '../db/prisma';

/**
 * Execute operations within a database transaction
 */
export async function withTransaction<T>(
  callback: (tx: typeof prisma) => Promise<T>
): Promise<T> {
  return prisma.$transaction(callback, {
    maxWait: 5000,
    timeout: 10000,
  });
}

