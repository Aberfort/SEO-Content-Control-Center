# Codex Project Notes

## Iteration Verification

- Run normal local checks in the sandbox: `npm run format`, `npm run lint`, `npm test`, and `npm run build`.
- The Prisma migration verification talks to the local Postgres service and reliably fails in the sandbox with a schema engine error. Do not spend a sandbox attempt on it. Run `npm run verify:db:migrate` directly with escalated permissions.
- Dependency audit needs registry access. Run `npm audit --audit-level=low` with escalated permissions, or run `npm run verify:external` with escalated permissions to combine the external migration and audit checks.
- When starting a production Next.js smoke server, use escalated permissions and stop the server before the final response.
