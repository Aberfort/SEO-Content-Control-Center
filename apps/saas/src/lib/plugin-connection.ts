import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { prisma } from "@sccc/database";
import {
  assertPermission,
  pluginConnectionChallengeCreateSchema,
  pluginConnectionExchangeSchema,
  pluginSyncBatchSchema,
  type PluginConnectionChallengeCreateInput,
  type PluginConnectionExchangeInput,
  type PluginSyncBatch
} from "@sccc/shared";

import type { AppUser } from "./types";

const challengeTtlMs = 1000 * 60 * 10;
const signatureToleranceSeconds = 300;

export type PluginConnectionChallenge = {
  siteId: string;
  challenge: string;
  expiresAt: string;
};

export type PluginConnectionExchangeResult = {
  siteId: string;
  organizationId: string;
  token: string;
  tokenVersion: number;
  endpoint: string;
};

export type PluginSyncAuthentication = {
  siteId: string;
  organizationId: string;
  tokenVersion: number;
};

export async function createPluginConnectionChallenge(input: {
  user: AppUser;
  organizationId: string;
  siteId: string;
}): Promise<PluginConnectionChallenge> {
  const parsed: PluginConnectionChallengeCreateInput =
    pluginConnectionChallengeCreateSchema.parse(input);
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: input.user.id,
      organizationId: parsed.organizationId,
      status: "ACTIVE"
    }
  });

  if (!membership) {
    throw new Error("ORGANIZATION_NOT_FOUND");
  }

  assertPermission(membership.role, "integration:manage");

  const site = await prisma.site.findFirst({
    where: {
      id: parsed.siteId,
      organizationId: parsed.organizationId
    }
  });

  if (!site) {
    throw new Error("SITE_NOT_FOUND");
  }

  const challenge = createOpaqueToken();
  const expiresAt = new Date(Date.now() + challengeTtlMs);

  await prisma.wordPressConnectionChallenge.create({
    data: {
      siteId: site.id,
      tokenHash: hashPluginToken(challenge),
      expiresAt
    }
  });

  return {
    siteId: site.id,
    challenge,
    expiresAt: expiresAt.toISOString()
  };
}

export async function exchangePluginConnectionChallenge(
  input: unknown
): Promise<PluginConnectionExchangeResult> {
  const parsed: PluginConnectionExchangeInput = pluginConnectionExchangeSchema.parse(input);
  const challengeHash = hashPluginToken(parsed.challenge);
  const challenge = await prisma.wordPressConnectionChallenge.findUnique({
    where: {
      tokenHash: challengeHash
    },
    include: {
      site: true
    }
  });

  if (!challenge) {
    throw new Error("CONNECTION_CHALLENGE_NOT_FOUND");
  }

  if (challenge.usedAt) {
    throw new Error("CONNECTION_CHALLENGE_USED");
  }

  if (challenge.expiresAt <= new Date()) {
    throw new Error("CONNECTION_CHALLENGE_EXPIRED");
  }

  const token = createOpaqueToken();
  const tokenHash = hashPluginToken(token);
  const connection = await prisma.$transaction(async (tx) => {
    await tx.wordPressConnectionChallenge.update({
      where: {
        id: challenge.id
      },
      data: {
        usedAt: new Date()
      }
    });

    const updated = await tx.wordPressConnection.upsert({
      where: {
        siteId: challenge.siteId
      },
      update: {
        tokenHash,
        tokenVersion: {
          increment: 1
        },
        disconnectedAt: null
      },
      create: {
        siteId: challenge.siteId,
        tokenHash,
        tokenVersion: 1
      }
    });

    await tx.site.update({
      where: {
        id: challenge.siteId
      },
      data: {
        status: "CONNECTED"
      }
    });

    await tx.activityLog.create({
      data: {
        organizationId: challenge.site.organizationId,
        userId: null,
        action: "plugin.connected",
        entityType: "Site",
        entityId: challenge.siteId,
        metadata: {
          siteId: challenge.siteId
        }
      }
    });

    return updated;
  });

  return {
    siteId: challenge.siteId,
    organizationId: challenge.site.organizationId,
    token,
    tokenVersion: connection.tokenVersion,
    endpoint: parsed.endpoint ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  };
}

export async function authenticatePluginSyncRequest(input: {
  request: Request;
  bodyText: string;
}): Promise<PluginSyncAuthentication> {
  const siteId = input.request.headers.get("x-sccc-site-id") ?? "";
  const timestamp = input.request.headers.get("x-sccc-timestamp") ?? "";
  const signature = input.request.headers.get("x-sccc-signature") ?? "";
  const token = input.request.headers.get("x-sccc-token") ?? "";

  if (!siteId || !timestamp || !signature || !token) {
    throw new Error("PLUGIN_SIGNATURE_MISSING");
  }

  const timestampSeconds = Number.parseInt(timestamp, 10);

  if (!Number.isFinite(timestampSeconds)) {
    throw new Error("PLUGIN_SIGNATURE_INVALID");
  }

  if (Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) > signatureToleranceSeconds) {
    throw new Error("PLUGIN_SIGNATURE_EXPIRED");
  }

  const connection = await prisma.wordPressConnection.findUnique({
    where: {
      siteId
    },
    include: {
      site: true
    }
  });

  if (!connection || connection.disconnectedAt) {
    throw new Error("PLUGIN_CONNECTION_NOT_FOUND");
  }

  if (!safeEqual(hashPluginToken(token), connection.tokenHash)) {
    throw new Error("PLUGIN_TOKEN_INVALID");
  }

  const path = new URL(input.request.url).pathname;
  const expected = signPluginRequest({
    method: input.request.method,
    path,
    timestamp: timestampSeconds,
    body: input.bodyText,
    secret: token
  });

  if (!safeEqual(signature, expected)) {
    throw new Error("PLUGIN_SIGNATURE_INVALID");
  }

  return {
    siteId,
    organizationId: connection.site.organizationId,
    tokenVersion: connection.tokenVersion
  };
}

export async function acceptPluginSyncBatch(input: {
  authentication: PluginSyncAuthentication;
  body: unknown;
}): Promise<{ accepted: number; cursor: string | null }> {
  const parsed: PluginSyncBatch = pluginSyncBatchSchema.parse(input.body);

  if (
    parsed.siteId !== input.authentication.siteId ||
    parsed.organizationId !== input.authentication.organizationId
  ) {
    throw new Error("PLUGIN_SYNC_SCOPE_MISMATCH");
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    for (const item of parsed.items) {
      await tx.syncedContentItem.upsert({
        where: {
          siteId_externalId: {
            siteId: parsed.siteId,
            externalId: item.externalId
          }
        },
        update: {
          organizationId: parsed.organizationId,
          type: item.type,
          url: item.url,
          title: item.title,
          status: item.status,
          modifiedAt: new Date(item.modifiedAt),
          lastSeenAt: now
        },
        create: {
          organizationId: parsed.organizationId,
          siteId: parsed.siteId,
          externalId: item.externalId,
          type: item.type,
          url: item.url,
          title: item.title,
          status: item.status,
          modifiedAt: new Date(item.modifiedAt),
          firstSeenAt: now,
          lastSeenAt: now
        }
      });
    }

    await tx.wordPressConnection.update({
      where: {
        siteId: parsed.siteId
      },
      data: {
        lastSyncAt: now
      }
    });
  });

  return {
    accepted: parsed.items.length,
    cursor: parsed.cursor
  };
}

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashPluginToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function signPluginRequest(input: {
  method: string;
  path: string;
  timestamp: number;
  body: string;
  secret: string;
}): string {
  const payload = [
    input.method.toUpperCase(),
    input.path,
    String(input.timestamp),
    createHash("sha256").update(input.body).digest("hex")
  ].join("\n");

  return createHmac("sha256", input.secret).update(payload).digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
