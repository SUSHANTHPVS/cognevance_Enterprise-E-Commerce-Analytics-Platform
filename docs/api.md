# API Reference

Base URL: `http://localhost:4000/api`. JSON errors use `{ "error": "..." }`; validation responses may also include Zod details. Protected endpoints accept `Authorization: Bearer <JWT>`.

## Health and authentication

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | Public | Liveness and Mongo connection state |
| POST | `/auth/register` | Public, rate limited | Create a customer account; password minimum 10 characters |
| POST | `/auth/login` | Public, rate limited | Verify credentials and return an eight-hour JWT |

Registration body: `{ "name": "Taylor Doe", "email": "taylor@example.com", "password": "long-password" }`.

## Catalog and operations

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/products?page=1&limit=24&search=lamp` | Public | Search active products, paginated |
| POST | `/products` | Staff/admin | Create a product |
| PATCH | `/products/:id` | Staff/admin | Update one or more product fields |
| DELETE | `/products/:id` | Staff/admin | Archive a product (soft delete) |
| GET | `/orders?page=1&limit=25` | Authenticated | Customers see their own orders; staff/admin see all |
| PATCH | `/orders/:id/status` | Staff/admin | Move an order through permitted fulfillment transitions |
| GET | `/customers?page=1&limit=25` | Staff/admin | List customer profiles |
| GET | `/analytics/summary?days=30` | Staff/admin | 7-, 30-, or 90-day revenue, order, AOV, customer, low-stock and daily metrics |

Product create body: `{ "name": "Desk Lamp", "sku": "NS-WS-03", "category": "Workspace", "price": 189, "inventory": 20, "description": "Adjustable task light" }`.

Order status transitions: `pending -> cancelled`, `paid -> processing`, `processing -> shipped|cancelled`. Invalid transitions return `409`.

## Integrations

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/payments/checkout` | Customer JWT | Validate cart, create pending order and Stripe Checkout Session |
| POST | `/payments/webhook` | Stripe signature | Verify raw Stripe event; mark completed/expired orders |
| POST | `/uploads/presign` | Staff/admin | Create a five-minute S3 upload URL for an allowed image type |
| POST | `/notifications/order` | Staff/admin | Send a templated order-status email through SMTP |

Checkout body: `{ "items": [{ "productId": "<mongo-id>", "quantity": 1 }], "successUrl": "https://shop.example/success", "cancelUrl": "https://shop.example/cart" }`.

Presign body: `{ "fileName": "lamp.webp", "contentType": "image/webp" }`. Upload bytes directly to the returned `uploadUrl` with an HTTP `PUT` and the same `Content-Type`. The response includes a public/CDN `publicUrl` only when `ASSETS_BASE_URL` is configured.

## Response and limits

List endpoints return `{ items, page, limit, total, pages }`. Page size is capped at 100. Auth endpoints allow 30 requests per 15 minutes per client IP. Other production rate limits, pagination policies, and observability should be calibrated for the deployment.
