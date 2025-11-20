import cron from 'node-cron';
import { prisma } from '../db/prisma';

export function startDailyScheduler() {
  // Run at midnight every day
  cron.schedule('0 0 * * *', async () => {
    console.log('📅 Generating daily challenges...');

    try {
      // Get all users with timezone
      const users = await prisma.user.findMany({
        select: { id: true },
      });

      // Create daily challenge job for each user
      const jobs = users.map(user => ({
        type: 'daily_challenge',
        userId: user.id,
        payload: {},
        status: 'queued' as const,
        runAt: new Date(),
      }));

      if (jobs.length > 0) {
        await prisma.job.createMany({ data: jobs });
        console.log(`✅ Created ${jobs.length} daily challenge jobs`);
      }
    } catch (error) {
      console.error('❌ Error creating daily challenges:', error);
    }
  });

  console.log('✅ Daily scheduler started');
}

