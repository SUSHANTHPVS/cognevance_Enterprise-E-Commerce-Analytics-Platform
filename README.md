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

## Deploy to Vercel and Render

The repository includes [`client/vercel.json`](client/vercel.json) for the Vite dashboard and [`render.yaml`](render.yaml) for the API. MongoDB must be hosted separately; MongoDB Atlas is suitable. Deployments require access to the GitHub repository and an Atlas connection URI.

1. Create an Atlas database and database user. Configure network access so the Render service can reach the cluster. Keep the connection URI private.
2. In Render, create a **Blueprint** from this GitHub repository and apply `render.yaml`. Set `MONGODB_URI` to the Atlas URI. Set `CLIENT_ORIGIN` temporarily to `http://localhost:5173`; replace it with the Vercel production origin after the frontend deploys. Render generates `JWT_SECRET` for the API.
3. In Vercel, import the same GitHub repository and set **Root Directory** to `client`. Add the environment variable `VITE_API_BASE_URL` with the Render service URL plus `/api`, for example `https://northstar-commerce-api.onrender.com/api`, then deploy.
4. Copy the Vercel production origin (for example, `https://your-project.vercel.app`) into the Render service's `CLIENT_ORIGIN`. For Vercel preview deployments, add each allowed preview origin as a comma-separated value. Save the Render variable and redeploy.
5. Verify `https://<render-service>.onrender.com/api/health` returns `{"status":"ok","database":"connected"}`. Open the Vercel URL and use **Connect** with a staff/admin account. Public registration creates customers; promote the first admin using the MongoDB command in the local setup section.

Configure optional Render variables for Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`), SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`), and S3 images (`AWS_REGION`, `AWS_S3_BUCKET`, `ASSETS_BASE_URL`). Set Stripe's webhook endpoint to `https://<render-service>.onrender.com/api/payments/webhook`.

The Render free web service may spin down when idle, causing a cold start. Use an always-on plan and managed production database settings for production traffic. Vercel and Render deploy from GitHub when the configured branch receives a push.

The frontend reads `VITE_API_BASE_URL` at build time; the example value is in [`client/.env.example`](client/.env.example). Never commit real credentials.

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
