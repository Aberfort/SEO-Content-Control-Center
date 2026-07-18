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

## Поточний стан (після Iteration 111)

- Phases 0–6 закриті як робочий MVP: foundation, auth/org/site/members, plugin connect/sync/disconnect/paginated sync, audit MVP, GSC (OAuth, properties, metrics, insights, scheduled worker sync, traffic loss, opportunities), backlog, safe operations з worker execution/rollback/retry та dashboard/API visibility.
- Phase 7 Assistant реалізований: deterministic recommendations з backlog/synced content/GSC evidence, optional Anthropic AI summary, AI-credit metering, plan limit blocking, source display, no prompt persistence.
- Phase 8 Billing реалізований на MVP-рівні: trial/subscription overview, Stripe checkout, portal, signed idempotent webhooks, feature gates, finite limit notifications.
- Phase 9 Observability реалізований: env-gated Sentry envelope reporter, PostHog server events, worker job failure reporting, worker `GET /healthz` queue metrics/lag.
- Iteration 97 Security hardening реалізована: opt-in TOTP 2FA з encrypted pending/active secrets і replay-protected login, CI `npm audit`, CodeQL SAST, disposable DB backup restore smoke script.
- Iteration 98 Marketing site expansion реалізована: responsive home/features/pricing/security, demo webhook form із validation/honeypot/rate limit, trial handoff у SaaS registration, privacy/terms/cookies, route metadata, robots і sitemap.
- Iteration 99 Plugin release packaging реалізована: `readme.txt`, синхронний version contract, runtime-only versioned zip, archive verifier, npm/Composer entrypoints, test coverage та CI artifact upload.
- Iteration 100 Safe-operation payload expansion реалізована: preview формує bounded Yoast/Rank Math canonical repairs лише до URL synced item і точкове зняття `noindex`/`nofollow` з published content; worker/plugin contract і tests це покривають.
- Iteration 101 Remaining public content реалізована: Product/Integrations, agency/content/publisher solution pages, Knowledge Base, SEO briefings, Changelog, Contact та transparent service-information routes; navigation, sitemap і marketing coverage test оновлені без дублювання demo/trial contracts.
- Iteration 102 Plugin staging certification реалізована: `npm run plugin:certify` / `plugin:certify:matrix` (Docker) інсталюють зібраний zip у реальні WordPress-контейнери (latest WP на PHP 8.1/8.2/8.3 + гілка 6.8) і сертифікують activation, version contract, REST route, connection storage, WP-Cron scheduling, signed apply з tampered-signature rejection, deactivation cleanup і clean delete; той самий matrix — окремий CI job. Ручний pre-release залишок: один реальний challenge exchange проти staging SaaS, paginated sync і прогін з Action Scheduler.
- Iteration 103 Marketing homepage redesign реалізована: головна зведена до immersive product hero, evidence-to-work workflow та team/review-first section; збережено Next.js/CSS stack, реальний `ProductPreview`, існуючі demo/trial contracts і всі public routes; desktop/mobile viewport checks не мають horizontal overflow.
- Iteration 104 Vercel-inspired marketing redesign реалізована: публічна презентація переведена в монохромний, лаконічний SaaS-стиль з компактним header, технічним hero, sharper product preview framing і restrained CSS motion.
- Iteration 105 Marketing navigation redesign реалізована: header отримав сучасне burger-triggered mega-menu, grouped Platform/Solutions/Resources paths, responsive mobile grouping і полегшену closed-state навігацію без зайвих бордерів та фонів.
- Iteration 106 Homepage launch-readiness pass реалізована: головна перевірена на desktop/tablet/mobile/320px, вирівняна візуальна ритміка, прибрані overflow нюанси product preview, додано SVG app icon для `/favicon.ico` smoke.
- Iteration 107 Release hygiene реалізована: root `.prettierignore` виключає generated Impeccable skill/live-session artifacts із repository-wide format gate, а continuation/architecture/release docs синхронізовані з фактичним станом після Iteration 106.
- Iteration 108 Production deploy packaging реалізована: додано multi-target `Dockerfile` для `saas`/`marketing`/`worker`/`migrate`, `docker-compose.production.example.yml`, `.env.production.example`, `npm run deploy:smoke`, least-privilege service env mappings, production health checks, OpenSSL-ready Docker base і документацію для single-server Docker Compose deployment.
- Iteration 109 Production env/secrets matrix реалізована: додано `npm run deploy:env:check` / `scripts/verify-production-env.mjs`, `docs/PRODUCTION_ENV.md`, template-mode перевірку `.env.production.example`, production/staging gate для real env без `--allow-placeholders`, і документацію required values для origins, Postgres, Redis, Prisma persistence, secrets, SMTP, Stripe, GSC OAuth, marketing webhook, Sentry/PostHog, worker health, optional AI та restore-smoke target.
- Iteration 110 Staging end-to-end release rehearsal реалізована як repeatable release gate: додано `npm run deploy:staging:rehearse` / `scripts/rehearse-staging-release.sh` для staging env validation, plugin package build, staging SaaS/marketing smoke і optional private worker health smoke; додано `docs/STAGING_REHEARSAL.md` з evidence checklist для реального plugin challenge exchange, paginated sync >200 items, GSC OAuth/sync, demo webhook, Stripe webhook idempotency, safe-operation preview/dry-run/CONFIRM/worker execution/rollback/retry visibility.
- Iteration 111 Server smoke + rollback runbook реалізована: додано `npm run deploy:server:smoke` / `scripts/smoke-server-release.sh` для production env validation, `prisma migrate status`, Redis `PING`, plugin archive verification, SaaS/marketing/worker HTTP smoke та optional disposable restore drill; додано dependency-free `scripts/check-redis-url.mjs`; додано `docs/SERVER_SMOKE_ROLLBACK.md` з production smoke checklist, backup/restore drill, Docker Compose/managed-platform/plugin rollback paths і 60-minute post-deploy monitoring window.

## Черга ітерацій (виконуй по одній, звіряй з актуальним кодом перед стартом)

Узгоджені продуктові, маркетингові та deployment-packaging ітерації 92–108 виконані. Наступна черга — release/deploy-oriented, щоб довести всі продукти до серверного запуску:

1. **Iteration 112 — Final plugin release certification.** Перегенерувати `npm run plugin:package`, прогнати `npm run plugin:certify:matrix`, підтвердити artifact/version і staging WordPress з Action Scheduler.
2. **Iteration 113 — Launch cutover.** DNS/SSL/CDN, production migrations, worker start, uptime monitors, public route smoke, first real plugin install, demo/trial checks і post-launch watch window.

Відомий tech debt поза launch gate: `apps/saas/src/app/page.tsx` ~2900 рядків — розбити на компоненти; dev-store не персистить synced content; детекція видаленого контенту в plugin sync (cleanup за `lastSeenAt`); WordPress-конекшени без encrypted token потребують reconnect для worker apply; Phase 6 deeper operator guidance для partial/non-restorable failures; SSO for Enterprise; security review checklist for Enterprise; публічний API під план-ліміт `apiAccess`.

## Формат роботи над ітерацією

1. Коротко звір актуальний стан (git, CHANGELOG, відповідні файли) — 2–3 хвилини, без повного ре-аудиту.
2. Реалізуй вертикальний зріз з тестами (pure-логіка — обов'язково unit-тести; репозиторні зміни — у обох сторах).
3. Онови документацію синхронно зі змінами + `### Iteration N` у CHANGELOG.
4. Прожени верифікацію, покажи результати, познач env-blocked перевірки окремо від реальних падінь.
5. Заверши підсумком: що зроблено, файли, результати верифікації, і що наступне. Не починай наступну ітерацію без запиту.
