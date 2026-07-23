# SEO Content Control Center Launch Runbook

Покрокова інструкція для першого production launch. Це практичний runbook:
що відкрити, де натиснути кнопку, який ключ скопіювати, у яку env-змінну
вставити, які команди виконати на сервері і як перевірити, що все живе.

Не вставляй production secrets у чат, GitHub issues, screenshots або docs.
Зберігай їх у password manager. У файлі `.env.production.local` мають бути
реальні значення, але сам файл не комітиться.

## 0. Рішення По Інфраструктурі

Для першого запуску беремо просту production-схему:

| Частина            | Вибір                   | Навіщо                                                                                         |
| ------------------ | ----------------------- | ---------------------------------------------------------------------------------------------- |
| DNS, CDN, SSL edge | Cloudflare              | Зручний DNS, proxy, SSL, WAF-налаштування без складної інфраструктури.                         |
| Сервер             | DigitalOcean Droplet    | Найпростіший шлях для Docker Compose, Postgres, Redis, SaaS, marketing і worker на одному VPS. |
| Reverse proxy      | Caddy                   | Автоматичний HTTPS і простий reverse proxy на `127.0.0.1:3000/3001`.                           |
| Runtime            | Docker Compose          | У нас вже є `docker-compose.production.example.yml`.                                           |
| Email              | Resend SMTP             | Простий SMTP для verification, invites, password reset.                                        |
| Demo leads         | Make.com Custom Webhook | Швидко приймає заявки з marketing site і пересилає в email/Slack/Sheets.                       |
| Billing            | Stripe                  | Checkout, subscription, billing portal, webhooks.                                              |
| GSC OAuth          | Google Cloud            | Підключення Google Search Console.                                                             |
| Errors/analytics   | Sentry + PostHog        | Production visibility після запуску.                                                           |

Чому не AWS на першому релізі: для старту він додасть IAM, ECS/EC2, RDS,
ElastiCache, ALB, ACM і багато операційної роботи. Наш поточний проект вже
підготовлений під Docker Compose, тому один VPS швидше і дешевше для MVP.

Чому не Cloudflare Pages/Workers для всього: SaaS потребує Node runtime,
Postgres, Redis і background worker. Це можна перенести на serverless пізніше,
але зараз це зайва перебудова.

## 1. Що Підготувати До Початку

1. Вибери домен. У прикладах нижче використовуй свої реальні значення:
   - marketing site: `https://example.com`
   - SaaS app: `https://app.example.com`
   - email sender: `no-reply@mail.example.com`
2. Заведи password manager item `SCCC Production`.
3. Підготуй акаунти:
   - Cloudflare: `https://dash.cloudflare.com`
   - DigitalOcean: `https://cloud.digitalocean.com`
   - GitHub: `https://github.com`
   - Resend: `https://resend.com`
   - Stripe: `https://dashboard.stripe.com`
   - Google Cloud: `https://console.cloud.google.com`
   - Make: `https://www.make.com`
   - Sentry: `https://sentry.io`
   - PostHog: `https://posthog.com`

## 2. Купити Або Підключити Домен У Cloudflare

### Якщо домену ще немає

1. Відкрий `https://dash.cloudflare.com`.
2. У лівому меню натисни **Domain Registration** або **Registrar**.
3. Натисни **Register Domains**.
4. У полі пошуку введи домен, наприклад `example.com`.
5. Вибери домен у результатах.
6. Натисни **Purchase** або **Continue to purchase**.
7. Заповни контактні дані власника домену.
8. Перевір, що domain privacy увімкнена, якщо Cloudflare показує цю опцію.
9. Оплати домен.

### Якщо домен вже куплений в іншого реєстратора

1. Відкрий `https://dash.cloudflare.com`.
2. Натисни **Add a domain** або **Add site**.
3. Введи домен, наприклад `example.com`.
4. Вибери план **Free** для старту.
5. Cloudflare покаже два nameserver-и.
6. Відкрий панель твого реєстратора домену.
7. Знайди **Nameservers**.
8. Заміни старі nameserver-и на два nameserver-и від Cloudflare.
9. Повернись у Cloudflare і натисни **Check nameservers**.
10. Дочекайся статусу **Active**. Це може зайняти від кількох хвилин до доби.

## 3. Створити SSH Key На Локальній Машині

Якщо SSH key вже є, можна використати наявний. Якщо ні:

```bash
ssh-keygen -t ed25519 -C "sccc-production"
```

Коли Terminal запитає шлях, натисни Enter для default
`~/.ssh/id_ed25519`. Коли запитає passphrase, краще задай passphrase і збережи
її у password manager.

Скопіюй public key:

```bash
pbcopy < ~/.ssh/id_ed25519.pub
```

Якщо `pbcopy` недоступний:

```bash
cat ~/.ssh/id_ed25519.pub
```

Скопіюй увесь рядок, який починається з `ssh-ed25519`.

## 4. Купити Сервер У DigitalOcean

Рекомендований стартовий сервер:

| Поле       | Значення                                                      |
| ---------- | ------------------------------------------------------------- |
| Provider   | DigitalOcean                                                  |
| Product    | Droplet                                                       |
| Region     | Frankfurt або Amsterdam для Європи; New York для US-аудиторії |
| Image      | Ubuntu 24.04 LTS                                              |
| Plan       | Basic                                                         |
| CPU option | Premium AMD або Regular, якщо хочеш дешевше                   |
| Size       | 2 vCPU / 4 GB RAM / 80 GB disk як мінімум                     |
| Backups    | Увімкнути                                                     |
| Monitoring | Увімкнути                                                     |
| Hostname   | `sccc-prod-01`                                                |
| Tag        | `sccc-prod`                                                   |

Кроки:

1. Відкрий `https://cloud.digitalocean.com`.
2. У верхньому правому куті натисни зелену кнопку **Create**.
3. У меню вибери **Droplets**.
4. У блоці **Choose Region** вибери `Frankfurt` або `Amsterdam`.
5. У блоці **Choose an image** вибери:
   - **OS**
   - **Ubuntu**
   - **24.04 LTS x64**
6. У блоці **Choose Size** вибери:
   - **Basic**
   - **Premium AMD** або **Regular**
   - план з `2 vCPU`, `4 GB RAM`, приблизно `80 GB disk`
7. У блоці **Choose Authentication Method** вибери **SSH Key**.
8. Натисни **New SSH Key** або **Add SSH Key**.
9. Встав public key з попереднього кроку.
10. Назви ключ `serhii-macbook-sccc-production`.
11. Натисни **Add SSH Key**.
12. У блоці **Recommended options** увімкни:
    - **Monitoring**
    - **Backups**
13. У блоці **Finalize Details**:
    - **Hostname**: `sccc-prod-01`
    - **Tags**: `sccc-prod`
14. Натисни **Create Droplet**.
15. Після створення скопіюй **Public IPv4 address**. Назвемо його
    `SERVER_IP`.

## 5. Налаштувати DigitalOcean Firewall

1. У DigitalOcean відкрий **Networking**.
2. Перейди у вкладку **Firewalls**.
3. Натисни **Create Firewall**.
4. Назва: `sccc-production-firewall`.
5. У **Inbound Rules** залиш або додай:
   - **SSH**, TCP `22`, Source: твій IP. Якщо не знаєш IP, тимчасово постав
     `All IPv4`, але після першого входу обмеж до свого IP.
   - **HTTP**, TCP `80`, Source: `All IPv4` і `All IPv6`.
   - **HTTPS**, TCP `443`, Source: `All IPv4` і `All IPv6`.
6. У **Outbound Rules** залиш default `All TCP`, `All UDP`, `All ICMP`.
7. У блоці **Apply to Droplets** вибери тег `sccc-prod` або сам Droplet.
8. Натисни **Create Firewall**.

## 6. Направити DNS У Cloudflare На Сервер

На цьому етапі спочатку ставимо DNS records у режим **DNS only**. Після того,
як Caddy отримає HTTPS-сертифікати і сайти відкриються, перемкнемо на
**Proxied**.

1. Відкрий `https://dash.cloudflare.com`.
2. Вибери домен `example.com`.
3. Перейди **DNS -> Records**.
4. Натисни **Add record**.
5. Додай marketing domain:
   - **Type**: `A`
   - **Name**: `@`
   - **IPv4 address**: `SERVER_IP`
   - **Proxy status**: `DNS only`
   - **TTL**: `Auto`
   - Натисни **Save**
6. Натисни **Add record** ще раз.
7. Додай SaaS subdomain:
   - **Type**: `A`
   - **Name**: `app`
   - **IPv4 address**: `SERVER_IP`
   - **Proxy status**: `DNS only`
   - **TTL**: `Auto`
   - Натисни **Save**

Після deploy і HTTPS-перевірки повернешся сюди, натиснеш на сірі хмаринки біля
`@` і `app`, щоб зробити їх помаранчевими **Proxied**.

## 7. Перший Вхід На Сервер

З локальної машини:

```bash
ssh root@SERVER_IP
```

Створи окремого deploy-користувача:

```bash
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

Вийди:

```bash
exit
```

Зайди вже як deploy:

```bash
ssh deploy@SERVER_IP
```

## 8. Базове Налаштування Ubuntu

На сервері:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git curl ca-certificates ufw unzip openssl gnupg
```

Налаштуй UFW:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Якщо Terminal запитає `Command may disrupt existing ssh connections. Proceed?`,
введи `y`.

## 9. Встановити Node.js 22

Серверу потрібен Node/npm для release smoke scripts. Docker build теж працює з
Node 22 у контейнері, але npm scripts зручніше запускати на host.

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x -o nodesource_setup.sh
sudo -E bash nodesource_setup.sh
sudo apt install -y nodejs
node -v
npm -v
```

Очікування:

- `node -v` показує `v22.x.x`
- `npm -v` показує `10.x.x` або новіше

## 10. Встановити Docker Engine І Compose Plugin

На сервері:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

Додай Docker repository:

```bash
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

Встанови Docker:

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker deploy
```

Вийди і зайди знову, щоб група `docker` застосувалась:

```bash
exit
ssh deploy@SERVER_IP
```

Перевір:

```bash
docker --version
docker compose version
```

## 11. Встановити Caddy

На сервері:

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/gpg.key" | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt" | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
sudo chmod o+r /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

Перевір:

```bash
caddy version
systemctl status caddy
```

## 12. Підготувати GitHub Репозиторій

Перед push на production branch на локальній машині бажано пройти release gate:

```bash
npm run format
npm run lint
npm test
npm run build
npm run verify:external
npm run plugin:release:certify
```

Якщо `npm run verify:external` питає доступ до локального Postgres/registry,
запускай його у звичному unsandboxed terminal. Це та сама зовнішня перевірка,
яку ми вже використовували у попередніх ітераціях.

Якщо проект ще не запушений у GitHub:

1. Відкрий `https://github.com`.
2. У правому верхньому куті натисни **+**.
3. Натисни **New repository**.
4. **Repository name**: `SEO-Content-Control-Center`.
5. Visibility: **Private**.
6. Не додавай README, `.gitignore`, license, якщо вони вже є локально.
7. Натисни **Create repository**.
8. Скопіюй SSH URL, наприклад:
   `git@github.com:your-org/SEO-Content-Control-Center.git`.

На локальній машині:

```bash
git status --short
git remote -v
```

Якщо `origin` ще немає:

```bash
git remote add origin git@github.com:your-org/SEO-Content-Control-Center.git
git push -u origin main
```

Якщо `origin` вже є:

```bash
git push
```

## 13. Дати Серверу Доступ До GitHub

На сервері:

```bash
ssh-keygen -t ed25519 -C "sccc-prod-01-deploy"
cat ~/.ssh/id_ed25519.pub
```

Скопіюй output, який починається з `ssh-ed25519`.

У GitHub:

1. Відкрий репозиторій `SEO-Content-Control-Center`.
2. Перейди **Settings -> Deploy keys**.
3. Натисни **Add deploy key**.
4. **Title**: `sccc-prod-01`.
5. **Key**: встав public key із сервера.
6. Не вмикай **Allow write access**, якщо серверу не треба пушити.
7. Натисни **Add key**.

На сервері перевір доступ:

```bash
ssh -T git@github.com
```

GitHub може відповісти, що shell access не надається. Це нормально, якщо він
впізнав key.

## 14. Завантажити Код На Сервер

На сервері:

```bash
sudo mkdir -p /opt/sccc
sudo chown deploy:deploy /opt/sccc
git clone git@github.com:your-org/SEO-Content-Control-Center.git /opt/sccc
cd /opt/sccc
npm ci
```

Якщо репозиторій вже клонований:

```bash
cd /opt/sccc
git pull
npm ci
```

## 15. Створити Production Env Файл

На сервері:

```bash
cd /opt/sccc
cp .env.production.example .env.production.local
chmod 600 .env.production.local
```

Відкрий файл:

```bash
nano .env.production.local
```

Поки що заповни базові значення:

```dotenv
NODE_ENV=production

NEXT_PUBLIC_APP_URL=https://app.example.com
NEXT_PUBLIC_MARKETING_URL=https://example.com

POSTGRES_USER=sccc
POSTGRES_PASSWORD=PASTE_RANDOM_POSTGRES_PASSWORD
POSTGRES_DB=sccc
DATABASE_URL=postgresql://sccc:PASTE_RANDOM_POSTGRES_PASSWORD@postgres:5432/sccc?schema=public

REDIS_URL=redis://redis:6379
SCCC_RATE_LIMIT_STORE=

AUTH_SECRET=PASTE_RANDOM_AUTH_SECRET
SCCC_PLUGIN_SIGNING_SECRET=PASTE_RANDOM_PLUGIN_SIGNING_SECRET
SCCC_TOKEN_ENCRYPTION_KEY=PASTE_RANDOM_TOKEN_ENCRYPTION_KEY
SCCC_DATA_STORE=prisma

SCCC_WORKER_HEALTH_PORT=8080
```

Згенеруй кожен secret окремо:

```bash
openssl rand -base64 48
```

Згенеруй і встав:

| Env                          | Що це                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| `POSTGRES_PASSWORD`          | Пароль локального production Postgres container.                                            |
| `AUTH_SECRET`                | Session/state signing secret.                                                               |
| `SCCC_PLUGIN_SIGNING_SECRET` | Server-side plugin signing/challenge secret.                                                |
| `SCCC_TOKEN_ENCRYPTION_KEY`  | Ключ для encrypted tokens. Втрата ключа означає втрату доступу до зашифрованих credentials. |
| `SCCC_GSC_STATE_SECRET`      | Окремий secret для Google OAuth state.                                                      |

## 16. Налаштувати Email У Resend

### Додати домен

1. Відкрий `https://resend.com`.
2. Перейди **Domains**.
3. Натисни **Add Domain**.
4. Введи `mail.example.com`.
5. Натисни **Add** або **Continue**.
6. Resend покаже DNS records для verification.

### Додати DNS records у Cloudflare

1. Відкрий Cloudflare dashboard.
2. Вибери домен `example.com`.
3. Перейди **DNS -> Records**.
4. Для кожного record з Resend натисни **Add record**.
5. Встав Type/Name/Value точно як показує Resend.
6. Для TXT/MX records proxy не застосовується. Для CNAME, якщо Cloudflare
   показує cloud icon, став **DNS only**.
7. Натисни **Save** для кожного record.

Повернись у Resend:

1. Відкрий домен `mail.example.com`.
2. Натисни **Verify DNS Records**.
3. Дочекайся статусу **Verified**.

### Створити API key для SMTP

1. У Resend відкрий **API Keys**.
2. Натисни **Create API Key**.
3. Name: `sccc-production-smtp`.
4. Permission: **Sending access**, якщо Resend дає вибір.
5. Domain: `mail.example.com`, якщо Resend дає обмежити key доменом.
6. Натисни **Create**.
7. Скопіюй key, який починається з `re_`.
8. Збережи його у password manager.

У `.env.production.local`:

```dotenv
SCCC_EMAIL_TRANSPORT=smtp
SCCC_EMAIL_FROM="SEO Content Control Center <no-reply@mail.example.com>"
SCCC_SMTP_HOST=smtp.resend.com
SCCC_SMTP_PORT=587
SCCC_SMTP_SECURE=false
SCCC_SMTP_USER=resend
SCCC_SMTP_PASSWORD=re_xxxxxxxxxxxxxxxxx
```

## 17. Налаштувати Demo Lead Webhook У Make

Marketing demo form відправляє JSON payload на
`SCCC_MARKETING_LEAD_WEBHOOK_URL`. Payload має подію
`marketing.demo_requested`, user agent і `lead`.

1. Відкрий `https://www.make.com`.
2. Перейди **Scenarios**.
3. Натисни **Create a new scenario**.
4. Натисни великий **+**.
5. У пошуку module введи `Webhooks`.
6. Вибери **Webhooks**.
7. Вибери trigger **Custom webhook**.
8. Натисни **Add**.
9. Webhook name: `sccc-demo-leads-production`.
10. Натисни **Save**.
11. Make покаже webhook URL. Натисни **Copy address to clipboard**.

Додай наступний module:

1. Натисни **+** після webhook module.
2. Вибери, куди відправляти lead:
   - Email module, якщо хочеш лист собі.
   - Slack module, якщо є Slack.
   - Google Sheets module, якщо хочеш таблицю заявок.
3. Для першого запуску найпростіше: **Email -> Send an email**.
4. Вкажи свій email у полі recipient.
5. У body встав змінні з webhook payload: name, workEmail, company, website,
   topic, notes.
6. Натисни **Save**.
7. У нижньому лівому куті перемкни scenario в **ON**.

У `.env.production.local`:

```dotenv
SCCC_MARKETING_LEAD_WEBHOOK_URL=https://hook.eu2.make.com/xxxxxxxxxxxxxxxx
SCCC_MARKETING_LEAD_WEBHOOK_SECRET=
```

Для першого запуску можна залишити `SCCC_MARKETING_LEAD_WEBHOOK_SECRET` пустим,
бо Make custom webhook вже має opaque URL. Пізніше краще додати секрет і
перевірку Bearer token у сценарії Make або перенести webhook на власний
endpoint.

## 18. Налаштувати Stripe Billing

Почни в Stripe test mode. Production live mode вмикай тільки після повного
smoke.

### Створити products і prices

1. Відкрий `https://dashboard.stripe.com`.
2. У верхній панелі увімкни **Test mode**.
3. Перейди **Product catalog** або **Products**.
4. Натисни **+ Add product**.
5. Product name: `Starter`.
6. Pricing model: **Standard pricing**.
7. Price: `49.00`.
8. Currency: `USD`.
9. Billing period: **Monthly**.
10. Натисни **Save product**.
11. На сторінці product знайди price id, який починається з `price_`.
12. Скопіюй його в `SCCC_STRIPE_PRICE_STARTER`.

Повтори для:

| Product | Monthly price | Env                         |
| ------- | ------------: | --------------------------- |
| Starter |         `$49` | `SCCC_STRIPE_PRICE_STARTER` |
| Pro     |        `$149` | `SCCC_STRIPE_PRICE_PRO`     |
| Agency  |        `$399` | `SCCC_STRIPE_PRICE_AGENCY`  |

### Отримати Stripe secret key

1. У Stripe відкрий **Developers** або **Workbench**.
2. Перейди **API keys**.
3. У test mode скопіюй **Secret key**, який починається з `sk_test_`.
4. Для live launch пізніше перемкни **Test mode** off і скопіюй live key
   `sk_live_`.

У `.env.production.local`:

```dotenv
SCCC_BILLING_PROVIDER=stripe
SCCC_STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxx
SCCC_STRIPE_PRICE_STARTER=price_xxxxxxxxxxxxxxxxx
SCCC_STRIPE_PRICE_PRO=price_xxxxxxxxxxxxxxxxx
SCCC_STRIPE_PRICE_AGENCY=price_xxxxxxxxxxxxxxxxx
SCCC_BILLING_SUCCESS_URL=https://app.example.com/dashboard?billing=success
SCCC_BILLING_CANCEL_URL=https://app.example.com/dashboard?billing=cancel
SCCC_BILLING_PORTAL_RETURN_URL=https://app.example.com/dashboard
```

### Створити webhook endpoint

1. У Stripe відкрий **Developers** або **Workbench**.
2. Перейди **Webhooks**.
3. Натисни **Add endpoint** або **Create an endpoint**.
4. Endpoint URL:
   `https://app.example.com/api/billing/webhooks/stripe`
5. Description: `SCCC production billing webhook`.
6. Events to send:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
7. Натисни **Add endpoint**.
8. Відкрий створений endpoint.
9. Натисни **Reveal** біля **Signing secret**.
10. Скопіюй secret, який починається з `whsec_`.

У `.env.production.local`:

```dotenv
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxx
```

## 19. Налаштувати Google Search Console OAuth

### Створити Google Cloud project

1. Відкрий `https://console.cloud.google.com`.
2. У верхньому project selector натисни поточний project.
3. Натисни **New Project**.
4. Project name: `SCCC Production`.
5. Натисни **Create**.
6. Переконайся, що у верхньому project selector вибраний `SCCC Production`.

### Увімкнути Search Console API

1. Відкрий **APIs & Services -> Library**.
2. У пошуку введи `Search Console API`.
3. Відкрий **Google Search Console API**.
4. Натисни **Enable**.

### Налаштувати consent screen / Google Auth Platform

1. Відкрий **APIs & Services -> OAuth consent screen** або
   **Google Auth Platform**.
2. User type: **External**.
3. Натисни **Create**.
4. App name: `SEO Content Control Center`.
5. User support email: твій робочий email.
6. App domain:
   - Application home page: `https://example.com`
   - Privacy policy: `https://example.com/privacy`
   - Terms of service: `https://example.com/terms`
7. Authorized domains: `example.com`.
8. Developer contact information: твій email.
9. Натисни **Save and Continue**.
10. Scopes: якщо Google просить scopes на цьому етапі, додай:
    - `openid`
    - `email`
    - `https://www.googleapis.com/auth/webmasters.readonly`
11. Якщо app у testing mode, додай свій Google account у **Test users**.

### Створити OAuth client

1. Відкрий **APIs & Services -> Credentials**.
2. Натисни **Create Credentials**.
3. Вибери **OAuth client ID**.
4. Application type: **Web application**.
5. Name: `SCCC Production SaaS`.
6. У **Authorized JavaScript origins** натисни **Add URI**:
   - `https://app.example.com`
7. У **Authorized redirect URIs** натисни **Add URI**:
   - `https://app.example.com/api/integrations/gsc/callback`
8. Натисни **Create**.
9. Скопіюй **Client ID**.
10. Скопіюй **Client secret**.

У `.env.production.local`:

```dotenv
SCCC_GSC_CLIENT_ID=xxxxxxxxxxxxxxxx.apps.googleusercontent.com
SCCC_GSC_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxx
SCCC_GSC_REDIRECT_URI=https://app.example.com/api/integrations/gsc/callback
SCCC_GSC_STATE_SECRET=PASTE_RANDOM_GSC_STATE_SECRET
```

Згенеруй `SCCC_GSC_STATE_SECRET`:

```bash
openssl rand -base64 48
```

## 20. Налаштувати Sentry

Це бажано зробити до launch, щоб бачити production errors.

1. Відкрий `https://sentry.io`.
2. Натисни **Create Project**.
3. Platform: **Next.js** або **JavaScript**.
4. Project name: `sccc-production`.
5. Team: твоя команда.
6. Натисни **Create Project**.
7. На сторінці setup знайди **DSN**.
8. Скопіюй HTTPS DSN.

У `.env.production.local`:

```dotenv
SENTRY_DSN=https://xxxxxxxxxxxxxxxx@o000000.ingest.sentry.io/000000
SENTRY_ENVIRONMENT=production
```

## 21. Налаштувати PostHog

1. Відкрий `https://posthog.com`.
2. Створи project `SCCC Production`.
3. Перейди **Project Settings**.
4. Знайди **Project API key**.
5. Скопіюй key, який часто починається з `phc_`.
6. Знайди **Host** або ingestion host.

У `.env.production.local`:

```dotenv
POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxx
POSTHOG_HOST=https://us.i.posthog.com
```

Якщо обрав EU region у PostHog, host буде EU-варіантом, який показує PostHog.

## 22. Перевірити Env Перед Build

На сервері:

```bash
cd /opt/sccc
npm run deploy:env:check -- --env-file .env.production.local --environment production
```

Очікування:

- `0 errors`.
- Якщо Sentry/PostHog пропущені, verifier може показати warnings. Для
  справжнього production launch краще не пропускати observability.

## 23. Налаштувати Caddy Reverse Proxy

Відкрий Caddyfile:

```bash
sudo nano /etc/caddy/Caddyfile
```

Замінити вміст на:

```caddyfile
example.com {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3001
}

app.example.com {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3000
}
```

Перевір config:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
```

Перезавантаж Caddy:

```bash
sudo systemctl reload caddy
sudo systemctl status caddy
```

Поки apps ще не запущені, Caddy може віддавати `502`. Це нормально. Після
Docker deploy має бути `200`.

## 24. Перший Production Deploy

На сервері:

```bash
cd /opt/sccc
git pull
npm ci
docker compose --env-file .env.production.local -f docker-compose.production.example.yml build
```

Запусти Postgres і Redis:

```bash
docker compose --env-file .env.production.local -f docker-compose.production.example.yml up -d postgres redis
```

Виконай migrations:

```bash
docker compose --env-file .env.production.local -f docker-compose.production.example.yml run --rm migrate
```

Запусти SaaS, marketing і worker:

```bash
docker compose --env-file .env.production.local -f docker-compose.production.example.yml up -d saas marketing worker
```

Перевір статус:

```bash
docker compose --env-file .env.production.local -f docker-compose.production.example.yml ps
```

Подивись логи, якщо щось не `healthy`:

```bash
docker compose --env-file .env.production.local -f docker-compose.production.example.yml logs --tail=120 saas
docker compose --env-file .env.production.local -f docker-compose.production.example.yml logs --tail=120 marketing
docker compose --env-file .env.production.local -f docker-compose.production.example.yml logs --tail=120 worker
```

## 25. Перевірити HTTPS І Увімкнути Cloudflare Proxy

На локальній машині відкрий:

- `https://example.com`
- `https://example.com/pricing`
- `https://example.com/security`
- `https://example.com/demo`
- `https://app.example.com/api/health`

Якщо HTTPS відкривається:

1. Відкрий Cloudflare dashboard.
2. Вибери домен `example.com`.
3. Перейди **DNS -> Records**.
4. Натисни сіру хмаринку біля `@`, щоб вона стала помаранчевою **Proxied**.
5. Натисни сіру хмаринку біля `app`, щоб вона стала помаранчевою **Proxied**.
6. Перейди **SSL/TLS -> Overview**.
7. Вибери mode **Full (strict)**.

Після цього повторно відкрий:

- `https://example.com`
- `https://app.example.com/api/health`

## 26. Запустити Server Smoke

На сервері:

```bash
cd /opt/sccc
SCCC_SERVER_WORKER_HEALTH_URL=http://127.0.0.1:8080/healthz npm run deploy:server:smoke
```

Очікування:

- env validation проходить;
- database migration status up to date;
- Redis відповідає `PONG`;
- SaaS HTTP smoke проходить;
- marketing HTTP smoke проходить;
- worker `/healthz` проходить;
- plugin archive verification проходить, якщо artifact є у `dist`.

Якщо plugin archive відсутній на сервері, згенеруй:

```bash
npm run plugin:package
SCCC_SERVER_WORKER_HEALTH_URL=http://127.0.0.1:8080/healthz npm run deploy:server:smoke
```

## 27. Перевірити Marketing Demo Form

1. Відкрий `https://example.com/demo`.
2. Заповни форму тестовими даними:
   - Name: `Internal Test`
   - Work email: твій email
   - Company: `SCCC Launch Test`
   - Website: твій тестовий сайт
3. Постав consent checkbox.
4. Натисни submit button.
5. Відкрий Make scenario.
6. Переконайся, що сценарій отримав один webhook event.
7. Переконайся, що email/Slack/Sheets отримали lead.

Після тесту познач lead як internal test, щоб не змішати з реальними заявками.

## 28. Перевірити SaaS Account І Billing

1. Відкрий `https://app.example.com`.
2. Зареєструй production test user.
3. Підтверди email, якщо verification увімкнена.
4. Створи organization.
5. Перейди у billing блок на dashboard.
6. Натисни checkout для Starter або Pro.
7. Stripe має відкрити hosted checkout.
8. У test mode використай Stripe test card:
   - Card: `4242 4242 4242 4242`
   - Expiration: будь-яка майбутня дата
   - CVC: будь-які 3 цифри
9. Після success Stripe має повернути на:
   `https://app.example.com/dashboard?billing=success`
10. У Stripe **Developers -> Webhooks** відкрий endpoint і перевір, що event
    доставився зі статусом `200`.

Якщо webhook `400` або `503`, перевір:

- `STRIPE_WEBHOOK_SECRET`
- `SCCC_STRIPE_SECRET_KEY`
- endpoint URL
- чи Stripe test/live mode відповідає keys у env.

## 29. Перевірити Google Search Console OAuth

1. У SaaS додай WordPress site з URL, який є у твоєму Google Search Console.
2. У секції **Google Search Console** натисни **Connect Google Search Console**.
3. Google відкриє OAuth consent.
4. Обери Google account, який має доступ до GSC property.
5. Дай read-only доступ.
6. Google має повернути назад на:
   `https://app.example.com/api/integrations/gsc/callback`
7. У SaaS має з'явитися connected Google account/property state.

Якщо Google показує `redirect_uri_mismatch`, у Google Cloud перевір
**Authorized redirect URIs**. Там має бути рівно:

```text
https://app.example.com/api/integrations/gsc/callback
```

Без slash в кінці, без `http`, без іншого subdomain.

## 30. Встановити WordPress Plugin

Plugin artifact вже сертифікований у проекті:

```text
dist/seo-content-control-center-0.1.0.zip
```

Перед production install можна локально або на сервері перезібрати:

```bash
npm run plugin:release:certify
```

Для встановлення у WordPress:

1. Відкрий WordPress admin цільового сайту.
2. Перейди **Plugins -> Add New Plugin**.
3. Натисни **Upload Plugin**.
4. Натисни **Choose File**.
5. Обери `seo-content-control-center-0.1.0.zip`.
6. Натисни **Install Now**.
7. Натисни **Activate Plugin**.

## 31. Підключити WordPress Plugin До SaaS

Поточний backend API для plugin challenge готовий, але в SaaS UI ще немає
окремої комфортної кнопки "Generate connection challenge". Для першого
internal launch можна створити challenge через browser DevTools після логіну.
Перед широким customer launch краще додати цю кнопку у SaaS UI.

### Отримати organizationId і siteId

На сервері:

```bash
cd /opt/sccc
docker compose --env-file .env.production.local -f docker-compose.production.example.yml exec postgres psql -U sccc -d sccc -c 'select o.id as organization_id, s.id as site_id, s.name, s.url, s.status from "Site" s join "Organization" o on o.id = s."organizationId" order by s."createdAt" desc;'
```

Скопіюй `organization_id` і `site_id` для потрібного сайту.

### Згенерувати challenge у browser DevTools

1. Відкрий `https://app.example.com`.
2. Увійди користувачем Owner/Admin для потрібної organization.
3. Відкрий browser DevTools:
   - Chrome: **View -> Developer -> JavaScript Console**
   - або `Option + Command + J` на macOS.
4. Встав:

```js
await fetch("/api/plugin/connections/challenges", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    organizationId: "PASTE_ORGANIZATION_ID",
    siteId: "PASTE_SITE_ID"
  })
}).then((response) => response.json());
```

5. Натисни Enter.
6. Скопіюй `data.challenge` з response.

Challenge діє 10 хвилин. Якщо не встиг, згенеруй новий.

### Вставити challenge у WordPress

1. Відкрий WordPress admin.
2. Перейди **Settings -> SEO Content Control Center**.
3. У поле **SaaS endpoint** встав:

```text
https://app.example.com
```

4. У поле **Connection challenge** встав `data.challenge`.
5. Натисни **Connect site**.
6. Після успіху сторінка покаже `Connected to site ...`.
7. Натисни **Queue manual sync**.
8. Повернись у SaaS і перевір, що content inventory почав з'являтись.

## 32. Post-Launch Monitoring На 60 Хвилин

Першу годину після launch тримай відкритими:

1. DigitalOcean Droplet metrics:
   - CPU
   - Memory
   - Disk
   - Network
2. Sentry:
   - New errors
   - Error frequency
3. Stripe webhook endpoint:
   - Delivery status
   - Failed events
4. Make scenario:
   - Successful runs
   - Failed runs
5. Server logs:

```bash
cd /opt/sccc
docker compose --env-file .env.production.local -f docker-compose.production.example.yml logs -f --tail=80 saas marketing worker
```

Healthy state:

- `https://example.com` відкривається.
- `https://app.example.com/api/health` повертає `200`.
- `http://127.0.0.1:8080/healthz` на сервері повертає `200`.
- Make demo webhook приймає test lead.
- Stripe test checkout повертається на dashboard.
- Stripe webhook delivery має `200`.
- GSC OAuth завершується без `redirect_uri_mismatch`.
- WordPress plugin manual sync завершується і показує sync log.

## 33. Rollback Якщо Щось Пішло Не Так

### Швидко подивитись стан

```bash
cd /opt/sccc
docker compose --env-file .env.production.local -f docker-compose.production.example.yml ps
docker compose --env-file .env.production.local -f docker-compose.production.example.yml logs --tail=120 saas marketing worker
```

### Перезапустити конкретний сервіс

```bash
docker compose --env-file .env.production.local -f docker-compose.production.example.yml restart saas
docker compose --env-file .env.production.local -f docker-compose.production.example.yml restart marketing
docker compose --env-file .env.production.local -f docker-compose.production.example.yml restart worker
```

### Відкотитись на попередній commit

```bash
cd /opt/sccc
docker compose --env-file .env.production.local -f docker-compose.production.example.yml stop worker
git fetch --all --tags
git checkout PREVIOUS_GOOD_SHA
docker compose --env-file .env.production.local -f docker-compose.production.example.yml build saas marketing worker
docker compose --env-file .env.production.local -f docker-compose.production.example.yml up -d saas marketing
docker compose --env-file .env.production.local -f docker-compose.production.example.yml up -d worker
SCCC_SERVER_WORKER_HEALTH_URL=http://127.0.0.1:8080/healthz npm run deploy:server:smoke
```

Не запускай destructive database rollback без окремого рішення. Міграції мають
бути backward-compatible; при проблемі краще roll-forward patch або app
rollback без DB rollback.

## 34. Що Треба Зробити Після Першого Production Launch

Це не блокує перший internal launch, але бажано перед публічним self-serve:

1. Додати у SaaS UI кнопку **Generate plugin connection challenge**, щоб не
   використовувати DevTools.
2. Перенести Postgres на managed database, коли з'являться реальні клієнти або
   регулярні writes.
3. Додати automated offsite backups для Postgres volume.
4. Додати uptime monitor для:
   - `https://example.com`
   - `https://app.example.com/api/health`
   - private worker health check через сервер або monitoring agent.
5. Налаштувати Cloudflare WAF/rate limiting для auth, billing webhook і plugin
   endpoints.
6. Додати release tags у GitHub:

```bash
git tag v0.1.0
git push origin v0.1.0
```

## 35. Фінальна Launch Checklist

Перед тим як вважати продукт опублікованим:

- [ ] DigitalOcean Droplet створений.
- [ ] Firewall відкриває тільки `22`, `80`, `443`.
- [ ] Cloudflare DNS `@` і `app` направлені на `SERVER_IP`.
- [ ] Caddy reverse proxy працює.
- [ ] `.env.production.local` заповнений real secrets.
- [ ] `npm run deploy:env:check -- --env-file .env.production.local --environment production` проходить.
- [ ] Docker compose services `postgres`, `redis`, `saas`, `marketing`, `worker` healthy.
- [ ] `SCCC_SERVER_WORKER_HEALTH_URL=http://127.0.0.1:8080/healthz npm run deploy:server:smoke` проходить.
- [ ] Marketing pages відкриваються.
- [ ] Demo form доходить до Make.
- [ ] Resend domain verified.
- [ ] Stripe products/prices створені.
- [ ] Stripe webhook endpoint має `200` на test event.
- [ ] Google OAuth client має правильний redirect URI.
- [ ] GSC connection проходить.
- [ ] WordPress plugin встановлюється і активується.
- [ ] WordPress plugin підключається до SaaS.
- [ ] Manual sync з WordPress проходить.
- [ ] Sentry/PostHog отримують production telemetry.
- [ ] Rollback SHA або tag відомий.
- [ ] 60 хвилин post-launch monitoring без критичних помилок.

## Official References

- DigitalOcean create Droplet:
  `https://docs.digitalocean.com/products/droplets/how-to/create/`
- DigitalOcean SSH keys:
  `https://docs.digitalocean.com/products/droplets/how-to/add-ssh-keys/`
- DigitalOcean production-ready Droplet setup:
  `https://docs.digitalocean.com/products/droplets/getting-started/recommended-droplet-setup/`
- Cloudflare domain registration:
  `https://developers.cloudflare.com/registrar/get-started/register-domain/`
- Cloudflare DNS records:
  `https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/`
- Cloudflare proxy status:
  `https://developers.cloudflare.com/dns/proxy-status/`
- Docker Engine on Ubuntu:
  `https://docs.docker.com/engine/install/ubuntu/`
- Caddy install:
  `https://caddyserver.com/docs/install`
- Caddy reverse proxy quick-start:
  `https://caddyserver.com/docs/quick-starts/reverse-proxy`
- Resend domains:
  `https://resend.com/docs/dashboard/domains/introduction`
- Resend SMTP:
  `https://resend.com/docs/send-with-smtp`
- Stripe API keys:
  `https://docs.stripe.com/keys`
- Stripe products and prices:
  `https://docs.stripe.com/products-prices/manage-prices`
- Stripe webhooks:
  `https://docs.stripe.com/webhooks`
- Google credentials:
  `https://developers.google.com/workspace/guides/create-credentials`
- Google OAuth web server flow:
  `https://developers.google.com/identity/protocols/oauth2/web-server`
- Make custom webhooks:
  `https://help.make.com/webhooks`
