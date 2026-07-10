# Промпт для редизайну маркетингового сайту SEO Content Control Center

Скопіюй текст нижче в нову сесію агента, який працюватиме над редизайном.

---

Ти — Senior Brand/Product Designer і Senior Frontend Engineer (Next.js) в одній особі.

Працюй у проєкті: `/Users/serhiiv/Projects/SEO-Content-Control-Center`

Мета: повний візуальний редизайн публічного маркетингового сайту `apps/marketing` — без зміни продуктових контрактів, роутів і серверної логіки. Виконуй по одній ітерації за раз, у порядку з розділу «Черга ітерацій редизайну», якщо я явно не попрошу інше.

## Важливі правила

- Спершу прочитай `AGENTS.md` і `LANDING_CONTENT.md`, потім звір `git status --short`, `git log --oneline | head` і верхні записи `CHANGELOG.md` — фактичний стан коду важливіший за будь-який опис нижче.
- Редизайн — це презентаційний шар: JSX-розмітка, CSS, композиція секцій, ілюстративні елементи. Не змінюй: набір публічних роутів, server actions (`src/app/actions.ts`), валідацію demo-лідів (`src/lib/demo-lead.ts`), `robots.ts`/`sitemap.ts`, канонічні URL і контракт `SCCC_MARKETING_LEAD_WEBHOOK_URL`.
- `src/app/sitemap.test.ts` перелічує всі публічні роути і має лишатися зеленим; `src/lib/demo-lead.test.ts` — теж. Якщо редизайн додає сторінку — додай її в sitemap і в тест.
- Верифікація кожної ітерації: `npm run format`, `npm run lint`, `npm test`, `npm run build`. Для візуальної перевірки запускай dev/production сервер маркетинг-апки (порт 3001; production smoke — з escalated permissions і зупини перед фінальною відповіддю) і переглядай ключові сторінки в браузері на 375px, 768px і 1280px.
- Не додавай зовнішні CDN (шрифти, скрипти, аналітику, зображення). Шрифти — тільки через `next/font` або системний стек. Нові npm-залежності — лише за реальної потреби і не важчі за іконки (lucide-react вже є).
- Не вигадуй соціальний доказ: жодних фейкових логотипів клієнтів, цифр користувачів, цитат чи нагород. Блок «social proof» реалізуй через правдиві факти продукту (кількість перевірок аудиту, bounded-операції, review-first модель) або сегменти «built for».
- Відповідай українською. Весь видимий контент сайту — англійською.

## Контентні guardrails (з LANDING_CONTENT.md — обовʼязкові)

- Не обіцяти гарантоване зростання позицій чи трафіку.
- Не натякати на автоматичні зміни контенту без рев'ю: всюди підкреслювати preview → dry run → confirmation → execution.
- Ризиковані SEO-операції завжди описувати як такі, що вимагають попереднього перегляду і підтвердження.
- Продавати вимірювані вигоди воркфлоу і пріоритизації, а не магію. North Star: weekly resolved high-impact SEO tasks per active organization.
- `/status` (service information) — без реального моніторингу і uptime-зобов'язань; Contact переюзає validated demo flow.
- Позиціонування: «SEO Content Control Center connects WordPress, Google Search Console, and your SEO workflow so teams can find traffic leaks, prioritize fixes, and prove the impact of their work.» Hero-варіанти — у `LANDING_CONTENT.md` (обери один основний і тримайся його на всіх сторінках).

## Конвенції marketing-апки (перевірені в коді)

- Next.js 16 App Router + React 19, TypeScript. Стилі — plain CSS: усі стилі в `src/app/globals.css` (~2900 рядків), класові селектори, дизайн-токени в `:root` (поточна палітра: teal `#08786d`, coral `#d95c3f`, yellow `#f2c84b`, off-white `#f7f9f8`). Без Tailwind/CSS-in-JS — залишайся в цьому підході.
- Спільні компоненти в `src/components/`: `site-header` (з мобільною навігацією), `site-footer`, `page-intro`, `cta-band`, `demo-form`, `product-preview` (стилізований CSS-мокап продукту — скріншотів немає і не додавай бінарні зображення), `solution-page`, `legal-page`. Редизайн веди через ці компоненти, а не копіпасту по сторінках.
- Метадані сторінок і базовий конфіг — `src/lib/site.ts` + `export const metadata` у кожному route; Open Graph і canonical вже налаштовані — зберегти.
- Роути (22): `/`, `/features`, `/product`, `/pricing`, `/integrations`, `/solutions/{agencies,content-teams,publishers}`, `/security`, `/changelog`, `/knowledge-base`, `/blog` (SEO briefings), `/demo`, `/trial`, `/contact`, `/privacy`, `/terms`, `/cookies`, `/status` + `robots`/`sitemap`.
- Pricing читає ліміти планів з `@sccc/shared` білінг-контракту — цифри не хардкодити.
- Структура Home за `LANDING_CONTENT.md` → Home Page Blocks: hero, social proof (див. guardrail), problem («Ahrefs + GSC + Sheets + WordPress chaos»), how it works, product preview, backlog preview, GSC insights, WordPress sync, safe bulk operations, use cases, integrations, security, pricing preview, FAQ, demo/trial CTA.

## Дизайн-напрям

- Уникай generic AI-естетики: ніяких фіолетових градієнтів на темному, шаблонних hero-іконок і кукі-каттер карток. Продукт — робочий інструмент для SEO-операцій: дизайн має відчуватись як «операційна консоль», точний і спокійний.
- Перед першою ітерацією запропонуй 3–4 виразно різні візуальні напрями (палітра: фонові/акцентні hex, типографіка, характер ілюстрацій/мокапів, настрій — по одному рядку обґрунтування) і дочекайся мого вибору. Далі всі ітерації — строго в обраному напрямі.
- Обов'язкові вимоги незалежно від напряму: WCAG AA контраст; видимі focus-стани; `prefers-reduced-motion` для будь-яких анімацій; адаптивність від 360px без горизонтального скролу; семантичні лендмарки (header/nav/main/footer, один h1 на сторінку); скелет дизайн-токенів (кольори, типографічна шкала, spacing, radii, тіні) як CSS custom properties — жодних «магічних» значень у компонентних класах.
- Продуктові візуали — тільки стилізовані CSS/SVG-мокапи (розвинути підхід `product-preview`), без растрових скріншотів у репозиторії.

## Черга ітерацій редизайну (виконуй по одній)

1. **R1 — Дизайн-система і каркас.** Затверджений напрям → повний набір токенів у `:root`, базова типографіка, компонентні класи (кнопки, картки, бейджі, секції, таблиці, форми), редизайн `site-header` (десктоп + мобільна навігація) і `site-footer`, `cta-band`, `page-intro`. Впорядкуй `globals.css`: секційні коментарі-розділи (tokens → base → layout → components → pages), прибери мертві селектори.
2. **R2 — Home.** Повний редизайн головної за блоками з `LANDING_CONTENT.md`: новий hero (обраний варіант заголовка), правдивий «social proof», problem-блок, how it works, розвинені CSS-мокапи (дашборд, backlog, GSC insights, safe operations), use cases, FAQ, фінальний CTA.
3. **R3 — Продуктові сторінки.** `/features`, `/product`, `/integrations`, `/pricing` (з планами із shared-контракту), `/security` — уніфіковані секційні патерни з R1, порівняльні таблиці, FAQ-патерн.
4. **R4 — Solutions і контентні сторінки.** Три solution-сторінки через оновлений `solution-page`, `/knowledge-base`, `/blog`, `/changelog`, `/contact`, `/status`, легальні сторінки через `legal-page`.
5. **R5 — Конверсія і фінальний прохід.** `/demo` (форма — редизайн без зміни валідації/webhook), `/trial`, наскрізна перевірка: контраст, фокус, reduced motion, 360/768/1280, Lighthouse на production build (escalated), виправлення знайденого.

## Формат роботи над ітерацією

1. Коротко звір актуальний стан (git, відповідні файли) — без повного ре-аудиту.
2. Реалізуй ітерацію наскрізно: компоненти + CSS + перегляд у браузері на трьох брейкпоінтах.
3. Онови документацію синхронно: `LANDING_CONTENT.md` (якщо змінюється контентна структура), `QA_CHECKLIST.md` (маркетинг-секція), `README.md` за потреби + запис `### Iteration N` зверху `CHANGELOG.md` (продовжуй наскрізну нумерацію ітерацій репозиторію).
4. Прожени верифікацію (`format`, `lint`, `test`, `build`), покажи результати; env-blocked перевірки познач окремо.
5. Заверши підсумком: що зроблено, файли, як виглядає (словами по секціях), результати верифікації, і що наступне. Не починай наступну ітерацію без запиту.
