Ось повний зміст `README.md` — можеш просто скопіювати:

# Auth API Boilerplate

Мінімалістичний і production-oriented boilerplate для REST API з аутентифікацією на Node.js + Express + Prisma + TypeScript.

Проєкт містить тільки шар аутентифікації та базову інфраструктуру.

## Можливості

- Реєстрація / логін / logout / refresh токенів
- JWT Access Token + Refresh Token (refresh-токени зберігаються в БД у вигляді SHA-256 хешу)
- Валідація через Zod
- OpenAPI (Swagger UI) з нормальними схемами відповідей
- Rate limiting на auth-ендпоінтах
- Helmet + CORS (whitelist)
- Структуроване логування (Pino)
- Health checks:
  - `GET /healthz` — liveness
  - `GET /readyz` — readiness (перевіряє з’єднання з PostgreSQL)
- Graceful shutdown
- Готові unit-тести для auth-сервісів

## Технології

| Категорія          | Технологія                          |
|--------------------|-------------------------------------|
| Runtime            | Node.js + TypeScript                |
| Framework          | Express 5                           |
| ORM                | Prisma 7 + PostgreSQL               |
| Валідація          | Zod                                 |
| Документація API   | `@asteasolutions/zod-to-openapi` + Swagger UI |
| Auth               | JWT + bcrypt + crypto (SHA-256)     |
| Логування          | Pino + pino-http                    |
| Тести              | Vitest                              |

## Вимоги

- Node.js 20+
- PostgreSQL 14+
- npm / pnpm / yarn

## Швидкий старт

### 1. Клонування та встановлення залежностей

```bash
git clone <repo-url>
cd <project-folder>
npm install
```

### 2. Налаштування змінних оточення

Скопіюй приклад і заповни значення:

```bash
cp .env.example .env
```

### 3. Підготовка бази даних

Локальний PostgreSQL через Docker (створює бази `foodies` і `foodies_test`, що відповідають `.env.example`):

```bash
docker compose up -d --wait
```

```bash
# Генеруємо клієнт Prisma
npx prisma generate

# Застосовуємо міграції
npx prisma migrate dev
```

### 4. Запуск у режимі розробки

```bash
npm run dev
```

Сервер підніметься на `http://localhost:3000` (або на порту з `.env`).

- Swagger UI: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- Liveness: [http://localhost:3000/healthz](http://localhost:3000/healthz)
- Readiness: [http://localhost:3000/readyz](http://localhost:3000/readyz)

## Змінні оточення

| Змінна              | Обов’язкова | Опис                                      | Приклад                     |
|---------------------|-------------|-------------------------------------------|-----------------------------|
| `DATABASE_URL`      | Так         | PostgreSQL connection string              | `postgresql://user:pass@localhost:5432/auth_db` |
| `JWT_SECRET`        | Так         | Секрет для підпису access-токенів         | довгий випадковий рядок     |
| `PORT`              | Ні          | Порт сервера                              | `3000`                      |
| `NODE_ENV`          | Ні          | `development` / `production` / `test`     | `development`               |
| `ALLOWED_ORIGINS`   | Ні          | Список дозволених origins через кому      | `http://localhost:5173,https://myapp.com` |
| `AUTH_RATE_LIMIT_WINDOW_MS` | Ні  | Вікно rate limit для register/login, мс   | `900000`                    |
| `AUTH_RATE_LIMIT_MAX` | Ні        | Запитів з одного IP за вікно для register/login | `10`                   |
| `TRUST_PROXY_HOPS`  | Ні          | Кількість reverse proxy перед застосунком (Express `trust proxy`) | `1` за nginx, `0` без проксі |

> **Важливо:** У production обов’язково використовуй сильний `JWT_SECRET` і обмежуй `ALLOWED_ORIGINS`.

## Скрипти

```bash
npm run dev                # розробка з hot-reload (tsx watch)
npm start                  # production-запуск
npm run test               # усі тести
npm run test:unit          # тільки unit-тести
npm run test:coverage      # тести з покриттям
```

## API (Auth)

| Метод | Шлях                  | Опис                          | Auth |
|-------|-----------------------|-------------------------------|------|
| POST  | `/api/auth/register`  | Реєстрація                    | Ні   |
| POST  | `/api/auth/login`     | Логін                         | Ні   |
| POST  | `/api/auth/refresh`   | Оновлення пари токенів        | Ні*  |
| POST  | `/api/auth/logout`    | Вихід (відкликати надану сесію; всі сесії без refresh-токена або з уже неактивним) | Так  |
| GET   | `/api/auth/me`        | Поточний користувач           | Так  |

\* Refresh-токен можна передати в тілі запиту або через httpOnly cookie.

### Приклад реєстрації

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "user01",
  "email": "user01@example.com",
  "password": "securepass123",
  "name": "Taras Shevchenko"
}
```

### Приклад логіну

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "user01",
  "password": "securepass123"
}
```

У відповіді приходять `accessToken`, `refreshToken` і об’єкт `user`.  
Refresh-токен також встановлюється в httpOnly cookie.

## Health checks

| Ендпоінт    | Тип        | Що перевіряє                          | Успішна відповідь |
|-------------|------------|---------------------------------------|-------------------|
| `GET /healthz` | Liveness  | Процес живий, Event Loop відповідає  | `200 { "status": "ok" }` |
| `GET /readyz`  | Readiness | З’єднання з PostgreSQL (`SELECT 1`)  | `200 { "status": "ready" }` |

Якщо база недоступна — `/readyz` повертає `503`.

Ці ендпоінти призначені для платформи (Kubernetes, Docker, Railway, Render тощо) і **не** документуються в Swagger.

## Структура проєкту (спрощена)

Код організований за фічами. Кожен ресурс — це модуль у `src/modules/` зі
своїми шарами, тому зміна в рецептах залишається всередині папки рецептів.

```
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── requests/                     # .http файли для ручних перевірок
├── src/
│   ├── app.ts                    # middleware, підключення модулів, 404, обробник помилок
│   ├── app.module.ts             # перелік модулів застосунку
│   ├── bootstrap.ts              # listen + graceful shutdown
│   ├── config/env.ts             # перевірене оточення
│   ├── core/                     # спільне: http, база, openapi, помилки, логер
│   └── modules/
│       ├── auth/
│       │   ├── api/              # контролер, роутер, dto-схеми, шляхи openapi
│       │   ├── application/      # сценарії використання
│       │   ├── domain/           # типи, порти, правила, повідомлення
│       │   ├── infrastructure/   # prisma, bcrypt, jwt
│       │   ├── auth.config.ts
│       │   ├── auth.module.ts    # складання, віддає { path, router }
│       │   └── index.ts          # те, що можуть імпортувати інші модулі
│       ├── users/ recipes/ categories/ areas/ ingredients/ testimonials/
│       ├── media/                # сховище зображень за портом
│       └── health/               # /healthz та /readyz
├── tests/                        # інтеграційні та e2e; юніт-тести лежать поруч із кодом
├── index.ts                      # точка входу
└── package.json
```

Шари дивляться всередину: `api` говорить по HTTP, `application` тримає
сценарії, `domain` — типи й правила, `infrastructure` — prisma та зовнішні
сервіси. Один модуль звертається до іншого лише через його `index.ts`.

## Розгортання

### Загальні рекомендації

1. Використовуй `NODE_ENV=production`.
2. Обов’язково задай сильний `JWT_SECRET`.
3. Обмеж `ALLOWED_ORIGINS`.
4. Налаштуй health checks платформи:
   - Liveness → `/healthz`
   - Readiness → `/readyz`
5. Проєкт підтримує graceful shutdown (`SIGTERM` / `SIGINT`).

### Приклад для Docker / Kubernetes

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /readyz
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
```

### Міграції на проді

```bash
npx prisma migrate deploy
```

## Тестування

Зараз покриті unit-тестами сервіси аутентифікації (`createTokens`, хешування тощо).

```bash
npm run test:unit
```

Для інтеграційних тестів потрібна окрема тестова база (`TEST_DATABASE_URL`).

## Безпека (коротко)

- Паролі хешуються через bcrypt.
- Refresh-токени зберігаються в БД **тільки як SHA-256 хеш**.
- Access-токен має короткий час життя.
- При refresh старий токен позначається використаним (ротація); повторне використання після короткого grace-вікна відкликає всі сесії користувача (використані токени зберігаються до закінчення їх терміну дії для цієї перевірки).
- Чутливі заголовки редкатяться в логах.
- Rate limit стоїть на `/api/auth/register` і `/api/auth/login`.

---
