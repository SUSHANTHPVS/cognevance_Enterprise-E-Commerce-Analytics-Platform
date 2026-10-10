# Northstar Commerce

A TypeScript commerce operations platform with a responsive analytics dashboard and a security-focused Express API. The repository is an npm-workspaces monorepo: `client/` contains the React/Vite admin experience, `server/` contains the Express/Mongoose API, and `docs/` describes the system and API contract.

## Requirements

- Node.js 20.11 or newer and npm 10+
- MongoDB 7+ for persistent data
- Stripe, SMTP, and AWS S3 credentials only for the integrations you enable

## Run locally

1. Install dependencies from the repository root:

   ```powershell
   npm install
   ```

2. Copy `server/.env.example` to `server/.env`. Set `MONGODB_URI` and a long random `JWT_SECRET`. Keep secrets out of source control.
3. Start the dashboard and API:

   ```powershell
   npm run dev
   ```

4. Open `http://localhost:5173`. The API listens on `http://localhost:4000`; verify it at `/api/health`.

The dashboard opens in clearly marked demo mode and is usable without credentials. Select **Connect** and sign in with a staff/admin account to load live analytics, orders, products, and customer data from the protected API. Recent activity, channel allocation, and product rankings remain representative sample widgets. Public registration creates customer accounts only. To create the first administrator, register a user and promote that account in MongoDB:

```javascript
db.users.updateOne({ email: "admin@example.com" }, { $set: { role: "admin" } })
```

Then sign in through `POST /api/auth/login` and send its token as `Authorization: Bearer <token>`. See [API reference](docs/api.md) for routes and examples.

## Build and run

```powershell
npm run build
npm start
```

The build typechecks both applications, produces `client/dist`, and compiles the API to `server/dist`. `npm start` launches the compiled API. The root scripts use Node child-process APIs so paths containing spaces or `&` work on Windows.

## Integrations

- **Payments:** Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Configure Stripe to send checkout completion, expiry, and async payment success/failure events to `POST /api/payments/webhook`.
- **Email:** Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM`.
- **Product images:** Set `AWS_REGION`, `AWS_S3_BUCKET`, and optionally `ASSETS_BASE_URL` (usually a CloudFront distribution); use an IAM role or environment credentials scoped to the bucket. Uploads use five-minute presigned URLs and accept JPEG, PNG, WebP, and AVIF only.
- **CORS:** Set `CLIENT_ORIGIN` to a comma-separated list of trusted frontend origins in production.

Integrations return `503` when their credentials are absent. Never commit real environment values.

## Deployment

No cloud account or deployment credentials are connected in this workspace, so there is no live deployment URL yet. For a production deployment, provision a managed MongoDB replica set, deploy the Node API on a container or Node hosting service, and publish `client/dist` to a static host/CDN. Configure TLS, environment variables, Stripe webhooks, the S3 bucket policy/CDN, and the production CORS origin before exposing the API. Set health checks to `/api/health`; run multiple stateless API instances behind a load balancer and use the managed database and object store for shared state.

For a GitHub repository link, initialize/push this folder to a repository in your GitHub account after reviewing the files and environment settings. This workspace has not been pushed to GitHub.

### Local container stack

Docker Compose starts MongoDB, the API, and an Nginx-served dashboard with `/api` reverse-proxied to the API. Create a root `.env` containing `JWT_SECRET` (and any optional integration values), then run:

```powershell
docker compose up --build
```

Open `http://localhost:8080`. MongoDB data persists in the `mongo-data` volume. For production, replace the bundled MongoDB service with a managed, backed-up database and terminate TLS at a trusted ingress or hosting platform.

## Project structure

```text
client/                 React + TypeScript + Vite admin dashboard
server/src/             Express API, auth middleware, Mongoose models
scripts/                Path-safe root build, dev, and start runners
docs/                   Architecture, database, API, and workflows
```

See [architecture and workflows](docs/architecture.md).
Dependency scan and remediation results are recorded in [dependency security](docs/dependency-security.md).
