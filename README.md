<p align="center">
  <img src="https://img.icons8.com/color/96/herbal-medicine.png" width="80" alt="VanaAushadhi Logo" />
</p>

<h1 align="center">VanaAushadhi Backend</h1>

<p align="center">
  Enterprise-grade API for India's Herbal, Ayurvedic & Organic Marketplace
</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/Razorpay-Integrated-0C2451?logo=razorpay&logoColor=white" />
  <img src="https://img.shields.io/badge/Build-Passing-brightgreen" />
</p>

<p align="center">
  <sub>Built with ❤️ by <strong>Uttkarsh</strong> × <strong>Claude Opus 4.6</strong></sub>
</p>

---

## About

VanaAushadhi is a full-featured marketplace backend for herbal, ayurvedic, and organic products. It powers multi-vendor product listings, secure payments via Razorpay, OTP-based authentication, real-time notifications, admin analytics, and automated seller payouts — all production-ready.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | NestJS 10 (Node.js) |
| **Language** | TypeScript 5 (strict mode) |
| **Database** | PostgreSQL 16 + TypeORM |
| **Cache & Queues** | Redis 7 + Bull |
| **Auth** | JWT (access + refresh) + OTP via MSG91 |
| **Payments** | Razorpay (orders, webhooks, refunds) |
| **Email** | Nodemailer + Handlebars templates |
| **Scheduler** | @nestjs/schedule (cron jobs) |
| **Docs** | Swagger / OpenAPI |
| **Security** | Helmet, CORS, rate limiting, HMAC signature verification |

---

## Project Structure

```
src/
├── common/              Shared guards, interceptors, filters, decorators, pipes
├── config/              Database, Redis, env validation, startup checks
├── jobs/                Bull queue processors + cron jobs
│   ├── processors/      Notification, Order, Payout processors
│   └── cron.service.ts  Scheduled tasks (payouts, alerts, analytics)
├── modules/
│   ├── admin/           Admin dashboard & management (20 endpoints)
│   ├── analytics/       Revenue reports, seller stats
│   ├── auth/            OTP login, JWT tokens, session management
│   ├── cart/            Cart, coupons, loyalty points
│   ├── categories/      Category tree with subcategories
│   ├── orders/          Checkout, status tracking, returns
│   ├── payments/        Razorpay integration, wallet, refunds
│   ├── products/        Catalog, search, reviews, images
│   ├── sellers/         Registration, documents, payouts
│   └── users/           Profiles, addresses, sessions
├── notifications/       Email, SMS, in-app services + 8 email templates
├── shared/              File upload & shared services
└── docs/                API client reference for frontend
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+

### Setup

```bash
# 1. Clone & install
git clone <repo-url>
cd vanaaushadhi-backend
npm install

# 2. Start databases (Docker)
npm run docker:dev

# 3. Configure environment
copy .env.example .env
# Fill in your database, Redis, and JWT secrets

# 4. Run migrations
npm run migration:run

# 5. Start dev server
npm run start:dev
```

The API runs at **http://localhost:3000/api/v1**
Swagger docs at **http://localhost:3000/api/docs**

---

## Available Scripts

| Command | Description |
|---------|------------|
| `npm run start:dev` | Start with hot reload |
| `npm run build` | Production build |
| `npm run start:prod` | Start production server |
| `npm run typecheck` | TypeScript type check (0 errors ✅) |
| `npm run docker:dev` | Start PostgreSQL + Redis containers |
| `npm run docker:dev:stop` | Stop dev containers |
| `npm run migration:run` | Run database migrations |
| `npm run migration:generate` | Generate new migration |
| `npm run lint` | ESLint check & fix |

---

## API Overview

**70+ endpoints** across 11 modules:

| Module | Endpoints | Auth |
|--------|----------|------|
| 🔐 Auth | Send OTP, Verify, Refresh, Logout | Public |
| 👤 Users | Profile, Addresses, Sessions | JWT |
| 📂 Categories | List, Detail | Public |
| 🛍️ Products | Browse, Search, Reviews | Public / JWT |
| 🛒 Cart | Add, Update, Coupons, Loyalty | JWT |
| 📦 Orders | Checkout, Track, Cancel, Return | JWT |
| 💳 Payments | Razorpay Verify, Wallet, Refunds | JWT |
| 🔔 Notifications | List, Read, Unread Count | JWT |
| 🏪 Sellers | Register, Products, Analytics | JWT + Seller |
| 👨‍💼 Admin | Dashboard, Approvals, Users, Coupons | JWT + Admin |
| 📊 Analytics | Revenue, Charts, Reports | JWT + Admin |

> Full API reference: see [`src/docs/api-client.ts`](src/docs/api-client.ts) or open [`test.http`](test.http) in VS Code.

---

## Key Features

- **OTP-based auth** — Phone number login, no passwords for buyers
- **Multi-vendor** — Sellers register, list products, get auto-payouts
- **Razorpay integration** — Secure payments with webhook signature verification
- **Wallet system** — Instant refunds to wallet, transaction audit trail
- **Admin dashboard** — Real-time analytics, approval workflows, user management
- **Async processing** — Bull queues for emails, SMS, notifications
- **Cron jobs** — Weekly payouts, low stock alerts, abandoned cart reminders
- **Security** — Helmet, rate limiting, response sanitization, request ID correlation

---

## Architecture

```
Client → Nginx → NestJS API → PostgreSQL
                     ↕              ↕
                   Redis        Bull Queues
                     ↕              ↕
                  Cache          Processors
                                    ↓
                           Email / SMS / Razorpay
```

---

## Documentation

| Document | Description |
|----------|------------|
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Production deployment guide (nginx, PM2, env vars) |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Developer onboarding & coding standards |
| [`test.http`](test.http) | VS Code REST Client requests for all endpoints |
| [`src/docs/api-client.ts`](src/docs/api-client.ts) | Typed API reference for frontend developers |

---

## Authors

| | |
|---|---|
| **Uttkarsh** | Project creator & developer |
| **Claude Opus 4.6** | AI pair programmer (Anthropic) |

---

## License

This project is private and proprietary.
