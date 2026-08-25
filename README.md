# Foodies API

REST API backend for **Foodies** — a web application for browsing, saving, and creating recipes.

The API powers a React SPA: authentication, recipe catalog, favorites, user profiles, follows, and media uploads.

## Features

- **Auth** — register / login with email & password, JWT access tokens, rotating refresh tokens (body and/or httpOnly cookie)
- **Recipes** — search with filters (category, area, ingredient) and pagination, popular recipes, details, create (multipart + image), own recipes, favorites
- **`isFavorite`** — flag on recipe list/detail responses for the current viewer (optional auth on public recipe routes)
- **Users** — current and public profiles with counters, avatar upload, follow / unfollow
- **`GET /api/users/:id/recipes`** — paginated recipes of a profile owner (`isFavorite` relative to the viewer)
- **Reference data** — categories (with image & description), areas, ingredients, testimonials
- **OpenAPI** — Swagger UI (`/api-docs`) and Scalar (`/reference`), raw spec at `/api-docs.json`
- **Ops** — health checks (`/healthz`, `/readyz`), Prisma migrations, structured logging

## Tech stack

| Layer | Technology |
|--------|------------|
| Runtime | Node.js, TypeScript (ESM) |
| HTTP | Express 5 |
| Database | PostgreSQL + Prisma |
| Validation / docs | Zod, `@asteasolutions/zod-to-openapi` |
| Auth | JWT (access), opaque refresh tokens, bcrypt |
| Media | Cloudinary (avatars, recipe thumbs, category images) |
| Tests | Vitest (unit / integration), Playwright (e2e) |
| Deploy | Dokku-friendly (`Procfile`, `app.json`, `prisma migrate deploy`) |

Code is organized in **domain modules** (`src/modules/*`): `auth`, `recipes`, `users`, `categories`, etc., each with api / application / domain / infrastructure layers.

## Requirements

- Node.js 22+ (or current LTS with ESM support)
- PostgreSQL 16+ (17 used in Docker Compose)
- npm
- Cloudinary account (for image uploads; optional for read-only local exploration)

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/dvankevich/fd-back.git
cd fd-back
npm install
```

`postinstall` runs `prisma generate` and builds the project.

### 2. Environment

Create a `.env` file in the project root:

```env
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://foodies:foodies@localhost:5432/foodies
# Optional separate DB for integration/e2e tests
TEST_DATABASE_URL=postgresql://foodies:foodies@localhost:5432/foodies_test

JWT_SECRET=change-me-to-a-long-random-string-at-least-32-chars

# Comma-separated origins, or * for local experiments
ALLOWED_ORIGINS=http://localhost:5173

# Behind reverse proxy (e.g. Dokku): set to 1
TRUST_PROXY_HOPS=0

AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=10

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### 3. Database

Start Postgres (example with Docker Compose):

```bash
docker compose up -d
```

Apply migrations and seed reference data:

```bash
npx prisma migrate deploy
npm run db:seed
```

Seed loads users, categories, areas, ingredients, recipes, and testimonials from CSV under `prisma/data/`.

### 4. Run the API

Development (hot reload):

```bash
npm run dev
```

Production-style:

```bash
npm run build
npm start
```

Server listens on `http://localhost:3000` (or `PORT`).

- API base: `http://localhost:3000/api`
- Swagger UI: `http://localhost:3000/api-docs`
- Scalar: `http://localhost:3000/reference`
- OpenAPI JSON: `http://localhost:3000/api-docs.json`
- Liveness: `GET /healthz`
- Readiness (DB): `GET /readyz`

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server with `tsx watch` |
| `npm run build` | Bundle `index.ts` and `prisma/seed.ts` via tsup |
| `npm start` | Run `node dist/index.js` |
| `npm run db:seed` | Seed database |
| `npm run db:studio` | Prisma Studio |
| `npm run test:unit` | Unit tests |
| `npm run test:integration` | Integration tests (needs `TEST_DATABASE_URL`) |
| `npm run test:e2e` | Playwright e2e |
| `npm test` | Unit + integration |

## API overview

| Area | Examples |
|------|----------|
| Auth | `POST /api/auth/register`, `/login`, `/refresh`, `/logout` |
| Categories | `GET /api/categories` |
| Areas / ingredients / testimonials | `GET /api/areas`, `/ingredients`, `/testimonials` |
| Recipes | `GET /api/recipes`, `/popular`, `/:id`, `POST /api/recipes` (multipart), favorites, own |
| Users | `GET /api/users/me`, `/:id`, `/:id/followers`, `/:id/recipes`, follow/unfollow, avatar |

Pagination for list endpoints typically returns:

```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "limit": 10
}
```

Errors use `{ "error": "..." }`; validation errors may include `details`.

Interactive HTTP examples live in `requests/*.http`.

## Auth notes (clients)

- Send access token: `Authorization: Bearer <accessToken>`
- Refresh: `POST /api/auth/refresh` with refresh token in JSON body and/or cookie (`Path=/api/auth`)
- Refresh tokens are **single-use** (rotation)
- Logout requires a valid access token

## Deployment (Dokku)

- `app.json` runs `npx prisma migrate deploy` on predeploy
- Set `DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGINS`, Cloudinary vars, and `TRUST_PROXY_HOPS=1` behind nginx
- Seed production data deliberately (`dokku run <app> npx prisma db seed`) — not automatic on every deploy

## Project layout

```text
prisma/           schema, migrations, seed, CSV data
src/modules/      feature modules (auth, recipes, users, …)
src/config/       env
src/app.ts        Express app
requests/         HTTP client samples
```
