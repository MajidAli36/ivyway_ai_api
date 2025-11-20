import { prisma } from '../db/prisma';
import { env } from '../config/env';
import * as jobService from './job.service';
import { AppError } from '../middlewares/error.middleware';
import { withTransaction } from '../utils/transactions';
import { sanitizeString } from '../utils/sanitize';

export async function createConversation(userId: string, title: string, language?: string) {
  return prisma.conversation.create({
    data: {
      userId,
      title,
      language: language || 'en',
    },
  });
}

export async function getUserConversations(userId: string, limit = 20, offset = 0) {
  return prisma.conversation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    select: {
      id: true,
      title: true,
      language: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getConversationMessages(conversationId: string, userId: string, limit = 25, offset = 0) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation || conversation.userId !== userId) {
    throw new AppError('Conversation not found', 404);
  }

  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: limit,
    skip: offset,
  });
}

export async function sendMessage(
  userId: string,
  conversationId: string | null,
  content: string,
  language: string = 'en'
): Promise<{ conversationId: string; messageId: string; jobId: string }> {
  // Sanitize input
  const sanitizedContent = sanitizeString(content);
  
  // Use transaction for atomic operations
  return withTransaction(async (tx) => {
    let conversation = null;

    if (conversationId) {
      conversation = await tx.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation || conversation.userId !== userId) {
        throw new AppError('Conversation not found', 404);
      }
    } else {
      // Create new conversation
      conversation = await tx.conversation.create({
        data: {
          userId,
          title: sanitizedContent.substring(0, 50),
          language,
        },
      });
    }

    // Save user message
    const userMessage = await tx.message.create({
      data: {
        conversationId: conversation.id,
        sender: 'user',
        content: sanitizedContent,
      },
    });

    return {
      conversationId: conversation.id,
      messageId: userMessage.id,
      userId,
      language,
    };
  }).then(async (data) => {
    // Enqueue AI response job outside transaction
    const provider = env.LLM_PROVIDER;
    const model = provider === 'openai' ? env.TUTOR_MODEL_OPENAI : env.TUTOR_MODEL_OLLAMA;

    const jobId = await jobService.createJob({
      type: 'ai_tutor',
      userId: data.userId,
      payload: {
        conversationId: data.conversationId,
        messageId: data.messageId,
        model,
        provider,
        language: data.language,
      },
    });

    return {
      conversationId: data.conversationId,
      messageId: data.messageId,
      jobId,
    };
  });
}

