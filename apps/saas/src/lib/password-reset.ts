import { prisma } from "@sccc/database";
import { passwordResetConfirmSchema, passwordResetRequestSchema } from "@sccc/shared";

import { hashPassword } from "./password";
import {
  buildPasswordResetUrl,
  createPasswordResetToken,
  hashPasswordResetToken
} from "./password-reset-token";

export type PasswordResetRequest = {
  userId: string;
  email: string;
  name: string;
  resetUrl: string;
  expiresAt: string;
};

export type PasswordResetResult = {
  status: "reset";
  email: string;
  resetAt: string;
};

export async function createPasswordResetRequest(
  input: unknown
): Promise<PasswordResetRequest | null> {
  const parsed = passwordResetRequestSchema.parse(input);
  const user = await prisma.user.findUnique({
    where: {
      email: parsed.email
    }
  });

  if (!user?.passwordHash) {
    return null;
  }

  const reset = createPasswordResetToken();

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null
      },
      data: {
        usedAt: new Date()
      }
    });
    await tx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: reset.tokenHash,
        expiresAt: reset.expiresAt
      }
    });
  });

  return {
    userId: user.id,
    email: user.email,
    name: user.name ?? user.email,
    resetUrl: buildPasswordResetUrl(reset.token),
    expiresAt: reset.expiresAt.toISOString()
  };
}

export async function resetPasswordWithToken(input: unknown): Promise<PasswordResetResult> {
  const parsed = passwordResetConfirmSchema.parse(input);
  const tokenHash = hashPasswordResetToken(parsed.token);
  const reset = await prisma.passwordResetToken.findUnique({
    where: {
      tokenHash
    },
    include: {
      user: true
    }
  });

  if (!reset) {
    throw new Error("PASSWORD_RESET_TOKEN_NOT_FOUND");
  }

  if (reset.usedAt) {
    throw new Error("PASSWORD_RESET_TOKEN_USED");
  }

  if (reset.expiresAt <= new Date()) {
    throw new Error("PASSWORD_RESET_TOKEN_EXPIRED");
  }

  const resetAt = new Date();
  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: {
        id: reset.userId
      },
      data: {
        passwordHash: hashPassword(parsed.password),
        emailVerified: reset.user.emailVerified ?? resetAt
      }
    });

    await tx.passwordResetToken.updateMany({
      where: {
        userId: reset.userId,
        usedAt: null
      },
      data: {
        usedAt: resetAt
      }
    });

    await tx.session.deleteMany({
      where: {
        userId: reset.userId
      }
    });

    return updated;
  });

  return {
    status: "reset",
    email: user.email,
    resetAt: resetAt.toISOString()
  };
}
