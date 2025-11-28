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
        include: { 
          choices: {
            orderBy: { id: 'asc' }, // Order choices consistently by ID
          }
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  return quiz;
}

export async function submitQuizAttempt(userId: string, quizId: string, answers: any[]) {
  // Calculate score and track correct answers
  let score = 0;
  let correctCount = 0;
  const correctAnswers: Array<{ questionId: string; correct: boolean; correctAnswer?: string; explanation?: string }> = [];

  console.log(`[Quiz Service] Submitting quiz attempt for quiz ${quizId} with ${answers.length} answers`);

  for (const answer of answers) {
    const question = await prisma.question.findUnique({
      where: { id: answer.questionId },
      include: { 
        choices: {
          orderBy: { id: 'asc' }, // Order choices consistently by ID
        }
      },
    });

    if (!question) {
      correctAnswers.push({
        questionId: answer.questionId,
        correct: false,
      });
      continue;
    }

    let isCorrect = false;

    if (question.type === 'MCQ' || question.type === 'TRUE_FALSE') {
      // Get user's selected choice text
      const userChoice = question.choices.find(c => c.id === answer.choiceId);
      const userChoiceText = userChoice?.text || '';
      
      // First, try to find correct choice by isCorrect flag
      let correctChoice = question.choices.find(c => c.isCorrect);
      
      // If question.answer field exists, use it as source of truth
      // Match the answer field with choice text to find the correct choice
      if (question.answer && question.answer.trim()) {
        const answerText = question.answer.trim();
        // Try to find a choice that matches the answer field (case-insensitive, partial match)
        const matchingChoice = question.choices.find(c => {
          const choiceText = c.text.trim();
          // Check for exact match or if answer is contained in choice or vice versa
          return choiceText.toLowerCase() === answerText.toLowerCase() ||
                 choiceText.toLowerCase().includes(answerText.toLowerCase()) ||
                 answerText.toLowerCase().includes(choiceText.toLowerCase());
        });
        
        // If we found a matching choice, use it as the correct one
        if (matchingChoice) {
          correctChoice = matchingChoice;
        }
      }
      
      // Compare: First by choice ID, then by text matching
      if (answer.choiceId && correctChoice) {
        const userChoiceId = String(answer.choiceId).trim();
        const correctChoiceId = String(correctChoice.id).trim();
        isCorrect = userChoiceId === correctChoiceId;
        
        // If ID comparison fails but texts match, consider it correct
        if (!isCorrect && userChoiceText && correctChoice.text) {
          const userText = userChoiceText.toLowerCase().trim();
          const correctText = correctChoice.text.toLowerCase().trim();
          // Check for exact match or significant overlap
          if (userText === correctText || 
              (userText.length > 5 && correctText.length > 5 && 
               (userText.includes(correctText) || correctText.includes(userText)))) {
            isCorrect = true;
          }
        }
      } else {
        // Fallback: compare text directly if we have question.answer
        if (question.answer && userChoiceText) {
          const userText = userChoiceText.toLowerCase().trim();
          const answerText = question.answer.toLowerCase().trim();
          isCorrect = userText === answerText || 
                     userText.includes(answerText) || 
                     answerText.includes(userText);
        } else if (!answer.choiceId) {
          // If no choiceId provided and no text match, mark as incorrect
          console.warn(`[Quiz Service] Question ${answer.questionId}: No choiceId provided and no text match found`);
          isCorrect = false;
        }
      }
    } else {
      // For short answer questions, compare text (case-insensitive, trimmed)
      const userText = answer.text?.toLowerCase().trim() || '';
      const correctText = question.answer?.toLowerCase().trim() || '';
      isCorrect = userText === correctText && userText.length > 0;
    }

    if (isCorrect) {
      score += 10;
      correctCount++;
      console.log(`[Quiz Service] Question ${answer.questionId}: CORRECT (+10 points). Total score: ${score}`);
    } else {
      console.log(`[Quiz Service] Question ${answer.questionId}: WRONG (0 points). Total score: ${score}`);
    }

    // Get correct choice text for display
    // Priority: question.answer field > choice marked isCorrect > first choice
    let correctChoiceText = '';
    if (question.type === 'MCQ' || question.type === 'TRUE_FALSE') {
      // First, try to find correct choice by matching with answer field
      if (question.answer && question.answer.trim()) {
        const answerText = question.answer.trim();
        const matchingChoice = question.choices.find(c => {
          const choiceText = c.text.trim();
          return choiceText.toLowerCase() === answerText.toLowerCase() ||
                 choiceText.toLowerCase().includes(answerText.toLowerCase()) ||
                 answerText.toLowerCase().includes(choiceText.toLowerCase());
        });
        if (matchingChoice) {
          correctChoiceText = matchingChoice.text;
        } else {
          // If no match found, use the answer field itself (it might be the correct answer)
          correctChoiceText = question.answer;
        }
      }
      
      // Fallback to choice marked as isCorrect
      if (!correctChoiceText) {
        const correctChoice = question.choices.find(c => c.isCorrect);
        correctChoiceText = correctChoice?.text || '';
      }
      
      // Final fallback: use first choice if nothing else works
      if (!correctChoiceText && question.choices.length > 0) {
        correctChoiceText = question.choices[0].text;
      }
    } else {
      correctChoiceText = question.answer || '';
    }

    // Store correct answer info
    // Note: question.answer field contains explanation/notes, not the correct answer text
    correctAnswers.push({
      questionId: answer.questionId,
      correct: isCorrect,
      correctAnswer: correctChoiceText, // Include correct answer text for display
      explanation: question.answer || undefined, // This is the explanation/notes field
    });
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

  // Create attempt answers with correct flag
  for (let i = 0; i < answers.length; i++) {
    const answer = answers[i];
    const correctInfo = correctAnswers[i];
    
    await prisma.attemptAnswer.create({
      data: {
        attemptId: attempt.id,
        questionId: answer.questionId,
        choiceId: answer.choiceId || null,
        text: answer.text || null,
        correct: correctInfo.correct,
      },
    });
  }

  // Calculate percentage
  const totalQuestions = answers.length;
  const totalPoints = totalQuestions * 10; // Each question is worth 10 points
  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

  console.log(`[Quiz Service] Quiz attempt completed:`, {
    score,
    totalPoints,
    percentage,
    correctCount,
    totalQuestions,
    wrongCount: totalQuestions - correctCount,
  });

  return { 
    attempt, 
    score, 
    correctCount, 
    totalQuestions,
    totalPoints, // Include totalPoints for frontend calculation
    percentage, // Include percentage for frontend
    correctAnswers // Return correct answers for frontend
  };
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

