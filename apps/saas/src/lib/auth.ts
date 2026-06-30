import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@sccc/database";
import { loginSchema, registerSchema } from "@sccc/shared";
import { cookies } from "next/headers";

import { hashPassword, verifyPassword } from "./password";
import type { AppUser } from "./types";

export type AuthContext = {
  user: AppUser;
};

export class AuthRequiredError extends Error {
  constructor() {
    super("AUTH_REQUIRED");
  }
}

const sessionCookieName = "sccc_session";
const sessionTtlMs = 1000 * 60 * 60 * 24 * 30;

export async function registerWithPassword(input: unknown): Promise<AppUser> {
  const parsed = registerSchema.parse(input);
  const existing = await prisma.user.findUnique({
    where: {
      email: parsed.email
    }
  });

  if (existing?.passwordHash) {
    throw new Error("EMAIL_ALREADY_REGISTERED");
  }

  const user = await prisma.$transaction(async (tx) => {
    if (!existing) {
      return tx.user.create({
        data: {
          email: parsed.email,
          name: parsed.name,
          passwordHash: hashPassword(parsed.password)
        }
      });
    }

    const invitedMemberships = await tx.organizationMember.findMany({
      where: {
        userId: existing.id,
        status: "INVITED"
      }
    });

    const updatedUser = await tx.user.update({
      where: {
        id: existing.id
      },
      data: {
        name: parsed.name,
        passwordHash: hashPassword(parsed.password),
        memberships: {
          updateMany: {
            where: {
              status: "INVITED"
            },
            data: {
              status: "ACTIVE"
            }
          }
        }
      }
    });

    if (invitedMemberships.length > 0) {
      await tx.activityLog.createMany({
        data: invitedMemberships.map((member) => ({
          organizationId: member.organizationId,
          userId: existing.id,
          action: "member.accepted_invite",
          entityType: "OrganizationMember",
          entityId: member.id,
          metadata: {
            email: parsed.email
          }
        }))
      });
    }

    return updatedUser;
  });

  const appUser = mapUser(user);
  await createSessionCookie(appUser);

  return appUser;
}

export async function loginWithPassword(input: unknown): Promise<AppUser> {
  const parsed = loginSchema.parse(input);
  const user = await prisma.user.findUnique({
    where: {
      email: parsed.email
    }
  });

  if (!user || !verifyPassword(parsed.password, user.passwordHash)) {
    throw new Error("INVALID_CREDENTIALS");
  }

  await createSessionCookie(mapUser(user));
  return mapUser(user);
}

export async function logoutCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: {
        tokenHash: hashSessionToken(token)
      }
    });
  }

  cookieStore.delete(sessionCookieName);
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      tokenHash: hashSessionToken(token)
    },
    include: {
      user: true
    }
  });

  if (!session || session.expiresAt <= new Date()) {
    if (session) {
      await prisma.session.delete({
        where: {
          id: session.id
        }
      });
    }

    return null;
  }

  await prisma.session.update({
    where: {
      id: session.id
    },
    data: {
      lastUsedAt: new Date()
    }
  });

  return mapUser(session.user);
}

export async function requireCurrentUser(): Promise<AuthContext> {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthRequiredError();
  }

  return { user };
}

export function isAuthRequiredError(error: unknown): boolean {
  return error instanceof AuthRequiredError;
}

async function createSessionCookie(user: AppUser): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionTtlMs);

  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: hashSessionToken(token),
      expiresAt
    }
  });

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function mapUser(user: { id: string; email: string; name: string | null }): AppUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.email
  };
}
