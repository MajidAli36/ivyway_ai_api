import { prisma } from '../db/prisma';
import * as jobService from './job.service';
import { AppError } from '../middlewares/error.middleware';

export async function createQuiz(userId: string, data: any) {
  const { title, questions, language, isPublic } = data;

  // Create quiz
  const quiz = await prisma.quiz.create({
    data: {
      ownerId: userId,
      title,
      language: language || 'en',
      isPublic: isPublic || false,
    },
  });

  // Create questions and choices
  for (const q of questions) {
    const question = await prisma.question.create({
      data: {
        quizId: quiz.id,
        type: q.type,
        prompt: q.prompt,
        answer: q.answer,
        order: q.order,
      },
    });

    if (q.choices) {
      await prisma.choice.createMany({
        data: q.choices.map((choice: any) => ({
          questionId: question.id,
          text: choice.text,
          isCorrect: choice.isCorrect || false,
        })),
      });
    }
  }

  return { quiz };
}

export async function getQuizzes(userId: string, limit = 20, offset = 0, publicOnly = false) {
  const where: any = {};
  if (publicOnly) {
    where.isPublic = true;
  } else {
    where.ownerId = userId;
  }

  return prisma.quiz.findMany({
    where,
    take: limit,
    skip: offset,
    orderBy: { createdAt: 'desc' },
    include: { questions: { include: { choices: true } } },
  });
}

export async function getQuizById(userId: string, quizId: string) {
  const quiz = await prisma.quiz.findFirst({
    where: {
      id: quizId,
      OR: [
        { ownerId: userId },
        { isPublic: true },
      ],
    },
    include: {
      questions: {
        include: { choices: true },
        orderBy: { order: 'asc' },
      },
    },
  });

  return quiz;
}

export async function submitQuizAttempt(userId: string, quizId: string, answers: any[]) {
  // Calculate score
  let score = 0;
  let correctCount = 0;

  for (const answer of answers) {
    const question = await prisma.question.findUnique({
      where: { id: answer.questionId },
      include: { choices: true },
    });

    if (!question) continue;

    let isCorrect = false;

    if (question.type === 'MCQ' || question.type === 'TRUE_FALSE') {
      const correctChoice = question.choices.find(c => c.isCorrect);
      isCorrect = answer.choiceId === correctChoice?.id;
    } else {
      isCorrect = answer.text?.toLowerCase().trim() === question.answer?.toLowerCase().trim();
    }

    if (isCorrect) {
      score += 10;
      correctCount++;
    }
  }

  // Create attempt
  const attempt = await prisma.quizAttempt.create({
    data: {
      userId,
      quizId,
      score,
      finishedAt: new Date(),
    },
  });

  // Create attempt answers
  for (const answer of answers) {
    await prisma.attemptAnswer.create({
      data: {
        attemptId: attempt.id,
        questionId: answer.questionId,
        choiceId: answer.choiceId,
        text: answer.text,
        correct: answer.isCorrect !== undefined ? answer.isCorrect : false,
      },
    });
  }

  return { attempt, score, correctCount, totalQuestions: answers.length };
}

export async function generateQuiz(userId: string, data: { topic?: string; imageUri?: string; language?: string; numQuestions?: number }) {
  const { topic, imageUri, language = 'en', numQuestions = 10 } = data;

  if (!topic && !imageUri) {
    throw new AppError('Either topic or imageUri must be provided', 400);
  }

  // Create a job for quiz generation
  const job = await jobService.createJob({
    type: 'quiz_gen',
    userId,
    payload: {
      topic,
      imageUri,
      language,
      numQuestions,
    },
  });

  return { job: { id: job.id, status: job.status } };
}

