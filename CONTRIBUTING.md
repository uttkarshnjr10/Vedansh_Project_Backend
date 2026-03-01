# Contributing to VanaAushadhi Backend

## Tech Stack
NestJS 10 · TypeScript · TypeORM · PostgreSQL 16 · Redis 7 · Bull Queues · Razorpay · JWT · Swagger

---

## Project Structure

```
src/
├── common/              Guards, interceptors, filters, decorators, pipes, utils
│   ├── constants/       Enums (roles, statuses, payment methods)
│   ├── decorators/      @CurrentUser, @Roles, @Public
│   ├── filters/         HttpExceptionFilter, AllExceptionsFilter
│   ├── guards/          JwtAuthGuard, RolesGuard
│   ├── interceptors/    ResponseInterceptor, LoggingInterceptor, SanitizeInterceptor
│   ├── middleware/       RequestIdMiddleware
│   ├── pipes/           ValidationPipe
│   └── utils/           ApiResponse helper
├── config/              Database, Redis, env validation, startup checks
├── jobs/                Bull job processors + cron service
│   ├── processors/      NotificationProcessor, OrderProcessor, PayoutProcessor
│   ├── cron.service.ts  Scheduled jobs (payouts, stats, alerts)
│   └── queue.constants  Queue name constants
├── modules/             Feature modules
│   ├── admin/           Admin dashboard, management (20 endpoints)
│   ├── analytics/       Revenue stats, seller analytics
│   ├── auth/            OTP login, JWT tokens, refresh
│   ├── cart/            Cart items, coupons, loyalty points
│   ├── categories/      Category tree with subcategories
│   ├── orders/          Checkout, status, cancellations, returns
│   ├── payments/        Razorpay integration, wallet, refunds
│   ├── products/        Catalog, search, reviews, images
│   ├── sellers/         Registration, documents, payouts
│   └── users/           Profile, addresses, sessions
├── notifications/       Email/SMS/in-app services + Handlebars templates
├── shared/              Shared services (FileUploadService)
└── docs/                API client reference for frontend
```

---

## Module Anatomy

Every feature module follows the same pattern:

```
module-name/
├── entities/           TypeORM entities (database tables)
│   └── thing.entity.ts
├── dto/                Data Transfer Objects (request validation)
│   ├── create-thing.dto.ts
│   └── update-thing.dto.ts
├── thing.service.ts    Business logic (ALL logic lives here)
├── thing.controller.ts Route handlers (routing only, no logic)
└── thing.module.ts     NestJS module wiring
```

**Rule: Controllers = routing. Services = logic.**

---

## Adding a New API Endpoint

1. **Define DTO** with `class-validator` decorators:
   ```typescript
   export class CreateThingDto {
     @ApiProperty({ description: 'Thing name', example: 'Ashwagandha' })
     @IsString()
     @MinLength(2)
     name: string;
   }
   ```

2. **Add method to service** (business logic here):
   ```typescript
   async createThing(dto: CreateThingDto, userId: string): Promise<ThingEntity> {
     // validation, DB operations, etc.
   }
   ```

3. **Add method to controller** with Swagger:
   ```typescript
   @Post()
   @ApiOperation({ summary: 'Create a thing' })
   async create(@Body() dto: CreateThingDto, @CurrentUser('id') userId: string) {
     return this.thingService.createThing(dto, userId);
   }
   ```

4. **Auth decorators:**
   - `@Public()` → no auth required
   - `@Roles(ROLES.ADMIN)` → admin only
   - `@Roles(ROLES.SELLER)` → seller only
   - No decorator → requires JWT (default)

5. **Verify:**
   ```bash
   npx tsc --noEmit   # must be 0 errors
   npm run build       # must pass
   ```

---

## Coding Standards

### General
- Every `async` function must have a typed return value (no `Promise<any>`)
- No business logic in controllers — controllers only route
- Use `QueryBuilder` for complex queries, `Repository` for simple CRUD
- No raw SQL with user input — always parameterized queries

### Money
- **Always** use `decimal(10,2)` or integer paise — **never** `float` for money
- Razorpay amounts in paise (`amount * 100`)

### Database
- Every foreign key column must have an index
- Write both `up()` and `down()` in migrations — test that `down()` works
- Always set `take` limit on queries (never unbounded)

### Redis
- Always set TTL — never cache without expiry
- Use descriptive key prefixes: `otp:9876543210`, `cache:products:page:1`

### Security
- Sensitive fields (`passwordHash`, `otpHash`, `tokenHash`, `bankAccountNumber`, `panNumber`) are automatically stripped from responses by `SanitizeInterceptor`
- Never log sensitive data
- All user input validated via DTOs with `class-validator`

---

## Environment Setup for New Developers

```bash
# 1. Clone
git clone <repo-url>
cd vanaaushadhi-backend

# 2. Install
npm install

# 3. Setup .env
copy .env.example .env
# Fill in database, Redis, JWT secrets

# 4. Start PostgreSQL + Redis
docker-compose -f docker-compose.dev.yml up -d

# 5. Run migrations
npm run migration:run

# 6. Start dev server (hot reload)
npm run start:dev
```

The API runs at `http://localhost:3000/api/v1`
Swagger docs at `http://localhost:3000/api/docs`

---

## Docker Quick Start (local dev only)

```bash
# Start DB and Redis
npm run docker:dev

# Stop
npm run docker:dev:stop

# View logs
npm run docker:dev:logs
```

See `docker-compose.dev.yml` for configuration.

---

## Testing Endpoints

Install the **REST Client** VS Code extension and open `test.http`.

Example requests:
```http
### Send OTP
POST http://localhost:3000/api/v1/auth/send-otp
Content-Type: application/json

{ "phone": "9876543210" }

### Get Products
GET http://localhost:3000/api/v1/products?page=1&limit=10&sort=popular
Authorization: Bearer {{token}}
```

---

## Useful Commands

```bash
npm run start:dev       # Dev server with hot reload
npm run build           # Production build
npx tsc --noEmit        # Type check only
npm run migration:run   # Run pending migrations
npm run docker:dev      # Start local DB + Redis
```
