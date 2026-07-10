import { prisma } from "@sccc/database";

import { decryptSecret, encryptSecret } from "./token-encryption";
import { buildTotpProvisioningUri, generateTotpSecret, verifyTotpCode } from "./totp";

const issuer = "SEO Content Control Center";

export type TwoFactorStatus = {
  enabled: boolean;
  enabledAt: string | null;
  pending: boolean;
};

export type TwoFactorSetup = {
  secret: string;
  otpauthUrl: string;
};

export async function getTwoFactorStatusForUser(userId: string): Promise<TwoFactorStatus> {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    },
    select: {
      twoFactorEnabledAt: true,
      twoFactorPendingSecret: true
    }
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  return {
    enabled: Boolean(user.twoFactorEnabledAt),
    enabledAt: user.twoFactorEnabledAt?.toISOString() ?? null,
    pending: Boolean(user.twoFactorPendingSecret)
  };
}

export async function startTwoFactorEnrollment(userId: string): Promise<TwoFactorSetup> {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    },
    select: {
      id: true,
      email: true,
      twoFactorEnabledAt: true
    }
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (user.twoFactorEnabledAt) {
    throw new Error("TWO_FACTOR_ALREADY_ENABLED");
  }

  const secret = generateTotpSecret();
  const encryptedSecret = encryptSecret(secret);

  await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      twoFactorPendingSecret: encryptedSecret,
      twoFactorPendingCreatedAt: new Date()
    }
  });

  return {
    secret,
    otpauthUrl: buildTotpProvisioningUri({
      issuer,
      accountName: user.email,
      secret
    })
  };
}

export async function confirmTwoFactorEnrollment(input: {
  userId: string;
  code: string;
}): Promise<TwoFactorStatus> {
  const user = await prisma.user.findUnique({
    where: {
      id: input.userId
    },
    select: {
      id: true,
      twoFactorPendingSecret: true,
      twoFactorEnabledAt: true
    }
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (!user.twoFactorPendingSecret) {
    throw new Error("TWO_FACTOR_SETUP_NOT_STARTED");
  }

  if (user.twoFactorEnabledAt) {
    throw new Error("TWO_FACTOR_ALREADY_ENABLED");
  }

  const secret = decryptSecret(user.twoFactorPendingSecret);
  const verification = verifyTotpCode({
    secret,
    code: input.code
  });

  if (!verification.valid || verification.counter === null) {
    throw new Error("INVALID_TWO_FACTOR_CODE");
  }

  await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      twoFactorSecret: user.twoFactorPendingSecret,
      twoFactorPendingSecret: null,
      twoFactorPendingCreatedAt: null,
      twoFactorEnabledAt: new Date(),
      twoFactorLastCounter: verification.counter
    }
  });

  return getTwoFactorStatusForUser(user.id);
}

export async function disableTwoFactorForUser(input: {
  userId: string;
  code: string;
}): Promise<TwoFactorStatus> {
  const user = await prisma.user.findUnique({
    where: {
      id: input.userId
    },
    select: {
      id: true,
      twoFactorSecret: true,
      twoFactorLastCounter: true
    }
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (!user.twoFactorSecret) {
    throw new Error("TWO_FACTOR_NOT_ENABLED");
  }

  const secret = decryptSecret(user.twoFactorSecret);
  const verification = verifyTotpCode({
    secret,
    code: input.code,
    lastCounter: user.twoFactorLastCounter
  });

  if (!verification.valid || verification.counter === null) {
    throw new Error("INVALID_TWO_FACTOR_CODE");
  }

  await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      twoFactorSecret: null,
      twoFactorPendingSecret: null,
      twoFactorPendingCreatedAt: null,
      twoFactorEnabledAt: null,
      twoFactorLastCounter: null
    }
  });

  return getTwoFactorStatusForUser(user.id);
}
