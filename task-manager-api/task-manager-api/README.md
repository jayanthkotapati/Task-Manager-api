# Task Manager Backend API

A production-style REST API for managing tasks, built with **Node.js, Express and MongoDB**, secured with **JWT authentication and role-based access control**, containerized with **Docker** and deployable to **AWS EC2**.

![CI](https://github.com/<your-username>/task-manager-api/actions/workflows/ci.yml/badge.svg)

## Highlights

- **Performance** - compound indexes (ESR rule), server-side pagination, `.lean()` queries, projection of list fields, and parallel count/find. Includes scripts to measure the improvement on your own data (see [Benchmarking](#benchmarking-and-performance)).
- **Security** - JWT auth, bcrypt password hashing, role-based middleware (`user`, `manager`, `admin`), request validation (Zod), Helmet, CORS, rate limiting, and non-root Docker user.
- **DevOps** - multi-stage Dockerfile, docker-compose (API + MongoDB), GitHub Actions CI and EC2 deploy workflow, health check endpoint, graceful shutdown.

## Tech stack

Node.js 20, Express, MongoDB + Mongoose, JWT, Zod, Docker, GitHub Actions, AWS EC2, Jest + Supertest, Autocannon.

## Project structure

```
src/
  config/        env + MongoDB connection
  models/        User, Task (with compound indexes)
  middleware/    auth (protect/authorize), validation, errors, rate limiting
  controllers/   auth, task, user
  routes/        route definitions
  validators/    Zod schemas
scripts/         seed, explain, benchmark, toggle-indexes
data/            sample users and tasks
tests/           integration tests
deploy/          EC2 setup script, nginx config
.github/         CI + deploy workflows
```

## Getting started

### Option A - Docker (recommended)

```bash
git clone https://github.com/<your-username>/task-manager-api.git
cd task-manager-api
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env
docker compose up -d --build
docker compose exec api node scripts/seed.js     # optional demo data
curl http://localhost:5000/health
```

### Option B - Local

Requires Node 18+ and a running MongoDB.

```bash
npm install
cp .env.example .env      # edit JWT_SECRET
npm run seed              # optional demo data
npm run dev
```

## API reference

Base URL: `http://localhost:5000`. Protected routes need `Authorization: Bearer <token>`.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/health` | public | Health check |
| POST | `/api/auth/register` | public | Register (role is always `user`) |
| POST | `/api/auth/login` | public | Login, returns JWT |
| GET | `/api/auth/me` | any user | Current user |
| GET | `/api/tasks` | any user | List tasks (paginated, filterable) |
| POST | `/api/tasks` | any user | Create task |
| GET | `/api/tasks/stats` | any user | Counts by status |
| GET | `/api/tasks/:id` | owner / manager / admin | Get task |
| PATCH | `/api/tasks/:id` | owner / admin | Update task |
| DELETE | `/api/tasks/:id` | owner / admin | Delete task |
| GET | `/api/users` | admin | List users |
| PATCH | `/api/users/:id/role` | admin | Change role |
| DELETE | `/api/users/:id` | admin | Delete user and their tasks |

**Role rules:** `user` sees only their own tasks. `manager` can read all tasks but only modify their own. `admin` has full access.

### Query parameters for `GET /api/tasks`

`page` (default 1), `limit` (default 20, max 100), `status`, `priority`, `search` (text search), `dueBefore`, `dueAfter`, `sortBy` (`createdAt`|`dueDate`|`title`), `order` (`asc`|`desc`), `owner` (admin/manager only).

Example:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/tasks?status=todo&priority=high&sortBy=dueDate&order=asc&page=1&limit=20"
```

Response:

```json
{
  "success": true,
  "data": [ { "_id": "...", "title": "Fix login flow", "status": "todo", "priority": "high" } ],
  "meta": { "page": 1, "limit": 20, "total": 342, "totalPages": 18, "hasNext": true }
}
```

Import `postman_collection.json` into Postman for ready-made requests.

## Benchmarking and performance

Optimizations applied:

1. **Compound indexes** on `{owner, status, dueDate}`, `{owner, priority, createdAt}`, `{owner, createdAt}`, `{status, dueDate}` plus a text index, designed around the query shapes the API actually runs.
2. **Pagination** with a hard `limit` cap of 100 and a stable `_id` tie-breaker.
3. **`.lean()`** and field projection on list endpoints to avoid Mongoose hydration and large payloads.
4. **Parallel** `find` + `countDocuments`, connection pool of 50, gzip compression.

To measure the gain on your own machine/instance:

```bash
npm run seed:large            # 100k tasks
npm run explain               # query plan: COLLSCAN vs IXSCAN, docs examined, ms

npm start &                   # in another terminal if needed
npm run indexes:drop && npm run benchmark     # baseline (no indexes)
npm run indexes:create && npm run benchmark   # optimized
```

Each benchmark run writes a JSON summary (req/s, avg/p99 latency, errors) to `benchmark-results/`. Compare the two runs to calculate your own improvement percentage. Results vary with data size, instance type and concurrency, so quote the numbers you actually measure.

## Testing

```bash
# needs a MongoDB instance (default mongodb://localhost:27017/taskmanager_test)
npm test
```

CI runs the same tests against a MongoDB service container on every push.

## Deploying to AWS EC2

1. **Launch an instance** - Ubuntu 22.04/24.04, t3.small or larger, with a key pair.
2. **Security group inbound rules:** SSH (22) from *your IP only*, HTTP (80) and HTTPS (443) from anywhere, and API port 5000 only if you are not using nginx. Never open MongoDB's 27017.
3. **Install Docker:** SSH in and run `deploy/ec2-setup.sh`, then log out and back in.
4. **Deploy:**
   ```bash
   git clone https://github.com/<your-username>/task-manager-api.git && cd task-manager-api
   echo "JWT_SECRET=$(openssl rand -hex 32)" > .env
   docker compose up -d --build
   docker compose logs -f api
   ```
5. **(Optional) nginx + HTTPS:** use `deploy/nginx.conf` and certbot for a domain with TLS.
6. **(Optional) automatic deploys:** add repository secrets `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`. `.github/workflows/deploy.yml` then redeploys on every push to `main`.

Verify: `curl http://<EC2_PUBLIC_IP>:5000/health`

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP port | `5000` |
| `MONGO_URI` | MongoDB connection string | required |
| `JWT_SECRET` | JWT signing secret | required |
| `JWT_EXPIRES_IN` | Token lifetime | `1d` |
| `CORS_ORIGIN` | Comma-separated allowed origins or `*` | `*` |
| `RATE_LIMIT_MAX` | Auth attempts per 15 min per IP (API limit is 10x) | `100` |

## Demo accounts (after `npm run seed`)

| Role | Email | Password |
|---|---|---|
| admin | admin@example.com | Admin@12345 |
| manager | manager@example.com | Manager@12345 |
| user | user1@example.com ... user10@example.com | User@12345 |

Change these before deploying anywhere public.

## License

MIT
