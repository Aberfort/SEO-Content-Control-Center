import { prisma } from "@sccc/database";
import { emailVerificationConfirmSchema } from "@sccc/shared";

import {
  buildEmailVerificationUrl,
  createEmailVerificationToken,
  hashEmailVerificationToken
} from "./email-verification-token";

export type EmailVerificationRequest = {
  userId: string;
  email: string;
  name: string;
  verificationUrl: string;
  expiresAt: string;
};

export type EmailVerificationResult = {
  status: "verified" | "already_verified";
  email: string;
  verifiedAt: string;
};

export async function createEmailVerificationRequestForUser(
  userId: string
): Promise<EmailVerificationRequest | null> {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    }
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (user.emailVerified) {
    return null;
  }

  const verification = createEmailVerificationToken();

  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null
      },
      data: {
        usedAt: new Date()
      }
    });
    await tx.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: verification.tokenHash,
        expiresAt: verification.expiresAt
      }
    });
  });

  return {
    userId: user.id,
    email: user.email,
    name: user.name ?? user.email,
    verificationUrl: buildEmailVerificationUrl(verification.token),
    expiresAt: verification.expiresAt.toISOString()
  };
}

export async function verifyEmailToken(input: unknown): Promise<EmailVerificationResult> {
  const parsed = emailVerificationConfirmSchema.parse(input);
  const tokenHash = hashEmailVerificationToken(parsed.token);
  const verification = await prisma.emailVerificationToken.findUnique({
    where: {
      tokenHash
    },
    include: {
      user: true
    }
  });

  if (!verification) {
    throw new Error("EMAIL_VERIFICATION_TOKEN_NOT_FOUND");
  }

  if (verification.user.emailVerified) {
    await markVerificationTokenUsed(verification.id);

    return {
      status: "already_verified",
      email: verification.user.email,
      verifiedAt: verification.user.emailVerified.toISOString()
    };
  }

  if (verification.usedAt) {
    throw new Error("EMAIL_VERIFICATION_TOKEN_USED");
  }

  if (verification.expiresAt <= new Date()) {
    throw new Error("EMAIL_VERIFICATION_TOKEN_EXPIRED");
  }

  const verifiedAt = new Date();
  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: {
        id: verification.userId
      },
      data: {
        emailVerified: verifiedAt
      }
    });

    await tx.emailVerificationToken.updateMany({
      where: {
        userId: verification.userId,
        usedAt: null
      },
      data: {
        usedAt: verifiedAt
      }
    });

    return updated;
  });

  return {
    status: "verified",
    email: user.email,
    verifiedAt: verifiedAt.toISOString()
  };
}

async function markVerificationTokenUsed(tokenId: string): Promise<void> {
  await prisma.emailVerificationToken.updateMany({
    where: {
      id: tokenId,
      usedAt: null
    },
    data: {
      usedAt: new Date()
    }
  });
}
