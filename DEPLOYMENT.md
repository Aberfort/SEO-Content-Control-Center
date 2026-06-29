# Deployment

## Environments

- Development: local Docker dependencies and local apps.
- Staging: production-like managed PostgreSQL, Redis, object storage, email, error tracking, analytics, and worker processes.
- Production: isolated credentials, managed database, managed Redis, object storage, CDN, queues, monitoring, alerts, and backups.

## Local Docker Services

- PostgreSQL for SaaS data.
- Redis for queues, rate limits, and caching.
- MinIO for S3-compatible storage.
- Mailpit for local email testing.

## Deployment Units

- SaaS web application.
- Marketing web application.
- Worker process.
- WordPress plugin release artifact.

## Zero-Downtime Strategy

- Use backward-compatible database migrations.
- Deploy code that supports old and new schemas.
- Run migrations.
- Remove deprecated fields in later releases.
- Use queue draining for worker changes.

## Health Checks

- SaaS: `GET /api/health`.
- Marketing: public page availability.
- Workers: heartbeat and queue lag.
- Database: connection and migration status.
- Redis: connection and queue health.

## Scaling Plan

- 10 sites: single web instance, single worker, managed PostgreSQL and Redis.
- 100 sites: separate workers for sync and audit queues, database indexes reviewed.
- 1,000 sites: queue partitioning by workload, object storage for large payloads, read replicas where useful.
- 10,000 sites: dedicated ingestion pipeline, horizontal workers, rate-limited tenant queues, archive strategy.
- 100,000+ URL sites: chunked sync, incremental hashes, resumable jobs, dead-letter queues, and audit sampling where safe.
- 1,000,000 URL sites: enterprise ingestion plan with custom limits, batch windows, and dedicated worker capacity.

## Backups

- Daily encrypted database backups.
- Point-in-time recovery for production.
- Object storage lifecycle policies.
- Quarterly restore tests.
