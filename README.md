# Auth API Boilerplate

A minimal and production-oriented boilerplate for a REST API with authentication, built with Node.js, Express, Prisma, and TypeScript.

This project contains only the authentication layer and core infrastructure.

## Features

- Registration / Login / Logout / Token refresh
- JWT Access Token + Refresh Token (refresh tokens are stored in the database as SHA-256 hashes)
- Validation with Zod
- OpenAPI (Swagger UI) with proper response schemas
- Rate limiting on auth endpoints
- Helmet + CORS (whitelist)
- Structured logging with Pino
- Health checks:
  - `GET /healthz` — liveness
  - `GET /readyz` — readiness (checks PostgreSQL connection)
- Graceful shutdown
- Unit tests for auth services

## Tech Stack

| Category           | Technology                              |
|--------------------|-----------------------------------------|
| Runtime            | Node.js + TypeScript                    |
| Framework          | Express 5                               |
| ORM                | Prisma 7 + PostgreSQL                   |
| Validation         | Zod                                     |
| API Documentation  | `@asteasolutions/zod-to-openapi` + Swagger UI |
| Auth               | JWT + bcrypt + crypto (SHA-256)         |
| Logging            | Pino + pino-http                        |
| Testing            | Vitest                                  |

## Requirements

- Node.js 20+
- PostgreSQL 14+
- npm / pnpm / yarn

## Quick Start

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd <project-folder>
npm install
```

### 2. Environment variables

Copy the example file and fill in the values:

```bash
cp .env.example .env
```

### 3. Database setup

Local PostgreSQL with Docker (creates the `foodies` and `foodies_test` databases matching `.env.example`):

```bash
docker compose up -d --wait
```

```bash
# Generate Prisma client
npx prisma generate

# Apply migrations
npx prisma migrate dev
```

### 4. Run in development mode

```bash
npm run dev
```

The server will start at `http://localhost:3000` (or the port specified in `.env`).

- Swagger UI: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- Liveness: [http://localhost:3000/healthz](http://localhost:3000/healthz)
- Readiness: [http://localhost:3000/readyz](http://localhost:3000/readyz)

## Environment Variables

| Variable            | Required | Description                                | Example                                      |
|---------------------|----------|--------------------------------------------|----------------------------------------------|
| `DATABASE_URL`      | Yes      | PostgreSQL connection string               | `postgresql://user:pass@localhost:5432/auth_db` |
| `JWT_SECRET`        | Yes      | Secret for signing access tokens           | long random string                           |
| `PORT`              | No       | Server port                                | `3000`                                       |
| `NODE_ENV`          | No       | `development` / `production` / `test`      | `development`                                |
| `ALLOWED_ORIGINS`   | No       | Comma-separated list of allowed origins    | `http://localhost:5173,https://myapp.com`    |
| `AUTH_RATE_LIMIT_WINDOW_MS` | No | Rate limit window for register/login, ms  | `900000`                                     |
| `AUTH_RATE_LIMIT_MAX` | No     | Requests per IP per window for register/login | `10`                                      |
| `TRUST_PROXY_HOPS`  | No       | Reverse proxies in front of the app (Express `trust proxy`) | `1` behind nginx, `0` when exposed directly |

> **Important:** In production always use a strong `JWT_SECRET` and restrict `ALLOWED_ORIGINS`.

## Scripts

```bash
npm run dev                # development with hot-reload (tsx watch)
npm start                  # production start
npm run test               # run all tests
npm run test:unit          # unit tests only
npm run test:coverage      # tests with coverage
```

## API (Auth)

| Method | Path                  | Description                     | Auth |
|--------|-----------------------|---------------------------------|------|
| POST   | `/api/auth/register`  | Register a new user             | No   |
| POST   | `/api/auth/login`     | Login                           | No   |
| POST   | `/api/auth/refresh`   | Refresh token pair              | No*  |
| POST   | `/api/auth/logout`    | Logout (revoke the presented session; all sessions without a refresh token or with one that is no longer live) | Yes  |
| GET    | `/api/auth/me`        | Get current user profile        | Yes  |

\* Refresh token can be passed in the request body or via an httpOnly cookie.

### Registration example

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "user01",
  "email": "user01@example.com",
  "password": "securepass123",
  "name": "John Doe"
}
```

### Login example

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "user01",
  "password": "securepass123"
}
```

The response contains `accessToken`, `refreshToken`, and a `user` object.  
The refresh token is also set as an httpOnly cookie.

## Health Checks

| Endpoint       | Type       | What it checks                            | Success response              |
|----------------|------------|-------------------------------------------|-------------------------------|
| `GET /healthz` | Liveness   | Process is alive, Event Loop is responsive | `200 { "status": "ok" }`     |
| `GET /readyz`  | Readiness  | PostgreSQL connection (`SELECT 1`)        | `200 { "status": "ready" }`  |

If the database is unavailable, `/readyz` returns `503`.

These endpoints are intended for the platform (Kubernetes, Docker, Railway, Render, etc.) and are **not** documented in Swagger.

## Project Structure (simplified)

```
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── client.ts
├── src/
│   ├── constants/
│   ├── controllers/
│   │   └── auth.controller.ts
│   ├── middleware/
│   │   ├── authenticate.ts
│   │   ├── errorHandler.ts
│   │   └── validate.ts
│   ├── routes/
│   │   └── auth.routes.ts
│   ├── services/
│   │   └── auth.ts
│   ├── validators/
│   │   └── auth.validator.ts
│   ├── logger.ts
│   └── openapi.ts
├── tests/
├── app.ts                 # Express app + health checks
├── index.ts               # Entry point + graceful shutdown
└── package.json
```

## Deployment

### General recommendations

1. Set `NODE_ENV=production`.
2. Always use a strong `JWT_SECRET`.
3. Restrict `ALLOWED_ORIGINS`.
4. Configure platform health checks:
   - Liveness → `/healthz`
   - Readiness → `/readyz`
5. The project supports graceful shutdown (`SIGTERM` / `SIGINT`).

### Example for Docker / Kubernetes

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

### Production migrations

```bash
npx prisma migrate deploy
```

## Testing

Unit tests currently cover the authentication services (`createTokens`, hashing, etc.).

```bash
npm run test:unit
```

Integration tests require a separate test database (`TEST_DATABASE_URL`).

## Security (summary)

- Passwords are hashed with bcrypt.
- Refresh tokens are stored in the database **only as SHA-256 hashes**.
- Access tokens have a short lifetime.
- On refresh the old token is marked as used (rotation); reusing it after a short grace window revokes all sessions of the user (used tokens are kept until they expire for this check).
- Sensitive headers are redacted in logs.
- Rate limiting is applied to `/api/auth/register` and `/api/auth/login`.

---
