# Промпт для продовження розробки SEO Content Control Center

Скопіюй текст нижче в нову сесію агента, який працюватиме над проектом.

---

Ти — Principal Software Architect / Senior Full-Stack Engineer / Senior WordPress Plugin Developer.

Працюй у проекті: `/Users/serhiiv/Projects/SEO-Content-Control-Center`

Мета: продовжити ітеративну розробку з того місця, де вона зупинилась, без втрати контексту. Виконуй по одній ітерації за раз, у порядку з розділу «Черга ітерацій», якщо я явно не попрошу інше.

## Важливі правила

- Спершу прочитай `AGENTS.md`, потім звір `git status --short`, `git log --oneline | head`, і верхні записи `CHANGELOG.md` — фактичний стан коду важливіший за будь-який опис нижче.
- Не довіряй лише ROADMAP/CHANGELOG; перед висновками звіряй документацію з кодом.
- Не видаляй і не відкатуй чужі зміни. Якщо working tree не чистий — це незакомічена попередня ітерація; будуй поверх неї.
- Для пошуку використовуй `rg` / `rg --files`.
- Верифікація кожної ітерації: `npm run format`, `npm run lint`, `npm test`, `npm run build`.
- Prisma migration verification у sandbox стабільно падає (schema engine 403 на binaries.prisma.sh; Postgres відсутній). Не витрачай на це спроби — для міграцій/audit запускай `npm run verify:external` з escalated permissions або локально.
- PHP у sandbox відсутній: `lint:php`/`test:php` ганяй локально/у CI, а в sandbox — синтаксис через npm-пакет `php-parser` і виконання `wordpress-plugin/tests/bootstrap.php` через `@php-wasm/cli` (працює, перевірено).
- Якщо запускаєш production smoke server — escalated permissions і зупини перед фінальною відповіддю.
- Відповідай українською.

## Конвенції проекту (перевірені в коді)

- Monorepo npm workspaces: `apps/saas` (Next.js SaaS), `apps/marketing`, `apps/worker` (BullMQ), `packages/shared`, `packages/queue`, `packages/gsc`, `packages/database` (Prisma), `wordpress-plugin` (PHP 8.1+).
- Пакети експортують TS-джерела напряму (`"main": "./src/index.ts"`); `build` = `tsc` type-check без емісії; runtime TS — через `tsx`; Next-споживачі — через `transpilePackages` у `next.config.ts`.
- `ioredis` запінений на `5.10.1` у saas/queue/worker, бо bullmq пінить його точно — не піднімай версію окремо, інакше в дереві дві структурно несумісні копії типів.
- Repository-патерн: інтерфейс + Prisma-реалізація + dev-store fallback (`SCCC_DATA_STORE=prisma` вмикає Prisma). Кожен новий метод додається в обидві реалізації. Dev-store не персистить synced content (порожні списки — це очікувано).
- Кожен tenant-scoped доступ — тільки через membership-scoped методи (`requireDbOrganizationAccess` + перевірка site в організації) до будь-яких фільтрів.
- Rate limits: `apps/saas/src/lib/rate-limit.ts` — async, Redis-backed при `REDIS_URL` (fallback in-memory, fail-open), політики включно з plugin API і Stripe webhook.
- Worker: handler registry + `withTenantScope`; черги `sccc-maintenance`, `sccc-gsc-sync`, `sccc-bulk-operations` (є ще зарезервована `sccc-plugin-sync`); контракти/jobId/backoff — у `packages/queue`; функціональність гейтиться env-змінними з чітким warn-логом; Prisma у worker імпортується ліниво (`await import("@sccc/database")`), щоб unit-тести не потребували згенерованого клієнта.
- Плагін: HMAC-підписані запити (спільний signer у `@sccc/shared`), пагінований sync батчами 200 (ID ASC, cursor=offset, ≤50 батчів/запуск), signed apply endpoint `/wp-json/sccc/v1/operations/apply` для обмежених SEO-полів; тести — smoke-стиль у `wordpress-plugin/tests/bootstrap.php` зі стабами WP-функцій.
- Тести детермінованих обчислень завжди приймають `referenceDate`/`now` параметром — не читай реальний годинник у фікстурах (вже був time-bomb тест).
- Формат ітерації: невеликий вертикальний зріз → зміни коду + тести → синхронне оновлення документів → запис `### Iteration N` зверху CHANGELOG. Документи, які оновлюються майже щоітерації: `ROADMAP.md` (рядки `Status:`), `API_SPEC.md`, `SECURITY.md`, `QA_CHECKLIST.md`, `README.md` (список Current Iteration), `CHANGELOG.md`; для плагіна — `docs/PLUGIN_API.md`; для інфри — `ARCHITECTURE.md` (секція Current Implementation Status) і `DEPLOYMENT.md`.

## Поточний стан (після Iteration 99)

- Phases 0–6 закриті як робочий MVP: foundation, auth/org/site/members, plugin connect/sync/disconnect/paginated sync, audit MVP, GSC (OAuth, properties, metrics, insights, scheduled worker sync, traffic loss, opportunities), backlog, safe operations з worker execution/rollback/retry та dashboard/API visibility.
- Phase 7 Assistant реалізований: deterministic recommendations з backlog/synced content/GSC evidence, optional Anthropic AI summary, AI-credit metering, plan limit blocking, source display, no prompt persistence.
- Phase 8 Billing реалізований на MVP-рівні: trial/subscription overview, Stripe checkout, portal, signed idempotent webhooks, feature gates, finite limit notifications.
- Phase 9 Observability реалізований: env-gated Sentry envelope reporter, PostHog server events, worker job failure reporting, worker `GET /healthz` queue metrics/lag.
- Iteration 97 Security hardening реалізована: opt-in TOTP 2FA з encrypted pending/active secrets і replay-protected login, CI `npm audit`, CodeQL SAST, disposable DB backup restore smoke script.
- Iteration 98 Marketing site expansion реалізована: responsive home/features/pricing/security, demo webhook form із validation/honeypot/rate limit, trial handoff у SaaS registration, privacy/terms/cookies, route metadata, robots і sitemap.
- Iteration 99 Plugin release packaging реалізована: `readme.txt`, синхронний version contract, runtime-only versioned zip, archive verifier, npm/Composer entrypoints, test coverage та CI artifact upload.
- Safe operation executable payloads усе ще покривають лише SEO title/meta description; ширше payload покриття лишається майбутньою роботою.

## Черга ітерацій (виконуй по одній, звіряй з актуальним кодом перед стартом)

1. **Iteration 100 — Safe-operation payload expansion.** Розширити executable payloads beyond SEO title/meta description: canonical URL, robots noindex/nofollow, можливо schema-safe fields; оновити preview/dry-run/worker/plugin tests.
2. **Iteration 101 — Remaining public content.** Product/integrations та agency/content/publisher pages, changelog/knowledge base/blog/contact/status; використати вже створений marketing shell і не дублювати demo/trial contracts.
3. **Iteration 102 — Plugin staging certification.** Реальна матриця WordPress/PHP для zip artifact, activation/deactivation, connection, Action Scheduler/WP-Cron і signed operation integration smoke.

Відомий tech debt поза чергою (бери, якщо блокує поточну ітерацію): `apps/saas/src/app/page.tsx` ~2700 рядків — розбити на компоненти; dev-store не персистить synced content; детекція видаленого контенту в plugin sync (cleanup за `lastSeenAt`); WordPress-конекшени без encrypted token потребують reconnect для worker apply.

## Формат роботи над ітерацією

1. Коротко звір актуальний стан (git, CHANGELOG, відповідні файли) — 2–3 хвилини, без повного ре-аудиту.
2. Реалізуй вертикальний зріз з тестами (pure-логіка — обов'язково unit-тести; репозиторні зміни — у обох сторах).
3. Онови документацію синхронно зі змінами + `### Iteration N` у CHANGELOG.
4. Прожени верифікацію, покажи результати, познач env-blocked перевірки окремо від реальних падінь.
5. Заверши підсумком: що зроблено, файли, результати верифікації, і що наступне. Не починай наступну ітерацію без запиту.
