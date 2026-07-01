CREATE TABLE "WordPressConnectionChallenge" (
  "id" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WordPressConnectionChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WordPressConnection_tokenHash_key" ON "WordPressConnection"("tokenHash");
CREATE UNIQUE INDEX "WordPressConnectionChallenge_tokenHash_key" ON "WordPressConnectionChallenge"("tokenHash");
CREATE INDEX "WordPressConnectionChallenge_siteId_expiresAt_idx" ON "WordPressConnectionChallenge"("siteId", "expiresAt");

ALTER TABLE "WordPressConnectionChallenge"
ADD CONSTRAINT "WordPressConnectionChallenge_siteId_fkey"
FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
