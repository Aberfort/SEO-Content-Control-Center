import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import type { Prisma } from "@prisma/client";
import { prisma } from "@sccc/database";
import {
  assertPermission,
  pluginConnectionChallengeCreateSchema,
  pluginConnectionDisconnectSchema,
  pluginConnectionExchangeSchema,
  pluginSyncBatchSchema,
  signPluginRequest,
  type PluginConnectionChallengeCreateInput,
  type PluginConnectionDisconnectInput,
  type PluginConnectionExchangeInput,
  type PluginSyncBatch
} from "@sccc/shared";

import { encryptSecret, isTokenEncryptionConfigured } from "./token-encryption";
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

export type PluginConnectionDisconnectResult = {
  siteId: string;
  organizationId: string;
  status: "DISCONNECTED";
  disconnectedAt: string;
  invalidatedChallenges: number;
  alreadyDisconnected: boolean;
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
  const encryptedToken = isTokenEncryptionConfigured() ? encryptSecret(token) : null;
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
        encryptedToken,
        tokenVersion: {
          increment: 1
        },
        disconnectedAt: null
      },
      create: {
        siteId: challenge.siteId,
        tokenHash,
        encryptedToken,
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

export async function disconnectPluginConnection(input: {
  user: AppUser;
  organizationId: string;
  siteId: string;
}): Promise<PluginConnectionDisconnectResult> {
  const parsed: PluginConnectionDisconnectInput = pluginConnectionDisconnectSchema.parse(input);
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

  return markPluginConnectionDisconnected({
    organizationId: parsed.organizationId,
    siteId: parsed.siteId,
    userId: input.user.id,
    source: "saas"
  });
}

export async function disconnectAuthenticatedPluginConnection(input: {
  authentication: PluginSyncAuthentication;
  body: unknown;
}): Promise<PluginConnectionDisconnectResult> {
  const parsed: PluginConnectionDisconnectInput = pluginConnectionDisconnectSchema.parse(
    input.body
  );

  if (
    parsed.organizationId !== input.authentication.organizationId ||
    parsed.siteId !== input.authentication.siteId
  ) {
    throw new Error("PLUGIN_DISCONNECT_SCOPE_MISMATCH");
  }

  return markPluginConnectionDisconnected({
    organizationId: parsed.organizationId,
    siteId: parsed.siteId,
    userId: null,
    source: "plugin"
  });
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
      const metadata = toPrismaJson(item.metadata);

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
          metadata,
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
          metadata,
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

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashPluginToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function markPluginConnectionDisconnected(input: {
  organizationId: string;
  siteId: string;
  userId: string | null;
  source: "plugin" | "saas";
}): Promise<PluginConnectionDisconnectResult> {
  const site = await prisma.site.findFirst({
    where: {
      id: input.siteId,
      organizationId: input.organizationId
    },
    include: {
      wordpressConnection: true
    }
  });

  if (!site) {
    throw new Error("SITE_NOT_FOUND");
  }

  if (!site.wordpressConnection) {
    throw new Error("PLUGIN_CONNECTION_NOT_FOUND");
  }

  if (site.wordpressConnection.disconnectedAt) {
    if (site.status !== "DISCONNECTED") {
      await prisma.site.update({
        where: {
          id: site.id
        },
        data: {
          status: "DISCONNECTED"
        }
      });
    }

    return {
      siteId: site.id,
      organizationId: site.organizationId,
      status: "DISCONNECTED",
      disconnectedAt: site.wordpressConnection.disconnectedAt.toISOString(),
      invalidatedChallenges: 0,
      alreadyDisconnected: true
    };
  }

  const disconnectedAt = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const connection = await tx.wordPressConnection.update({
      where: {
        siteId: site.id
      },
      data: {
        disconnectedAt,
        tokenVersion: {
          increment: 1
        }
      }
    });
    const invalidatedChallenges = await tx.wordPressConnectionChallenge.updateMany({
      where: {
        siteId: site.id,
        usedAt: null
      },
      data: {
        usedAt: disconnectedAt
      }
    });

    await tx.site.update({
      where: {
        id: site.id
      },
      data: {
        status: "DISCONNECTED"
      }
    });

    await tx.activityLog.create({
      data: {
        organizationId: site.organizationId,
        userId: input.userId,
        action: "plugin.disconnected",
        entityType: "Site",
        entityId: site.id,
        metadata: {
          siteId: site.id,
          source: input.source,
          tokenVersion: connection.tokenVersion,
          invalidatedChallenges: invalidatedChallenges.count
        }
      }
    });

    return {
      connection,
      invalidatedChallenges: invalidatedChallenges.count
    };
  });

  return {
    siteId: site.id,
    organizationId: site.organizationId,
    status: "DISCONNECTED",
    disconnectedAt: result.connection.disconnectedAt?.toISOString() ?? disconnectedAt.toISOString(),
    invalidatedChallenges: result.invalidatedChallenges,
    alreadyDisconnected: false
  };
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
