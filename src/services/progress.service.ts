import { prisma } from '../db/prisma';

/**
 * Calculate XP based on activity type and score
 */
export function calculateXP(type: 'lesson' | 'quiz' | 'task', score?: number): number {
  switch (type) {
    case 'lesson':
      return 10;
    case 'quiz':
      return 20 + (score ? Math.floor(score / 10) : 0); // Base 20 + bonus for high score
    case 'task':
      return 5;
    default:
      return 0;
  }
}

/**
 * Calculate user level based on total XP
 */
export function calculateLevel(totalXP: number): number {
  return Math.floor(Math.sqrt(totalXP / 10)) + 1;
}

/**
 * Get or create today's daily activity record
 */
export async function getOrCreateDailyActivity(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activity = await prisma.dailyActivity.upsert({
    where: {
      userId_activityDate: {
        userId,
        activityDate: today,
      },
    },
    create: {
      userId,
      activityDate: today,
    },
    update: {},
  });

  return activity;
}

/**
 * Update daily activity
 */
export async function updateDailyActivity(
  userId: string,
  updates: {
    lessonsCompleted?: number;
    quizzesCompleted?: number;
    tasksCompleted?: number;
    timeSpent?: number;
    xpEarned?: number;
  }
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activity = await prisma.dailyActivity.upsert({
    where: {
      userId_activityDate: {
        userId,
        activityDate: today,
      },
    },
    create: {
      userId,
      activityDate: today,
      lessonsCompleted: updates.lessonsCompleted || 0,
      quizzesCompleted: updates.quizzesCompleted || 0,
      tasksCompleted: updates.tasksCompleted || 0,
      timeSpent: updates.timeSpent || 0,
      xpEarned: updates.xpEarned || 0,
    },
    update: {
      lessonsCompleted: updates.lessonsCompleted
        ? { increment: updates.lessonsCompleted }
        : undefined,
      quizzesCompleted: updates.quizzesCompleted
        ? { increment: updates.quizzesCompleted }
        : undefined,
      tasksCompleted: updates.tasksCompleted
        ? { increment: updates.tasksCompleted }
        : undefined,
      timeSpent: updates.timeSpent ? { increment: updates.timeSpent } : undefined,
      xpEarned: updates.xpEarned ? { increment: updates.xpEarned } : undefined,
    },
  });

  return activity;
}

/**
 * Calculate and update user streak
 */
export async function calculateStreak(userId: string): Promise<number> {
  // Get all daily activities sorted by date descending
  const activities = await prisma.dailyActivity.findMany({
    where: { userId },
    orderBy: { activityDate: 'desc' },
    take: 365, // Check last year
  });

  if (activities.length === 0) {
    return 0;
  }

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if today has activity
  const todayActivity = activities.find((a: any) => {
    const activityDate = new Date(a.activityDate);
    activityDate.setHours(0, 0, 0, 0);
    return activityDate.getTime() === today.getTime();
  });

  if (!todayActivity) {
    // No activity today, check yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayActivity = activities.find((a: any) => {
      const activityDate = new Date(a.activityDate);
      activityDate.setHours(0, 0, 0, 0);
      return activityDate.getTime() === yesterday.getTime();
    });

    if (!yesterdayActivity) {
      // No activity yesterday either, streak is broken
      return 0;
    }

    // Start from yesterday
    streak = 1;
    let currentDate = new Date(yesterday);
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 1; i < activities.length; i++) {
      currentDate.setDate(currentDate.getDate() - 1);
      const activityDate = new Date(activities[i].activityDate);
      activityDate.setHours(0, 0, 0, 0);

      if (activityDate.getTime() === currentDate.getTime()) {
        streak++;
      } else {
        break; // Streak broken
      }
    }
  } else {
    // Today has activity, calculate from today backwards
    streak = 1;
    let currentDate = new Date(today);
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 1; i < activities.length; i++) {
      currentDate.setDate(currentDate.getDate() - 1);
      const activityDate = new Date(activities[i].activityDate);
      activityDate.setHours(0, 0, 0, 0);

      if (activityDate.getTime() === currentDate.getTime()) {
        streak++;
      } else {
        break; // Streak broken
      }
    }
  }

  // Update UserProgress with new streak
  const progress = await prisma.userProgress.findUnique({
    where: { userId },
  });

  const longestStreak = progress?.longestStreak || 0;

  await prisma.userProgress.upsert({
    where: { userId },
    create: {
      userId,
      currentStreak: streak,
      longestStreak: Math.max(streak, longestStreak),
    },
    update: {
      currentStreak: streak,
      longestStreak: Math.max(streak, longestStreak),
    },
  });

  return streak;
}

/**
 * Get or create user progress record
 */
export async function getOrCreateUserProgress(userId: string) {
  return await prisma.userProgress.upsert({
    where: { userId },
    create: {
      userId,
    },
    update: {},
  });
}

/**
 * Update user progress
 */
export async function updateUserProgress(
  userId: string,
  updates: {
    totalLessonsCompleted?: number;
    totalQuizzesCompleted?: number;
    totalTasksCompleted?: number;
    totalTimeSpent?: number;
    totalXP?: number;
    lastActivityAt?: Date;
  }
) {
  const progress = await getOrCreateUserProgress(userId);

  const newTotalXP = progress.totalXP + (updates.totalXP || 0);
  const newLevel = calculateLevel(newTotalXP);

  return await prisma.userProgress.update({
    where: { userId },
    data: {
      totalLessonsCompleted: updates.totalLessonsCompleted
        ? { increment: updates.totalLessonsCompleted }
        : undefined,
      totalQuizzesCompleted: updates.totalQuizzesCompleted
        ? { increment: updates.totalQuizzesCompleted }
        : undefined,
      totalTasksCompleted: updates.totalTasksCompleted
        ? { increment: updates.totalTasksCompleted }
        : undefined,
      totalTimeSpent: updates.totalTimeSpent
        ? { increment: updates.totalTimeSpent }
        : undefined,
      totalXP: updates.totalXP ? { increment: updates.totalXP } : undefined,
      level: newLevel,
      lastActivityAt: updates.lastActivityAt || new Date(),
    },
  });
}

/**
 * Track lesson completion
 */
export async function trackLessonCompletion(
  userId: string,
  lessonId: string,
  timeSpent?: number,
  progress: number = 100
) {
  // Create lesson completion record
  await prisma.lessonCompletion.create({
    data: {
      userId,
      lessonId,
      timeSpent: timeSpent ? Math.floor(timeSpent / 1000) : undefined, // Convert ms to seconds
      progress,
    },
  });

  // Update daily activity
  const xpEarned = calculateXP('lesson');
  await updateDailyActivity(userId, {
    lessonsCompleted: 1,
    timeSpent: timeSpent ? Math.floor(timeSpent / 60000) : 0, // Convert ms to minutes
    xpEarned,
  });

  // Update user progress
  await updateUserProgress(userId, {
    totalLessonsCompleted: 1,
    totalTimeSpent: timeSpent ? Math.floor(timeSpent / 60000) : 0,
    totalXP: xpEarned,
    lastActivityAt: new Date(),
  });

  // Recalculate streak
  await calculateStreak(userId);
}

/**
 * Track quiz completion
 */
export async function trackQuizCompletion(userId: string, score: number, _totalPoints: number) {
  const xpEarned = calculateXP('quiz', score);

  // Update daily activity
  await updateDailyActivity(userId, {
    quizzesCompleted: 1,
    xpEarned,
  });

  // Update user progress
  await updateUserProgress(userId, {
    totalQuizzesCompleted: 1,
    totalXP: xpEarned,
    lastActivityAt: new Date(),
  });

  // Recalculate streak
  await calculateStreak(userId);
}

/**
 * Track task completion
 */
export async function trackTaskCompletion(userId: string) {
  const xpEarned = calculateXP('task');

  // Update daily activity
  await updateDailyActivity(userId, {
    tasksCompleted: 1,
    xpEarned,
  });

  // Update user progress
  await updateUserProgress(userId, {
    totalTasksCompleted: 1,
    totalXP: xpEarned,
    lastActivityAt: new Date(),
  });

  // Recalculate streak
  await calculateStreak(userId);
}

/**
 * Get user progress stats
 */
export async function getUserProgress(userId: string) {
  const progress = await getOrCreateUserProgress(userId);

  // Get total time spent from daily activities
  const totalTimeResult = await prisma.dailyActivity.aggregate({
    where: { userId },
    _sum: {
      timeSpent: true,
    },
  });

  const totalTimeSpent = totalTimeResult._sum.timeSpent || 0;

  // Get last activity date
  const lastActivity = await prisma.dailyActivity.findFirst({
    where: { userId },
    orderBy: { activityDate: 'desc' },
  });

  return {
    lessons: progress.totalLessonsCompleted,
    quizzes: progress.totalQuizzesCompleted,
    tasks: progress.totalTasksCompleted,
    streak: progress.currentStreak,
    longestStreak: progress.longestStreak,
    totalTime: totalTimeSpent,
    xp: progress.totalXP,
    level: progress.level,
    lastActivity: lastActivity?.activityDate || progress.lastActivityAt,
  };
}

