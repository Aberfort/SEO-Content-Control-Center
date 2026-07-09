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

## Поточний стан (після Iteration 91)

- Phases 0–5 повністю реалізовані: foundation, auth/org/site/members, plugin connect/sync/disconnect, audit MVP, GSC (OAuth, properties, daily metrics, insights, scheduled worker sync), backlog (конверсія/дедуп/фільтри/assignment/коментарі/історія/CSV).
- Phase 6 (safe operations) закрита end-to-end: preview → dry run → confirm → start → queue-виконання worker'ом через signed plugin apply endpoint → per-item результати → rollback restore реальними записами → queue-aware retry (execute/rollback) → itemStatusSummary/retryMode у відповідях і на дашборді. Виняток: activity log для деяких bulk-переходів і executable payloads покривають лише SEO title/meta description.
- GSC-лінія: traffic loss detection (site-вікна 14/14 зі severity; page-компарація снапшотів latest vs −7 днів) + matching падаючих сторінок до synced WordPress контенту через нормалізовані URL (`gsc-traffic-loss.ts`, `gsc-content-matching.ts`, endpoint `GET .../gsc/traffic-loss`, панель на дашборді).
- Assistant — детермінований, read-only, без зовнішнього AI provider, metering `metered: false`.
- Observability — лише плейсхолдери `SENTRY_DSN`/`POSTHOG_KEY`.
- Верифікаційний базлайн у sandbox: saas 100/100, worker 26/26, queue 11/11, shared 12/12, gsc 5/5, PHP smoke tests passed; 5 saas-suites (app-repository, gsc-*, plugin-connection) не піднімаються в sandbox лише через незгенерований Prisma client — у CI проходять.

## Черга ітерацій (виконуй по одній, звіряй з актуальним кодом перед стартом)

1. **Iteration 92 — Traffic-loss audit issues.** Матчені падаючі сторінки (drops із `content != null`) матеріалізуються як `AuditIssue` з типом `gsc.traffic-loss`, severity з детекції, evidence: діапазони, кліки now/baseline, delta, dropRatio, propertyUrl. Fingerprint `gsc:traffic-loss:<externalId>` для дедупу з існуючою системою (повторні аудити оновлюють issue, а не дублюють). Інтегрувати в існуючий шлях створення metadata-аудиту або окремою дією; issues конвертуються в backlog існуючими механізмами. Оновити audit-issue-generation/репозиторій+dev-store, тести, docs.
2. **Iteration 93 — Backlog from GSC opportunities.** Кандидати задач з GSC-можливостей: сторінки з високими impressions і низьким CTR відносно позиції (opportunity), позиції 5–15 із трафіком (striking distance). Детермінована pure-логіка з порогами, конверсія в persisted BacklogTask через існуючий candidate-механізм з дедупом.
3. **Iteration 94 — Assistant uses GSC evidence.** `assistant-recommendations.ts` додає рекомендації з traffic-loss/opportunity evidence (sources з GSC-даними), зберігаючи read-only і source display; безпечні preview-контролі лише для backlog-сourced.
4. **Iteration 95 — Real AI provider + AI credit metering.** Провайдер за env (наприклад `SCCC_AI_PROVIDER`, ключ), fallback на детермінований режим без ключа; реальний інкремент `UsageMetric` (`ai_credits`), `metered: true` для AI-відповідей, ліміти плану блокують виклики, notifications при вичерпанні. Без збереження промптів із секретами.
5. **Iteration 96 — Observability.** Sentry (saas + worker), PostHog server events із tenant-контекстом (події вже перелічені в `packages/shared/src/events.ts`), queue metrics (лічильники/lag з BullMQ) + health-ендпоінт воркера; логування без секретів.
6. **Iteration 97 — Security hardening pack.** 2FA (TOTP), SAST/dependency scanning у CI, restore-тести бекапів, закриття залишку: activity log для всіх bulk-переходів; переглянь SECURITY.md Roadmap Security Items.
7. **Iteration 98 — Marketing site expansion.** Сторінки features/pricing/security/legal, форми demo/trial, SEO-метадані; контент з `LANDING_CONTENT.md` і `PRODUCT_REQUIREMENTS.md`.
8. **Iteration 99 — WordPress plugin release packaging.** `readme.txt`, версіонування, збірка zip-артефакту (composer/скрипт), CI-крок; узгодити з DEPLOYMENT.md deployment units.

Відомий tech debt поза чергою (бери, якщо блокує поточну ітерацію): `apps/saas/src/app/page.tsx` ~2700 рядків — розбити на компоненти; dev-store не персистить synced content; детекція видаленого контенту в plugin sync (cleanup за `lastSeenAt`); WordPress-конекшени без encrypted token потребують reconnect для worker apply.

## Формат роботи над ітерацією

1. Коротко звір актуальний стан (git, CHANGELOG, відповідні файли) — 2–3 хвилини, без повного ре-аудиту.
2. Реалізуй вертикальний зріз з тестами (pure-логіка — обов'язково unit-тести; репозиторні зміни — у обох сторах).
3. Онови документацію синхронно зі змінами + `### Iteration N` у CHANGELOG.
4. Прожени верифікацію, покажи результати, познач env-blocked перевірки окремо від реальних падінь.
5. Заверши підсумком: що зроблено, файли, результати верифікації, і що наступне. Не починай наступну ітерацію без запиту.
