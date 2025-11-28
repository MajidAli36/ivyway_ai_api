import bcrypt from 'bcrypt';
import { prisma } from '../db/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AppError } from '../middlewares/error.middleware';

export async function registerUser(data: {
  email: string;
  password: string;
  fullName: string;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new AppError('Email already registered', 400);
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      fullName: data.fullName,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      createdAt: true,
    },
  });

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = signRefreshToken({ userId: user.id, email: user.email });

  // Store refresh token in database
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  return {
    user,
    accessToken,
    refreshToken,
  };
}

export async function loginUser(data: { email: string; password: string }) {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const isValid = await bcrypt.compare(data.password, user.password);

  if (!isValid) {
    throw new AppError('Invalid credentials', 401);
  }

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = signRefreshToken({ userId: user.id, email: user.email });

  // Store refresh token in database
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    },
    accessToken,
    refreshToken,
  };
}

export async function updateUserProfile(userId: string, data: {
  fullName?: string;
  bio?: string | null;
  language?: string | null;
  profileImage?: string | null;
}) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.fullName && { fullName: data.fullName }),
      ...(data.bio !== undefined && { bio: data.bio }),
      ...(data.language !== undefined && { language: data.language }),
      ...(data.profileImage !== undefined && { profileImage: data.profileImage }),
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      bio: true,
      profileImage: true,
      language: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return { user };
}

export async function refreshUserTokens(refreshToken: string) {
  // Verify refresh token
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new AppError('Invalid refresh token', 401);
  }

  // Find user and verify refresh token matches
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      refreshToken: true,
    },
  });

  if (!user || user.refreshToken !== refreshToken) {
    throw new AppError('Invalid refresh token', 401);
  }

  // Generate new tokens
  const newAccessToken = signAccessToken({ userId: user.id, email: user.email });
  const newRefreshToken = signRefreshToken({ userId: user.id, email: user.email });

  // Update refresh token in database
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: newRefreshToken },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    },
  };
}

export async function logoutUser(userId: string) {
  // Clear refresh token from database
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
}

export async function loginAsGuest() {
  // Create a temporary guest user
  // Use a unique email based on timestamp to avoid conflicts
  const guestEmail = `guest-${Date.now()}@guest.local`;
  const guestName = `Guest User ${Math.floor(Math.random() * 10000)}`;
  
  // Check if we should reuse an existing guest user or create new
  // For now, we'll create a new guest user each time for better isolation
  const hashedPassword = await bcrypt.hash('guest-password-' + Date.now(), 10);
  
  const user = await prisma.user.create({
    data: {
      email: guestEmail,
      password: hashedPassword,
      fullName: guestName,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      createdAt: true,
    },
  });

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = signRefreshToken({ userId: user.id, email: user.email });

  // Store refresh token in database
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    },
    accessToken,
    refreshToken,
  };
}

