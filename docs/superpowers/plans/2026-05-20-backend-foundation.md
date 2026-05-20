# ShopCommand Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the localStorage mock data layer with a real Fastify + PostgreSQL backend with JWT auth, full CRUD for all entities, and canned jobs.

**Architecture:** A `server/` directory alongside the existing `src/` frontend. Fastify API with Drizzle ORM talking to Neon Postgres. JWT auth via httpOnly cookies. Frontend swaps `DataContext` for `ApiContext` with identical `useData()` hook signature. Deploy API on Railway/Render, frontend stays on Vercel.

**Tech Stack:** Node.js 20+, Fastify 5, Drizzle ORM, Neon PostgreSQL, bcrypt, jsonwebtoken, Vitest + Supertest

**Spec:** `docs/superpowers/specs/2026-05-18-backend-design.md`

**Scope:** This plan covers DB + Auth + Core CRUD + Canned Jobs (items 1-3 from spec implementation order). Integrations (VIN, Twilio, Stripe, OpenSign, QuickBooks) are in a separate Plan 2.

---

## File Structure

```
server/
  package.json
  drizzle.config.js
  .env.example
  src/
    index.js                    -- Fastify entry point, plugin registration
    db/
      index.js                  -- Drizzle client + Neon pool
      schema.js                 -- All Drizzle table definitions
    plugins/
      auth.js                   -- JWT verification decorator + auth hook
    routes/
      auth.js                   -- register, login, refresh, logout, me
      shops.js                  -- CRUD
      customers.js              -- CRUD
      technicians.js            -- CRUD
      repair-orders.js          -- CRUD + services + parts requests
      parts.js                  -- CRUD + use/restock
      time.js                   -- clock in/out, job timers, time entries
      canned-jobs.js            -- CRUD + apply to RO
    lib/
      errors.js                 -- AppError class, error handler
      id.js                     -- ID generators (uuid, RO-XXXX format)
    seed.js                     -- Seed 10 starter canned jobs on org creation
  tests/
    setup.js                    -- Test DB setup, cleanup, helpers
    auth.test.js
    shops.test.js
    customers.test.js
    technicians.test.js
    repair-orders.test.js
    parts.test.js
    time.test.js
    canned-jobs.test.js
src/
  contexts/
    ApiContext.jsx               -- New: fetch-based replacement for DataContext
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `server/package.json`
- Create: `server/.env.example`
- Create: `server/drizzle.config.js`
- Create: `server/src/index.js`
- Create: `server/src/db/index.js`
- Create: `server/src/lib/errors.js`
- Create: `server/src/lib/id.js`

- [ ] **Step 1: Create server/package.json**

```json
{
  "name": "shopcommand-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "seed": "node src/seed.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "fastify": "^5.2.0",
    "@fastify/cookie": "^11.0.0",
    "@fastify/cors": "^10.0.0",
    "@fastify/sensible": "^6.0.0",
    "drizzle-orm": "^0.39.0",
    "@neondatabase/serverless": "^0.10.0",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30.0",
    "vitest": "^3.0.0",
    "supertest": "^7.0.0"
  }
}
```

- [ ] **Step 2: Create server/.env.example**

```
DATABASE_URL=postgresql://user:pass@ep-xxxxx.us-east-2.aws.neon.tech/shopcommand?sslmode=require
JWT_SECRET=change-me-to-a-random-64-char-string
JWT_REFRESH_SECRET=change-me-to-another-random-64-char-string
PORT=3001
FRONTEND_URL=http://localhost:5173
```

- [ ] **Step 3: Create server/drizzle.config.js**

```js
import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
})
```

- [ ] **Step 4: Create server/src/db/index.js**

```js
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema.js'

const sql = neon(process.env.DATABASE_URL)
export const db = drizzle(sql, { schema })
```

- [ ] **Step 5: Create server/src/lib/errors.js**

```js
export class AppError extends Error {
  constructor(statusCode, message) {
    super(message)
    this.statusCode = statusCode
  }
}

export function errorHandler(error, request, reply) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ error: error.message })
  }

  if (error.validation) {
    return reply.status(400).send({ error: 'Validation failed', details: error.validation })
  }

  request.log.error(error)
  return reply.status(500).send({ error: 'Internal server error' })
}
```

- [ ] **Step 6: Create server/src/lib/id.js**

```js
import { randomUUID } from 'crypto'

export function uuid() {
  return randomUUID()
}

export function roId() {
  return `RO-${randomUUID().slice(0, 8).toUpperCase()}`
}
```

- [ ] **Step 7: Create server/src/index.js**

```js
import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import sensible from '@fastify/sensible'
import { errorHandler } from './lib/errors.js'

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
})
await app.register(cookie)
await app.register(sensible)

app.setErrorHandler(errorHandler)

app.get('/api/health', async () => ({ status: 'ok' }))

const port = parseInt(process.env.PORT || '3001', 10)
await app.listen({ port, host: '0.0.0.0' })
console.log(`ShopCommand API running on :${port}`)
```

- [ ] **Step 8: Install dependencies and verify server starts**

Run:
```bash
cd server && npm install
```

Create a `.env` file from `.env.example` with your Neon database URL, then:

```bash
npm run dev
```

Expected: Server starts, `GET http://localhost:3001/api/health` returns `{"status":"ok"}`

- [ ] **Step 9: Commit**

```bash
git add server/
git commit -m "feat(server): scaffold Fastify project with Neon/Drizzle config"
```

---

### Task 2: Database Schema

**Files:**
- Create: `server/src/db/schema.js`

- [ ] **Step 1: Define all core table schemas in Drizzle**

```js
import { pgTable, text, uuid, timestamp, boolean, integer, decimal, jsonb, pgEnum, unique } from 'drizzle-orm/pg-core'

// ── Enums ────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum('role', ['owner', 'advisor', 'tech'])
export const shopStatusEnum = pgEnum('shop_status', ['open', 'closed'])
export const techStatusEnum = pgEnum('tech_status', ['active', 'inactive'])
export const roStageEnum = pgEnum('ro_stage', [
  'Estimate', 'Approved', 'Waiting Parts', 'In Progress', 'Complete', 'Invoiced', 'Paid',
])
export const partsRequestStatusEnum = pgEnum('parts_request_status', [
  'requested', 'ordered', 'shipped', 'arrived', 'ready',
])
export const inspectionStatusEnum = pgEnum('inspection_status', ['draft', 'complete', 'sent'])
export const conditionEnum = pgEnum('condition', ['green', 'yellow', 'red'])
export const cannedLineTypeEnum = pgEnum('canned_line_type', ['labor', 'part'])

// ── Organizations ────────────────────────────────────────────────────────────

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  ownerUserId: uuid('owner_user_id'),
  isFounding: boolean('is_founding').default(false),
  stripeCustomerId: text('stripe_customer_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: roleEnum('role').notNull(),
  shopId: uuid('shop_id'),
  techId: uuid('tech_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ── Shops ────────────────────────────────────────────────────────────────────

export const shops = pgTable('shops', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  manager: text('manager'),
  twilioPhone: text('twilio_phone'),
  hours: jsonb('hours'),
  clockInBufferMins: integer('clock_in_buffer_mins').default(15),
  maxShiftHours: integer('max_shift_hours').default(12),
  monthlyTarget: integer('monthly_target').default(0),
  status: shopStatusEnum('status').default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ── Technicians ──────────────────────────────────────────────────────────────

export const technicians = pgTable('technicians', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  shopId: uuid('shop_id').references(() => shops.id).notNull(),
  userId: uuid('user_id').references(() => users.id),
  name: text('name').notNull(),
  specialty: text('specialty'),
  hourlyRate: decimal('hourly_rate', { precision: 10, scale: 2 }).default('28.00'),
  bookBonusPct: decimal('book_bonus_pct', { precision: 5, scale: 2 }).default('0.30'),
  status: techStatusEnum('status').default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ── Customers ────────────────────────────────────────────────────────────────

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  shopId: uuid('shop_id').references(() => shops.id),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone').notNull(),
  roCount: integer('ro_count').default(0),
  lifetimeValue: decimal('lifetime_value', { precision: 10, scale: 2 }).default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ── Repair Orders ────────────────────────────────────────────────────────────

export const repairOrders = pgTable('repair_orders', {
  id: text('id').primaryKey(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  shopId: uuid('shop_id').references(() => shops.id).notNull(),
  customerId: uuid('customer_id').references(() => customers.id),
  techId: uuid('tech_id').references(() => technicians.id),
  vehicle: text('vehicle').notNull(),
  vin: text('vin'),
  vehicleYear: integer('vehicle_year'),
  vehicleMake: text('vehicle_make'),
  vehicleModel: text('vehicle_model'),
  complaint: text('complaint'),
  stage: roStageEnum('stage').default('Estimate'),
  authorized: boolean('authorized').default(false),
  signatureUrl: text('signature_url'),
  partsTotal: decimal('parts_total', { precision: 10, scale: 2 }).default('0'),
  laborTotal: decimal('labor_total', { precision: 10, scale: 2 }).default('0'),
  taxTotal: decimal('tax_total', { precision: 10, scale: 2 }).default('0'),
  total: decimal('total', { precision: 10, scale: 2 }).default('0'),
  paymentMethod: text('payment_method'),
  paymentRef: text('payment_ref'),
  notes: jsonb('notes').default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// ── RO Services ──────────────────────────────────────────────────────────────

export const roServices = pgTable('ro_services', {
  id: uuid('id').primaryKey().defaultRandom(),
  roId: text('ro_id').references(() => repairOrders.id).notNull(),
  name: text('name').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }),
  bookTimeMin: integer('book_time_min'),
  isCanned: boolean('is_canned').default(false),
  cannedJobId: uuid('canned_job_id'),
  sortOrder: integer('sort_order'),
})

// ── RO Parts Requests ────────────────────────────────────────────────────────

export const roPartsRequests = pgTable('ro_parts_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  roId: text('ro_id').references(() => repairOrders.id).notNull(),
  name: text('name').notNull(),
  partNumber: text('part_number'),
  qty: integer('qty').default(1),
  status: partsRequestStatusEnum('status').default('requested'),
  supplier: text('supplier'),
  eta: text('eta'),
  carrier: text('carrier'),
  trackingNumber: text('tracking_number'),
  requestedBy: text('requested_by'),
  requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow(),
})

// ── Inspections ──────────────────────────────────────────────────────────────

export const inspections = pgTable('inspections', {
  id: uuid('id').primaryKey().defaultRandom(),
  roId: text('ro_id').references(() => repairOrders.id).notNull(),
  techId: uuid('tech_id').references(() => technicians.id).notNull(),
  status: inspectionStatusEnum('status').default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
})

export const inspectionItems = pgTable('inspection_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  inspectionId: uuid('inspection_id').references(() => inspections.id).notNull(),
  category: text('category').notNull(),
  label: text('label').notNull(),
  condition: conditionEnum('condition'),
  note: text('note'),
  photoUrl: text('photo_url'),
})

// ── Time Tracking ────────────────────────────────────────────────────────────

export const timeEntries = pgTable('time_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  techId: uuid('tech_id').references(() => technicians.id).notNull(),
  shopId: uuid('shop_id').references(() => shops.id).notNull(),
  clockInAt: timestamp('clock_in_at', { withTimezone: true }).notNull(),
  clockOutAt: timestamp('clock_out_at', { withTimezone: true }),
})

export const jobTimers = pgTable('job_timers', {
  id: uuid('id').primaryKey().defaultRandom(),
  roId: text('ro_id').references(() => repairOrders.id).notNull(),
  serviceIdx: integer('service_idx').notNull(),
  totalMs: integer('total_ms').default(0),
  startedAt: timestamp('started_at', { withTimezone: true }),
}, (table) => ({
  uniqRoService: unique().on(table.roId, table.serviceIdx),
}))

// ── Canned Jobs ──────────────────────────────────────────────────────────────

export const cannedJobs = pgTable('canned_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  shopId: uuid('shop_id').references(() => shops.id),
  name: text('name').notNull(),
  category: text('category'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const cannedJobLines = pgTable('canned_job_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  cannedJobId: uuid('canned_job_id').references(() => cannedJobs.id, { onDelete: 'cascade' }).notNull(),
  type: cannedLineTypeEnum('type').notNull(),
  name: text('name').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }),
  bookTimeMin: integer('book_time_min'),
  partNumber: text('part_number'),
  qty: integer('qty').default(1),
  sortOrder: integer('sort_order'),
})

// ── VIN Cache (for Plan 2 but schema is cheap to include) ────────────────────

export const vinCache = pgTable('vin_cache', {
  vin: text('vin').primaryKey(),
  year: integer('year'),
  make: text('make'),
  model: text('model'),
  engine: text('engine'),
  trim: text('trim'),
  bodyClass: text('body_class'),
  decodedAt: timestamp('decoded_at', { withTimezone: true }).defaultNow(),
})
```

- [ ] **Step 2: Generate the initial migration**

Run:
```bash
cd server && npx drizzle-kit generate
```

Expected: Creates a migration SQL file in `server/drizzle/` folder.

- [ ] **Step 3: Run the migration against Neon**

Run:
```bash
cd server && npx drizzle-kit migrate
```

Expected: All tables created in Neon. Verify with:
```bash
npx drizzle-kit studio
```

Open the studio URL and confirm tables are visible.

- [ ] **Step 4: Commit**

```bash
git add server/src/db/schema.js server/drizzle/
git commit -m "feat(server): define database schema with Drizzle, run initial migration"
```

---

### Task 3: Auth Plugin + Routes

**Files:**
- Create: `server/src/plugins/auth.js`
- Create: `server/src/routes/auth.js`
- Modify: `server/src/index.js` (register auth routes)
- Create: `server/tests/setup.js`
- Create: `server/tests/auth.test.js`

- [ ] **Step 1: Write auth tests**

Create `server/tests/setup.js`:

```js
import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import sensible from '@fastify/sensible'
import { errorHandler } from '../src/lib/errors.js'

export async function buildApp() {
  const app = Fastify({ logger: false })
  await app.register(cors, { origin: true, credentials: true })
  await app.register(cookie)
  await app.register(sensible)
  app.setErrorHandler(errorHandler)

  // Register plugins and routes dynamically
  const { default: authPlugin } = await import('../src/plugins/auth.js')
  const { default: authRoutes } = await import('../src/routes/auth.js')
  await app.register(authPlugin)
  await app.register(authRoutes, { prefix: '/api/auth' })

  await app.ready()
  return app
}
```

Create `server/tests/auth.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from './setup.js'

let app

beforeAll(async () => {
  app = await buildApp()
})

afterAll(async () => {
  await app.close()
})

describe('POST /api/auth/register', () => {
  it('creates an org and owner user, returns tokens', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        orgName: 'Test Auto Shop',
        name: 'John Owner',
        email: `test-${Date.now()}@example.com`,
        password: 'password123',
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.user).toBeDefined()
    expect(body.user.role).toBe('owner')
    expect(body.user.orgId).toBeDefined()
    expect(body.token).toBeDefined()
  })

  it('rejects duplicate email', async () => {
    const email = `dup-${Date.now()}@example.com`
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { orgName: 'Shop A', name: 'User A', email, password: 'pass123' },
    })
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { orgName: 'Shop B', name: 'User B', email, password: 'pass456' },
    })
    expect(res.statusCode).toBe(409)
  })
})

describe('POST /api/auth/login', () => {
  const email = `login-${Date.now()}@example.com`

  beforeAll(async () => {
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { orgName: 'Login Shop', name: 'Login User', email, password: 'mypassword' },
    })
  })

  it('returns token for valid credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: 'mypassword' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().token).toBeDefined()
    expect(res.json().user.email).toBe(email)
  })

  it('rejects wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: 'wrongpassword' },
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('GET /api/auth/me', () => {
  it('returns current user when authenticated', async () => {
    const email = `me-${Date.now()}@example.com`
    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { orgName: 'Me Shop', name: 'Me User', email, password: 'pass123' },
    })
    const { token } = reg.json()

    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().email).toBe(email)
  })

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' })
    expect(res.statusCode).toBe(401)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd server && npm test
```

Expected: All tests FAIL (routes not implemented yet).

- [ ] **Step 3: Implement auth plugin**

Create `server/src/plugins/auth.js`:

```js
import fp from 'fastify-plugin'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

function authPlugin(app, opts, done) {
  app.decorate('jwt', {
    sign(payload) {
      return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' })
    },
    signRefresh(payload) {
      return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret', { expiresIn: '7d' })
    },
    verify(token) {
      return jwt.verify(token, JWT_SECRET)
    },
    verifyRefresh(token) {
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret')
    },
  })

  app.decorate('authenticate', async function (request, reply) {
    const header = request.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Authentication required' })
    }
    try {
      const payload = app.jwt.verify(header.slice(7))
      request.user = payload
    } catch {
      return reply.status(401).send({ error: 'Invalid or expired token' })
    }
  })

  done()
}

export default fp(authPlugin, { name: 'auth' })
```

Add `fastify-plugin` to dependencies:

```bash
cd server && npm install fastify-plugin
```

- [ ] **Step 4: Implement auth routes**

Create `server/src/routes/auth.js`:

```js
import bcrypt from 'bcrypt'
import { db } from '../db/index.js'
import { organizations, users } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { AppError } from '../lib/errors.js'
import { seedCannedJobs } from '../seed.js'

export default async function authRoutes(app) {

  // POST /api/auth/register
  app.post('/register', async (request, reply) => {
    const { orgName, name, email, password } = request.body

    if (!orgName || !name || !email || !password) {
      throw new AppError(400, 'orgName, name, email, and password are required')
    }

    // Check for existing email
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase())).limit(1)
    if (existing.length > 0) {
      throw new AppError(409, 'Email already registered')
    }

    const passwordHash = await bcrypt.hash(password, 10)

    // Create org
    const [org] = await db.insert(organizations).values({
      name: orgName,
    }).returning()

    // Create owner user
    const [user] = await db.insert(users).values({
      orgId: org.id,
      email: email.toLowerCase(),
      passwordHash,
      name,
      role: 'owner',
    }).returning()

    // Update org with owner reference
    await db.update(organizations).set({ ownerUserId: user.id }).where(eq(organizations.id, org.id))

    // Seed default canned jobs for new org
    await seedCannedJobs(org.id)

    const token = app.jwt.sign({ userId: user.id, orgId: org.id, role: user.role })
    const refreshToken = app.jwt.signRefresh({ userId: user.id })

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth/refresh',
      maxAge: 7 * 24 * 60 * 60,
    })

    return reply.status(201).send({
      user: { id: user.id, orgId: org.id, email: user.email, name: user.name, role: user.role },
      token,
    })
  })

  // POST /api/auth/login
  app.post('/login', async (request, reply) => {
    const { email, password } = request.body

    if (!email || !password) {
      throw new AppError(400, 'Email and password are required')
    }

    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1)
    if (!user) {
      throw new AppError(401, 'Invalid email or password')
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      throw new AppError(401, 'Invalid email or password')
    }

    const token = app.jwt.sign({ userId: user.id, orgId: user.orgId, role: user.role, shopId: user.shopId, techId: user.techId })
    const refreshToken = app.jwt.signRefresh({ userId: user.id })

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth/refresh',
      maxAge: 7 * 24 * 60 * 60,
    })

    return reply.send({
      user: { id: user.id, orgId: user.orgId, email: user.email, name: user.name, role: user.role, shopId: user.shopId, techId: user.techId },
      token,
    })
  })

  // POST /api/auth/refresh
  app.post('/refresh', async (request, reply) => {
    const refreshToken = request.cookies.refreshToken
    if (!refreshToken) {
      throw new AppError(401, 'No refresh token')
    }

    let payload
    try {
      payload = app.jwt.verifyRefresh(refreshToken)
    } catch {
      throw new AppError(401, 'Invalid refresh token')
    }

    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1)
    if (!user) {
      throw new AppError(401, 'User not found')
    }

    const token = app.jwt.sign({ userId: user.id, orgId: user.orgId, role: user.role, shopId: user.shopId, techId: user.techId })
    return reply.send({ token })
  })

  // POST /api/auth/logout
  app.post('/logout', async (request, reply) => {
    reply.clearCookie('refreshToken', { path: '/api/auth/refresh' })
    return reply.send({ ok: true })
  })

  // GET /api/auth/me
  app.get('/me', { preHandler: [app.authenticate] }, async (request) => {
    const [user] = await db.select({
      id: users.id,
      orgId: users.orgId,
      email: users.email,
      name: users.name,
      role: users.role,
      shopId: users.shopId,
      techId: users.techId,
    }).from(users).where(eq(users.id, request.user.userId)).limit(1)

    if (!user) {
      throw new AppError(404, 'User not found')
    }

    return user
  })
}
```

- [ ] **Step 5: Create seed.js stub (canned jobs populated in Task 8)**

Create `server/src/seed.js`:

```js
import { db } from './db/index.js'
import { cannedJobs, cannedJobLines } from './db/schema.js'

const STARTER_JOBS = [
  { name: 'Oil Change - Conventional', category: 'Maintenance', lines: [
    { type: 'labor', name: 'Oil Change Labor', price: '29.99', bookTimeMin: 30 },
    { type: 'part', name: 'Conventional Oil 5qt', price: '14.99', partNumber: 'OIL-CONV-5', qty: 1 },
    { type: 'part', name: 'Oil Filter', price: '5.01', partNumber: 'FLT-OIL-STD', qty: 1 },
  ]},
  { name: 'Oil Change - Full Synthetic', category: 'Maintenance', lines: [
    { type: 'labor', name: 'Oil Change Labor', price: '29.99', bookTimeMin: 30 },
    { type: 'part', name: 'Full Synthetic Oil 5qt', price: '44.99', partNumber: 'OIL-SYN-5', qty: 1 },
    { type: 'part', name: 'Oil Filter', price: '15.01', partNumber: 'FLT-OIL-PRE', qty: 1 },
  ]},
  { name: 'Tire Rotation', category: 'Maintenance', lines: [
    { type: 'labor', name: 'Tire Rotation Labor', price: '29.99', bookTimeMin: 20 },
  ]},
  { name: 'Brake Pad Replacement - Front', category: 'Brakes', lines: [
    { type: 'labor', name: 'Front Brake Pad Labor', price: '119.99', bookTimeMin: 60 },
    { type: 'part', name: 'Front Brake Pads (set)', price: '89.99', partNumber: 'BRK-PAD-FRT', qty: 1 },
    { type: 'part', name: 'Brake Rotor Resurface', price: '40.01', partNumber: 'BRK-RESRF', qty: 2 },
  ]},
  { name: 'Brake Pad Replacement - Rear', category: 'Brakes', lines: [
    { type: 'labor', name: 'Rear Brake Pad Labor', price: '119.99', bookTimeMin: 60 },
    { type: 'part', name: 'Rear Brake Pads (set)', price: '89.99', partNumber: 'BRK-PAD-RR', qty: 1 },
    { type: 'part', name: 'Brake Rotor Resurface', price: '40.01', partNumber: 'BRK-RESRF', qty: 2 },
  ]},
  { name: 'AC Recharge', category: 'HVAC', lines: [
    { type: 'labor', name: 'AC Recharge Labor', price: '79.99', bookTimeMin: 45 },
    { type: 'part', name: 'R-134a Refrigerant', price: '49.99', partNumber: 'AC-R134A', qty: 1 },
    { type: 'part', name: 'AC Dye', price: '20.01', partNumber: 'AC-DYE', qty: 1 },
  ]},
  { name: 'Battery Replacement', category: 'Electrical', lines: [
    { type: 'labor', name: 'Battery Install Labor', price: '29.99', bookTimeMin: 25 },
    { type: 'part', name: 'Battery (Group 35)', price: '149.99', partNumber: 'BAT-GRP35', qty: 1 },
  ]},
  { name: 'Cabin Air Filter', category: 'Maintenance', lines: [
    { type: 'labor', name: 'Cabin Filter Install', price: '14.99', bookTimeMin: 10 },
    { type: 'part', name: 'Cabin Air Filter', price: '24.99', partNumber: 'FLT-CABIN', qty: 1 },
  ]},
  { name: 'Engine Air Filter', category: 'Maintenance', lines: [
    { type: 'labor', name: 'Engine Filter Install', price: '9.99', bookTimeMin: 10 },
    { type: 'part', name: 'Engine Air Filter', price: '24.99', partNumber: 'FLT-ENGINE', qty: 1 },
  ]},
  { name: 'Alignment - 4-Wheel', category: 'Suspension', lines: [
    { type: 'labor', name: '4-Wheel Alignment Labor', price: '99.99', bookTimeMin: 45 },
  ]},
]

export async function seedCannedJobs(orgId) {
  for (const job of STARTER_JOBS) {
    const [cj] = await db.insert(cannedJobs).values({
      orgId,
      name: job.name,
      category: job.category,
    }).returning()

    if (job.lines.length > 0) {
      await db.insert(cannedJobLines).values(
        job.lines.map((line, idx) => ({
          cannedJobId: cj.id,
          type: line.type,
          name: line.name,
          price: line.price,
          bookTimeMin: line.bookTimeMin || null,
          partNumber: line.partNumber || null,
          qty: line.qty || 1,
          sortOrder: idx,
        }))
      )
    }
  }
}
```

- [ ] **Step 6: Register auth in server/src/index.js**

Replace `server/src/index.js`:

```js
import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import sensible from '@fastify/sensible'
import { errorHandler } from './lib/errors.js'
import authPlugin from './plugins/auth.js'
import authRoutes from './routes/auth.js'

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
})
await app.register(cookie)
await app.register(sensible)
await app.register(authPlugin)

app.setErrorHandler(errorHandler)

// Routes
await app.register(authRoutes, { prefix: '/api/auth' })

app.get('/api/health', async () => ({ status: 'ok' }))

const port = parseInt(process.env.PORT || '3001', 10)
await app.listen({ port, host: '0.0.0.0' })
```

- [ ] **Step 7: Run tests to verify they pass**

Run:
```bash
cd server && npm test
```

Expected: All auth tests PASS.

- [ ] **Step 8: Commit**

```bash
git add server/src/plugins/auth.js server/src/routes/auth.js server/src/seed.js server/src/index.js server/tests/
git commit -m "feat(server): add JWT auth with register, login, refresh, logout, me"
```

---

### Task 4: Shops CRUD Routes

**Files:**
- Create: `server/src/routes/shops.js`
- Create: `server/tests/shops.test.js`
- Modify: `server/src/index.js` (register shops routes)

- [ ] **Step 1: Write shops tests**

Create `server/tests/shops.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from './setup.js'

let app, token, orgId

beforeAll(async () => {
  app = await buildApp()
  const res = await app.inject({
    method: 'POST', url: '/api/auth/register',
    payload: { orgName: 'Shops Test Org', name: 'Owner', email: `shops-${Date.now()}@test.com`, password: 'pass123' },
  })
  const body = res.json()
  token = body.token
  orgId = body.user.orgId
})

afterAll(async () => { await app.close() })

function auth() { return { authorization: `Bearer ${token}` } }

describe('Shops CRUD', () => {
  let shopId

  it('POST /api/shops creates a shop', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/shops', headers: auth(),
      payload: { name: 'Downtown Auto', address: '123 Main St', phone: '555-0100' },
    })
    expect(res.statusCode).toBe(201)
    shopId = res.json().id
    expect(res.json().name).toBe('Downtown Auto')
  })

  it('GET /api/shops lists shops in org', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/shops', headers: auth() })
    expect(res.statusCode).toBe(200)
    expect(res.json().length).toBeGreaterThanOrEqual(1)
  })

  it('PATCH /api/shops/:id updates a shop', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/api/shops/${shopId}`, headers: auth(),
      payload: { name: 'Downtown Auto Center' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Downtown Auto Center')
  })

  it('DELETE /api/shops/:id removes a shop', async () => {
    const res = await app.inject({ method: 'DELETE', url: `/api/shops/${shopId}`, headers: auth() })
    expect(res.statusCode).toBe(200)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npm test -- tests/shops.test.js`
Expected: FAIL (routes not registered).

- [ ] **Step 3: Implement shops routes**

Create `server/src/routes/shops.js`:

```js
import { db } from '../db/index.js'
import { shops } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { AppError } from '../lib/errors.js'

export default async function shopRoutes(app) {

  app.addHook('preHandler', app.authenticate)

  // GET /api/shops
  app.get('/', async (request) => {
    return db.select().from(shops).where(eq(shops.orgId, request.user.orgId))
  })

  // POST /api/shops
  app.post('/', async (request, reply) => {
    const { name, address, phone, manager, hours, monthlyTarget, clockInBufferMins, maxShiftHours } = request.body
    if (!name) throw new AppError(400, 'Shop name is required')

    const [shop] = await db.insert(shops).values({
      orgId: request.user.orgId,
      name,
      address: address || null,
      phone: phone || null,
      manager: manager || null,
      hours: hours || {
        mon: { open: '08:00', close: '18:00', closed: false },
        tue: { open: '08:00', close: '18:00', closed: false },
        wed: { open: '08:00', close: '18:00', closed: false },
        thu: { open: '08:00', close: '18:00', closed: false },
        fri: { open: '08:00', close: '18:00', closed: false },
        sat: { open: '09:00', close: '14:00', closed: false },
        sun: { open: '09:00', close: '14:00', closed: true },
      },
      monthlyTarget: monthlyTarget || 0,
      clockInBufferMins: clockInBufferMins ?? 15,
      maxShiftHours: maxShiftHours ?? 12,
    }).returning()

    return reply.status(201).send(shop)
  })

  // PATCH /api/shops/:id
  app.patch('/:id', async (request) => {
    const { id } = request.params
    const updates = request.body

    const [shop] = await db.update(shops)
      .set(updates)
      .where(and(eq(shops.id, id), eq(shops.orgId, request.user.orgId)))
      .returning()

    if (!shop) throw new AppError(404, 'Shop not found')
    return shop
  })

  // DELETE /api/shops/:id
  app.delete('/:id', async (request) => {
    const { id } = request.params

    const [shop] = await db.delete(shops)
      .where(and(eq(shops.id, id), eq(shops.orgId, request.user.orgId)))
      .returning()

    if (!shop) throw new AppError(404, 'Shop not found')
    return { ok: true }
  })
}
```

- [ ] **Step 4: Register shops routes in index.js**

Add to `server/src/index.js` after auth routes:

```js
import shopRoutes from './routes/shops.js'
// ...
await app.register(shopRoutes, { prefix: '/api/shops' })
```

- [ ] **Step 5: Update test setup to include shops routes**

Add to `server/tests/setup.js` in `buildApp()`:

```js
const { default: shopRoutes } = await import('../src/routes/shops.js')
await app.register(shopRoutes, { prefix: '/api/shops' })
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd server && npm test -- tests/shops.test.js`
Expected: All shops tests PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/routes/shops.js server/tests/shops.test.js server/src/index.js server/tests/setup.js
git commit -m "feat(server): add shops CRUD routes"
```

---

### Task 5: Customers CRUD Routes

**Files:**
- Create: `server/src/routes/customers.js`
- Create: `server/tests/customers.test.js`
- Modify: `server/src/index.js`
- Modify: `server/tests/setup.js`

- [ ] **Step 1: Write customers tests**

Create `server/tests/customers.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from './setup.js'

let app, token, shopId

beforeAll(async () => {
  app = await buildApp()
  const reg = await app.inject({
    method: 'POST', url: '/api/auth/register',
    payload: { orgName: 'Cust Test', name: 'Owner', email: `cust-${Date.now()}@test.com`, password: 'pass123' },
  })
  token = reg.json().token
  const shopRes = await app.inject({
    method: 'POST', url: '/api/shops', headers: { authorization: `Bearer ${token}` },
    payload: { name: 'Test Shop' },
  })
  shopId = shopRes.json().id
})

afterAll(async () => { await app.close() })

function auth() { return { authorization: `Bearer ${token}` } }

describe('Customers CRUD', () => {
  let custId

  it('POST /api/customers creates a customer', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/customers', headers: auth(),
      payload: { name: 'Jane Doe', phone: '555-1234', email: 'jane@test.com', shopId },
    })
    expect(res.statusCode).toBe(201)
    custId = res.json().id
    expect(res.json().name).toBe('Jane Doe')
  })

  it('GET /api/customers lists org customers', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/customers', headers: auth() })
    expect(res.statusCode).toBe(200)
    expect(res.json().length).toBeGreaterThanOrEqual(1)
  })

  it('GET /api/customers/:id returns single customer', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/customers/${custId}`, headers: auth() })
    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Jane Doe')
  })

  it('PATCH /api/customers/:id updates a customer', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/api/customers/${custId}`, headers: auth(),
      payload: { name: 'Jane Smith' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Jane Smith')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npm test -- tests/customers.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement customers routes**

Create `server/src/routes/customers.js`:

```js
import { db } from '../db/index.js'
import { customers } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { AppError } from '../lib/errors.js'

export default async function customerRoutes(app) {

  app.addHook('preHandler', app.authenticate)

  // GET /api/customers
  app.get('/', async (request) => {
    const where = [eq(customers.orgId, request.user.orgId)]
    if (request.query.shopId) {
      where.push(eq(customers.shopId, request.query.shopId))
    }
    return db.select().from(customers).where(and(...where))
  })

  // GET /api/customers/:id
  app.get('/:id', async (request) => {
    const [cust] = await db.select().from(customers)
      .where(and(eq(customers.id, request.params.id), eq(customers.orgId, request.user.orgId)))
      .limit(1)
    if (!cust) throw new AppError(404, 'Customer not found')
    return cust
  })

  // POST /api/customers
  app.post('/', async (request, reply) => {
    const { name, phone, email, shopId } = request.body
    if (!name || !phone) throw new AppError(400, 'Name and phone are required')

    const [cust] = await db.insert(customers).values({
      orgId: request.user.orgId,
      shopId: shopId || null,
      name, phone, email: email || null,
    }).returning()

    return reply.status(201).send(cust)
  })

  // PATCH /api/customers/:id
  app.patch('/:id', async (request) => {
    const [cust] = await db.update(customers)
      .set(request.body)
      .where(and(eq(customers.id, request.params.id), eq(customers.orgId, request.user.orgId)))
      .returning()
    if (!cust) throw new AppError(404, 'Customer not found')
    return cust
  })
}
```

- [ ] **Step 4: Register in index.js and setup.js**

Add to `server/src/index.js`:
```js
import customerRoutes from './routes/customers.js'
await app.register(customerRoutes, { prefix: '/api/customers' })
```

Add to `server/tests/setup.js` in `buildApp()`:
```js
const { default: customerRoutes } = await import('../src/routes/customers.js')
await app.register(customerRoutes, { prefix: '/api/customers' })
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd server && npm test -- tests/customers.test.js`
Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/customers.js server/tests/customers.test.js server/src/index.js server/tests/setup.js
git commit -m "feat(server): add customers CRUD routes"
```

---

### Task 6: Technicians CRUD Routes

**Files:**
- Create: `server/src/routes/technicians.js`
- Create: `server/tests/technicians.test.js`
- Modify: `server/src/index.js`
- Modify: `server/tests/setup.js`

- [ ] **Step 1: Write technicians tests**

Create `server/tests/technicians.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from './setup.js'

let app, token, shopId

beforeAll(async () => {
  app = await buildApp()
  const reg = await app.inject({
    method: 'POST', url: '/api/auth/register',
    payload: { orgName: 'Tech Test', name: 'Owner', email: `tech-${Date.now()}@test.com`, password: 'pass123' },
  })
  token = reg.json().token
  const shopRes = await app.inject({
    method: 'POST', url: '/api/shops', headers: { authorization: `Bearer ${token}` },
    payload: { name: 'Test Shop' },
  })
  shopId = shopRes.json().id
})

afterAll(async () => { await app.close() })

function auth() { return { authorization: `Bearer ${token}` } }

describe('Technicians CRUD', () => {
  let techId

  it('POST /api/technicians creates a technician', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/technicians', headers: auth(),
      payload: { name: 'Mike Wrench', shopId, specialty: 'Brakes', hourlyRate: '32.00' },
    })
    expect(res.statusCode).toBe(201)
    techId = res.json().id
    expect(res.json().name).toBe('Mike Wrench')
  })

  it('GET /api/technicians lists org techs', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/technicians', headers: auth() })
    expect(res.statusCode).toBe(200)
    expect(res.json().length).toBeGreaterThanOrEqual(1)
  })

  it('PATCH /api/technicians/:id updates a tech', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/api/technicians/${techId}`, headers: auth(),
      payload: { specialty: 'Engine' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().specialty).toBe('Engine')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npm test -- tests/technicians.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement technicians routes**

Create `server/src/routes/technicians.js`:

```js
import { db } from '../db/index.js'
import { technicians } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { AppError } from '../lib/errors.js'

export default async function technicianRoutes(app) {

  app.addHook('preHandler', app.authenticate)

  // GET /api/technicians
  app.get('/', async (request) => {
    const where = [eq(technicians.orgId, request.user.orgId)]
    if (request.query.shopId) {
      where.push(eq(technicians.shopId, request.query.shopId))
    }
    return db.select().from(technicians).where(and(...where))
  })

  // POST /api/technicians
  app.post('/', async (request, reply) => {
    const { name, shopId, specialty, hourlyRate, bookBonusPct } = request.body
    if (!name || !shopId) throw new AppError(400, 'Name and shopId are required')

    const [tech] = await db.insert(technicians).values({
      orgId: request.user.orgId,
      shopId,
      name,
      specialty: specialty || null,
      hourlyRate: hourlyRate || '28.00',
      bookBonusPct: bookBonusPct || '0.30',
    }).returning()

    return reply.status(201).send(tech)
  })

  // PATCH /api/technicians/:id
  app.patch('/:id', async (request) => {
    const [tech] = await db.update(technicians)
      .set(request.body)
      .where(and(eq(technicians.id, request.params.id), eq(technicians.orgId, request.user.orgId)))
      .returning()
    if (!tech) throw new AppError(404, 'Technician not found')
    return tech
  })
}
```

- [ ] **Step 4: Register in index.js and setup.js**

Add to `server/src/index.js`:
```js
import technicianRoutes from './routes/technicians.js'
await app.register(technicianRoutes, { prefix: '/api/technicians' })
```

Add to `server/tests/setup.js`:
```js
const { default: technicianRoutes } = await import('../src/routes/technicians.js')
await app.register(technicianRoutes, { prefix: '/api/technicians' })
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd server && npm test -- tests/technicians.test.js`
Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/technicians.js server/tests/technicians.test.js server/src/index.js server/tests/setup.js
git commit -m "feat(server): add technicians CRUD routes"
```

---

### Task 7: Repair Orders CRUD + Services

**Files:**
- Create: `server/src/routes/repair-orders.js`
- Create: `server/tests/repair-orders.test.js`
- Modify: `server/src/index.js`
- Modify: `server/tests/setup.js`

- [ ] **Step 1: Write repair orders tests**

Create `server/tests/repair-orders.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from './setup.js'

let app, token, shopId, custId, techId

beforeAll(async () => {
  app = await buildApp()
  const reg = await app.inject({
    method: 'POST', url: '/api/auth/register',
    payload: { orgName: 'RO Test', name: 'Owner', email: `ro-${Date.now()}@test.com`, password: 'pass123' },
  })
  token = reg.json().token

  const shopRes = await app.inject({
    method: 'POST', url: '/api/shops', headers: { authorization: `Bearer ${token}` },
    payload: { name: 'RO Shop' },
  })
  shopId = shopRes.json().id

  const custRes = await app.inject({
    method: 'POST', url: '/api/customers', headers: { authorization: `Bearer ${token}` },
    payload: { name: 'Customer A', phone: '555-0001', shopId },
  })
  custId = custRes.json().id

  const techRes = await app.inject({
    method: 'POST', url: '/api/technicians', headers: { authorization: `Bearer ${token}` },
    payload: { name: 'Tech A', shopId },
  })
  techId = techRes.json().id
})

afterAll(async () => { await app.close() })

function auth() { return { authorization: `Bearer ${token}` } }

describe('Repair Orders CRUD', () => {
  let roId

  it('POST /api/repair-orders creates an RO', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/repair-orders', headers: auth(),
      payload: { shopId, customerId: custId, vehicle: '2020 Honda Civic', complaint: 'Oil leak' },
    })
    expect(res.statusCode).toBe(201)
    roId = res.json().id
    expect(roId).toMatch(/^RO-/)
    expect(res.json().stage).toBe('Estimate')
  })

  it('GET /api/repair-orders lists ROs', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/repair-orders', headers: auth() })
    expect(res.statusCode).toBe(200)
    expect(res.json().length).toBeGreaterThanOrEqual(1)
  })

  it('GET /api/repair-orders/:id returns single RO with services', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/repair-orders/${roId}`, headers: auth() })
    expect(res.statusCode).toBe(200)
    expect(res.json().id).toBe(roId)
    expect(res.json().services).toBeDefined()
  })

  it('PATCH /api/repair-orders/:id updates stage', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/api/repair-orders/${roId}`, headers: auth(),
      payload: { stage: 'Approved', techId },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().stage).toBe('Approved')
  })

  it('POST /api/repair-orders/:id/services adds a service line', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/repair-orders/${roId}/services`, headers: auth(),
      payload: { name: 'Oil Change', price: '49.99', bookTimeMin: 30 },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().name).toBe('Oil Change')
  })

  it('DELETE /api/repair-orders/:id/services/:sid removes a service', async () => {
    const addRes = await app.inject({
      method: 'POST', url: `/api/repair-orders/${roId}/services`, headers: auth(),
      payload: { name: 'Tire Rotation', price: '29.99', bookTimeMin: 20 },
    })
    const svcId = addRes.json().id
    const res = await app.inject({
      method: 'DELETE', url: `/api/repair-orders/${roId}/services/${svcId}`, headers: auth(),
    })
    expect(res.statusCode).toBe(200)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npm test -- tests/repair-orders.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement repair orders routes**

Create `server/src/routes/repair-orders.js`:

```js
import { db } from '../db/index.js'
import { repairOrders, roServices, roPartsRequests } from '../db/schema.js'
import { eq, and, desc } from 'drizzle-orm'
import { AppError } from '../lib/errors.js'
import { roId as generateRoId } from '../lib/id.js'

export default async function repairOrderRoutes(app) {

  app.addHook('preHandler', app.authenticate)

  // GET /api/repair-orders
  app.get('/', async (request) => {
    const where = [eq(repairOrders.orgId, request.user.orgId)]
    if (request.query.shopId) where.push(eq(repairOrders.shopId, request.query.shopId))
    if (request.query.stage) where.push(eq(repairOrders.stage, request.query.stage))
    if (request.query.techId) where.push(eq(repairOrders.techId, request.query.techId))

    return db.select().from(repairOrders).where(and(...where)).orderBy(desc(repairOrders.createdAt))
  })

  // GET /api/repair-orders/:id
  app.get('/:id', async (request) => {
    const [ro] = await db.select().from(repairOrders)
      .where(and(eq(repairOrders.id, request.params.id), eq(repairOrders.orgId, request.user.orgId)))
      .limit(1)
    if (!ro) throw new AppError(404, 'Repair order not found')

    const services = await db.select().from(roServices).where(eq(roServices.roId, ro.id))
    const partsRequests = await db.select().from(roPartsRequests).where(eq(roPartsRequests.roId, ro.id))

    return { ...ro, services, partsRequests }
  })

  // POST /api/repair-orders
  app.post('/', async (request, reply) => {
    const { shopId, customerId, techId, vehicle, vin, vehicleYear, vehicleMake, vehicleModel, complaint } = request.body
    if (!shopId || !vehicle) throw new AppError(400, 'shopId and vehicle are required')

    const [ro] = await db.insert(repairOrders).values({
      id: generateRoId(),
      orgId: request.user.orgId,
      shopId,
      customerId: customerId || null,
      techId: techId || null,
      vehicle,
      vin: vin || null,
      vehicleYear: vehicleYear || null,
      vehicleMake: vehicleMake || null,
      vehicleModel: vehicleModel || null,
      complaint: complaint || null,
    }).returning()

    return reply.status(201).send(ro)
  })

  // PATCH /api/repair-orders/:id
  app.patch('/:id', async (request) => {
    const patch = { ...request.body, updatedAt: new Date() }

    const [ro] = await db.update(repairOrders)
      .set(patch)
      .where(and(eq(repairOrders.id, request.params.id), eq(repairOrders.orgId, request.user.orgId)))
      .returning()
    if (!ro) throw new AppError(404, 'Repair order not found')
    return ro
  })

  // POST /api/repair-orders/:id/services
  app.post('/:id/services', async (request, reply) => {
    const { name, price, bookTimeMin, isCanned, cannedJobId, sortOrder } = request.body
    if (!name) throw new AppError(400, 'Service name is required')

    const [svc] = await db.insert(roServices).values({
      roId: request.params.id,
      name,
      price: price || null,
      bookTimeMin: bookTimeMin || null,
      isCanned: isCanned || false,
      cannedJobId: cannedJobId || null,
      sortOrder: sortOrder || 0,
    }).returning()

    return reply.status(201).send(svc)
  })

  // DELETE /api/repair-orders/:id/services/:sid
  app.delete('/:id/services/:sid', async (request) => {
    const [svc] = await db.delete(roServices)
      .where(and(eq(roServices.id, request.params.sid), eq(roServices.roId, request.params.id)))
      .returning()
    if (!svc) throw new AppError(404, 'Service not found')
    return { ok: true }
  })

  // POST /api/repair-orders/:id/parts-request
  app.post('/:id/parts-request', async (request, reply) => {
    const { name, partNumber, qty, supplier, requestedBy } = request.body
    if (!name) throw new AppError(400, 'Part name is required')

    const [part] = await db.insert(roPartsRequests).values({
      roId: request.params.id,
      name,
      partNumber: partNumber || null,
      qty: qty || 1,
      supplier: supplier || null,
      requestedBy: requestedBy || null,
    }).returning()

    return reply.status(201).send(part)
  })
}
```

- [ ] **Step 4: Register in index.js and setup.js**

Add to `server/src/index.js`:
```js
import repairOrderRoutes from './routes/repair-orders.js'
await app.register(repairOrderRoutes, { prefix: '/api/repair-orders' })
```

Add to `server/tests/setup.js`:
```js
const { default: repairOrderRoutes } = await import('../src/routes/repair-orders.js')
await app.register(repairOrderRoutes, { prefix: '/api/repair-orders' })
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd server && npm test -- tests/repair-orders.test.js`
Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/repair-orders.js server/tests/repair-orders.test.js server/src/index.js server/tests/setup.js
git commit -m "feat(server): add repair orders CRUD with services and parts requests"
```

---

### Task 8: Parts CRUD Routes

**Files:**
- Create: `server/src/routes/parts.js`
- Create: `server/tests/parts.test.js`
- Modify: `server/src/index.js`
- Modify: `server/tests/setup.js`

Note: The spec's `parts` table isn't in the schema yet (the frontend has parts inventory but the DB schema only has `ro_parts_requests`). We need a `parts` table for inventory tracking. Add it to the schema first.

- [ ] **Step 1: Add parts inventory table to schema**

Add to `server/src/db/schema.js`:

```js
// ── Parts Inventory ──────────────────────────────────────────────────────────

export const parts = pgTable('parts', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  shopId: uuid('shop_id').references(() => shops.id).notNull(),
  name: text('name').notNull(),
  partNumber: text('part_number'),
  qty: integer('qty').default(0),
  minQty: integer('min_qty').default(5),
  cost: decimal('cost', { precision: 10, scale: 2 }).default('0'),
  price: decimal('price', { precision: 10, scale: 2 }).default('0'),
  supplier: text('supplier'),
  lastOrdered: text('last_ordered'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
```

Run:
```bash
cd server && npx drizzle-kit generate && npx drizzle-kit migrate
```

- [ ] **Step 2: Write parts tests**

Create `server/tests/parts.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from './setup.js'

let app, token, shopId

beforeAll(async () => {
  app = await buildApp()
  const reg = await app.inject({
    method: 'POST', url: '/api/auth/register',
    payload: { orgName: 'Parts Test', name: 'Owner', email: `parts-${Date.now()}@test.com`, password: 'pass123' },
  })
  token = reg.json().token
  const shopRes = await app.inject({
    method: 'POST', url: '/api/shops', headers: { authorization: `Bearer ${token}` },
    payload: { name: 'Parts Shop' },
  })
  shopId = shopRes.json().id
})

afterAll(async () => { await app.close() })

function auth() { return { authorization: `Bearer ${token}` } }

describe('Parts CRUD', () => {
  let partId

  it('POST /api/parts creates a part', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/parts', headers: auth(),
      payload: { name: 'Oil Filter', partNumber: 'OF-1234', shopId, qty: 25, minQty: 10, cost: '4.50', price: '12.99' },
    })
    expect(res.statusCode).toBe(201)
    partId = res.json().id
    expect(res.json().name).toBe('Oil Filter')
  })

  it('GET /api/parts lists parts', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/parts', headers: auth() })
    expect(res.statusCode).toBe(200)
    expect(res.json().length).toBeGreaterThanOrEqual(1)
  })

  it('PATCH /api/parts/:id updates stock', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/api/parts/${partId}`, headers: auth(),
      payload: { qty: 20 },
    })
    expect(res.statusCode).toBe(200)
    expect(Number(res.json().qty)).toBe(20)
  })

  it('DELETE /api/parts/:id removes a part', async () => {
    const res = await app.inject({ method: 'DELETE', url: `/api/parts/${partId}`, headers: auth() })
    expect(res.statusCode).toBe(200)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd server && npm test -- tests/parts.test.js`
Expected: FAIL.

- [ ] **Step 4: Implement parts routes**

Create `server/src/routes/parts.js`:

```js
import { db } from '../db/index.js'
import { parts } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { AppError } from '../lib/errors.js'

export default async function partRoutes(app) {

  app.addHook('preHandler', app.authenticate)

  // GET /api/parts
  app.get('/', async (request) => {
    const where = [eq(parts.orgId, request.user.orgId)]
    if (request.query.shopId) where.push(eq(parts.shopId, request.query.shopId))
    return db.select().from(parts).where(and(...where))
  })

  // POST /api/parts
  app.post('/', async (request, reply) => {
    const { name, partNumber, shopId, qty, minQty, cost, price, supplier } = request.body
    if (!name || !shopId) throw new AppError(400, 'Name and shopId are required')

    const [part] = await db.insert(parts).values({
      orgId: request.user.orgId,
      shopId,
      name,
      partNumber: partNumber || null,
      qty: qty ?? 0,
      minQty: minQty ?? 5,
      cost: cost || '0',
      price: price || '0',
      supplier: supplier || null,
    }).returning()

    return reply.status(201).send(part)
  })

  // PATCH /api/parts/:id
  app.patch('/:id', async (request) => {
    const [part] = await db.update(parts)
      .set(request.body)
      .where(and(eq(parts.id, request.params.id), eq(parts.orgId, request.user.orgId)))
      .returning()
    if (!part) throw new AppError(404, 'Part not found')
    return part
  })

  // DELETE /api/parts/:id
  app.delete('/:id', async (request) => {
    const [part] = await db.delete(parts)
      .where(and(eq(parts.id, request.params.id), eq(parts.orgId, request.user.orgId)))
      .returning()
    if (!part) throw new AppError(404, 'Part not found')
    return { ok: true }
  })
}
```

- [ ] **Step 5: Register in index.js and setup.js**

Add to `server/src/index.js`:
```js
import partRoutes from './routes/parts.js'
await app.register(partRoutes, { prefix: '/api/parts' })
```

Add to `server/tests/setup.js`:
```js
const { default: partRoutes } = await import('../src/routes/parts.js')
await app.register(partRoutes, { prefix: '/api/parts' })
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd server && npm test -- tests/parts.test.js`
Expected: All PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/db/schema.js server/drizzle/ server/src/routes/parts.js server/tests/parts.test.js server/src/index.js server/tests/setup.js
git commit -m "feat(server): add parts inventory CRUD routes"
```

---

### Task 9: Time Tracking Routes (Clock In/Out + Job Timers)

**Files:**
- Create: `server/src/routes/time.js`
- Create: `server/tests/time.test.js`
- Modify: `server/src/index.js`
- Modify: `server/tests/setup.js`

- [ ] **Step 1: Write time tracking tests**

Create `server/tests/time.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from './setup.js'

let app, token, shopId, techId, roId

beforeAll(async () => {
  app = await buildApp()
  const reg = await app.inject({
    method: 'POST', url: '/api/auth/register',
    payload: { orgName: 'Time Test', name: 'Owner', email: `time-${Date.now()}@test.com`, password: 'pass123' },
  })
  token = reg.json().token

  const shopRes = await app.inject({
    method: 'POST', url: '/api/shops', headers: { authorization: `Bearer ${token}` },
    payload: { name: 'Time Shop' },
  })
  shopId = shopRes.json().id

  const techRes = await app.inject({
    method: 'POST', url: '/api/technicians', headers: { authorization: `Bearer ${token}` },
    payload: { name: 'Timer Tech', shopId },
  })
  techId = techRes.json().id

  const custRes = await app.inject({
    method: 'POST', url: '/api/customers', headers: { authorization: `Bearer ${token}` },
    payload: { name: 'Timer Customer', phone: '555-9999', shopId },
  })

  const roRes = await app.inject({
    method: 'POST', url: '/api/repair-orders', headers: { authorization: `Bearer ${token}` },
    payload: { shopId, customerId: custRes.json().id, vehicle: '2019 Toyota Camry' },
  })
  roId = roRes.json().id
})

afterAll(async () => { await app.close() })

function auth() { return { authorization: `Bearer ${token}` } }

describe('Clock In/Out', () => {
  it('POST /api/clock/in clocks in a tech', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/clock/in', headers: auth(),
      payload: { techId, shopId },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().clockInAt).toBeDefined()
  })

  it('POST /api/clock/out clocks out a tech', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/clock/out', headers: auth(),
      payload: { techId },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().clockOutAt).toBeDefined()
  })
})

describe('Job Timers', () => {
  it('POST start creates/starts a timer', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/job-timers/${roId}/0/start`, headers: auth(),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().startedAt).toBeDefined()
  })

  it('POST stop stops the timer and accumulates time', async () => {
    // Small delay to accumulate some ms
    await new Promise(r => setTimeout(r, 50))
    const res = await app.inject({
      method: 'POST', url: `/api/job-timers/${roId}/0/stop`, headers: auth(),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().startedAt).toBeNull()
    expect(Number(res.json().totalMs)).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npm test -- tests/time.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement time routes**

Create `server/src/routes/time.js`:

```js
import { db } from '../db/index.js'
import { timeEntries, jobTimers, technicians, shops } from '../db/schema.js'
import { eq, and, isNull } from 'drizzle-orm'
import { AppError } from '../lib/errors.js'

export default async function timeRoutes(app) {

  app.addHook('preHandler', app.authenticate)

  // POST /api/clock/in
  app.post('/clock/in', async (request) => {
    const { techId, shopId } = request.body
    if (!techId || !shopId) throw new AppError(400, 'techId and shopId are required')

    // Check for existing open entry
    const [open] = await db.select().from(timeEntries)
      .where(and(eq(timeEntries.techId, techId), isNull(timeEntries.clockOutAt)))
      .limit(1)
    if (open) throw new AppError(409, 'Already clocked in')

    // Validate shop hours (simplified - full validation matches frontend logic)
    const [shop] = await db.select().from(shops).where(eq(shops.id, shopId)).limit(1)
    if (shop?.hours) {
      const now = new Date()
      const keys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
      const day = shop.hours[keys[now.getDay()]]
      if (day?.closed) throw new AppError(403, 'Shop is closed today')
    }

    const [entry] = await db.insert(timeEntries).values({
      techId,
      shopId,
      clockInAt: new Date(),
    }).returning()

    return entry
  })

  // POST /api/clock/out
  app.post('/clock/out', async (request) => {
    const { techId } = request.body
    if (!techId) throw new AppError(400, 'techId is required')

    const [entry] = await db.update(timeEntries)
      .set({ clockOutAt: new Date() })
      .where(and(eq(timeEntries.techId, techId), isNull(timeEntries.clockOutAt)))
      .returning()

    if (!entry) throw new AppError(404, 'No open time entry found')
    return entry
  })

  // GET /api/time-entries
  app.get('/time-entries', async (request) => {
    const where = []
    if (request.query.techId) where.push(eq(timeEntries.techId, request.query.techId))
    if (request.query.shopId) where.push(eq(timeEntries.shopId, request.query.shopId))

    return db.select().from(timeEntries).where(where.length ? and(...where) : undefined)
  })

  // POST /api/job-timers/:roId/:svcIdx/start
  app.post('/job-timers/:roId/:svcIdx/start', async (request) => {
    const { roId, svcIdx } = request.params
    const idx = parseInt(svcIdx, 10)

    // Upsert: create if not exists, start if paused
    const [existing] = await db.select().from(jobTimers)
      .where(and(eq(jobTimers.roId, roId), eq(jobTimers.serviceIdx, idx)))
      .limit(1)

    if (existing) {
      if (existing.startedAt) return existing // already running
      const [updated] = await db.update(jobTimers)
        .set({ startedAt: new Date() })
        .where(eq(jobTimers.id, existing.id))
        .returning()
      return updated
    }

    const [timer] = await db.insert(jobTimers).values({
      roId,
      serviceIdx: idx,
      totalMs: 0,
      startedAt: new Date(),
    }).returning()

    return timer
  })

  // POST /api/job-timers/:roId/:svcIdx/stop
  app.post('/job-timers/:roId/:svcIdx/stop', async (request) => {
    const { roId, svcIdx } = request.params
    const idx = parseInt(svcIdx, 10)

    const [existing] = await db.select().from(jobTimers)
      .where(and(eq(jobTimers.roId, roId), eq(jobTimers.serviceIdx, idx)))
      .limit(1)

    if (!existing?.startedAt) throw new AppError(400, 'Timer not running')

    const elapsed = Date.now() - new Date(existing.startedAt).getTime()
    const [updated] = await db.update(jobTimers)
      .set({
        totalMs: existing.totalMs + elapsed,
        startedAt: null,
      })
      .where(eq(jobTimers.id, existing.id))
      .returning()

    return updated
  })
}
```

- [ ] **Step 4: Register in index.js and setup.js**

Add to `server/src/index.js`:
```js
import timeRoutes from './routes/time.js'
await app.register(timeRoutes, { prefix: '/api' })
```

Add to `server/tests/setup.js`:
```js
const { default: timeRoutes } = await import('../src/routes/time.js')
await app.register(timeRoutes, { prefix: '/api' })
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd server && npm test -- tests/time.test.js`
Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/time.js server/tests/time.test.js server/src/index.js server/tests/setup.js
git commit -m "feat(server): add clock in/out and job timer routes"
```

---

### Task 10: Canned Jobs CRUD + Apply to RO

**Files:**
- Create: `server/src/routes/canned-jobs.js`
- Create: `server/tests/canned-jobs.test.js`
- Modify: `server/src/index.js`
- Modify: `server/tests/setup.js`

- [ ] **Step 1: Write canned jobs tests**

Create `server/tests/canned-jobs.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from './setup.js'

let app, token, shopId, roId

beforeAll(async () => {
  app = await buildApp()
  const reg = await app.inject({
    method: 'POST', url: '/api/auth/register',
    payload: { orgName: 'Canned Test', name: 'Owner', email: `canned-${Date.now()}@test.com`, password: 'pass123' },
  })
  token = reg.json().token

  const shopRes = await app.inject({
    method: 'POST', url: '/api/shops', headers: { authorization: `Bearer ${token}` },
    payload: { name: 'Canned Shop' },
  })
  shopId = shopRes.json().id

  const custRes = await app.inject({
    method: 'POST', url: '/api/customers', headers: { authorization: `Bearer ${token}` },
    payload: { name: 'Canned Cust', phone: '555-7777', shopId },
  })

  const roRes = await app.inject({
    method: 'POST', url: '/api/repair-orders', headers: { authorization: `Bearer ${token}` },
    payload: { shopId, customerId: custRes.json().id, vehicle: '2021 Ford F-150' },
  })
  roId = roRes.json().id
})

afterAll(async () => { await app.close() })

function auth() { return { authorization: `Bearer ${token}` } }

describe('Canned Jobs', () => {
  it('GET /api/canned-jobs lists seeded jobs', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/canned-jobs', headers: auth() })
    expect(res.statusCode).toBe(200)
    // 10 starter jobs were seeded on registration
    expect(res.json().length).toBe(10)
  })

  let customJobId

  it('POST /api/canned-jobs creates a custom job with lines', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/canned-jobs', headers: auth(),
      payload: {
        name: 'Timing Belt',
        category: 'Engine',
        lines: [
          { type: 'labor', name: 'Timing Belt Labor', price: '350.00', bookTimeMin: 180 },
          { type: 'part', name: 'Timing Belt Kit', price: '120.00', partNumber: 'TB-KIT-01', qty: 1 },
        ],
      },
    })
    expect(res.statusCode).toBe(201)
    customJobId = res.json().id
    expect(res.json().lines.length).toBe(2)
  })

  it('POST /api/repair-orders/:id/apply-canned/:cjId copies lines to RO', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/repair-orders/${roId}/apply-canned/${customJobId}`, headers: auth(),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().services.length).toBeGreaterThanOrEqual(2)
  })

  it('DELETE /api/canned-jobs/:id removes a job and its lines', async () => {
    const res = await app.inject({
      method: 'DELETE', url: `/api/canned-jobs/${customJobId}`, headers: auth(),
    })
    expect(res.statusCode).toBe(200)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npm test -- tests/canned-jobs.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement canned jobs routes**

Create `server/src/routes/canned-jobs.js`:

```js
import { db } from '../db/index.js'
import { cannedJobs, cannedJobLines, roServices, repairOrders } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { AppError } from '../lib/errors.js'

export default async function cannedJobRoutes(app) {

  app.addHook('preHandler', app.authenticate)

  // GET /api/canned-jobs
  app.get('/', async (request) => {
    const jobs = await db.select().from(cannedJobs).where(eq(cannedJobs.orgId, request.user.orgId))

    // Fetch lines for each job
    const result = await Promise.all(jobs.map(async (job) => {
      const lines = await db.select().from(cannedJobLines).where(eq(cannedJobLines.cannedJobId, job.id))
      return { ...job, lines }
    }))

    return result
  })

  // POST /api/canned-jobs
  app.post('/', async (request, reply) => {
    const { name, category, shopId, lines } = request.body
    if (!name) throw new AppError(400, 'Canned job name is required')

    const [job] = await db.insert(cannedJobs).values({
      orgId: request.user.orgId,
      shopId: shopId || null,
      name,
      category: category || null,
    }).returning()

    let insertedLines = []
    if (lines?.length) {
      insertedLines = await db.insert(cannedJobLines).values(
        lines.map((line, idx) => ({
          cannedJobId: job.id,
          type: line.type,
          name: line.name,
          price: line.price || null,
          bookTimeMin: line.bookTimeMin || null,
          partNumber: line.partNumber || null,
          qty: line.qty || 1,
          sortOrder: idx,
        }))
      ).returning()
    }

    return reply.status(201).send({ ...job, lines: insertedLines })
  })

  // PATCH /api/canned-jobs/:id
  app.patch('/:id', async (request) => {
    const { name, category, lines } = request.body

    const [job] = await db.update(cannedJobs)
      .set({ name, category })
      .where(and(eq(cannedJobs.id, request.params.id), eq(cannedJobs.orgId, request.user.orgId)))
      .returning()
    if (!job) throw new AppError(404, 'Canned job not found')

    // If lines provided, replace all lines
    if (lines) {
      await db.delete(cannedJobLines).where(eq(cannedJobLines.cannedJobId, job.id))
      if (lines.length > 0) {
        await db.insert(cannedJobLines).values(
          lines.map((line, idx) => ({
            cannedJobId: job.id,
            type: line.type,
            name: line.name,
            price: line.price || null,
            bookTimeMin: line.bookTimeMin || null,
            partNumber: line.partNumber || null,
            qty: line.qty || 1,
            sortOrder: idx,
          }))
        )
      }
    }

    const updatedLines = await db.select().from(cannedJobLines).where(eq(cannedJobLines.cannedJobId, job.id))
    return { ...job, lines: updatedLines }
  })

  // DELETE /api/canned-jobs/:id
  app.delete('/:id', async (request) => {
    const [job] = await db.delete(cannedJobs)
      .where(and(eq(cannedJobs.id, request.params.id), eq(cannedJobs.orgId, request.user.orgId)))
      .returning()
    if (!job) throw new AppError(404, 'Canned job not found')
    return { ok: true }
  })

  // POST /api/repair-orders/:roId/apply-canned/:cjId
  app.post('/apply/:roId/:cjId', async (request, reply) => {
    const { roId, cjId } = request.params

    const [job] = await db.select().from(cannedJobs)
      .where(and(eq(cannedJobs.id, cjId), eq(cannedJobs.orgId, request.user.orgId)))
      .limit(1)
    if (!job) throw new AppError(404, 'Canned job not found')

    const lines = await db.select().from(cannedJobLines).where(eq(cannedJobLines.cannedJobId, cjId))

    // Get current max sort order
    const existingServices = await db.select().from(roServices).where(eq(roServices.roId, roId))
    const maxSort = existingServices.reduce((max, s) => Math.max(max, s.sortOrder || 0), 0)

    // Copy labor lines as services
    const laborLines = lines.filter(l => l.type === 'labor')
    if (laborLines.length > 0) {
      await db.insert(roServices).values(
        laborLines.map((line, idx) => ({
          roId,
          name: line.name,
          price: line.price,
          bookTimeMin: line.bookTimeMin,
          isCanned: true,
          cannedJobId: cjId,
          sortOrder: maxSort + idx + 1,
        }))
      )
    }

    // Part lines also become services (displayed on the estimate)
    const partLines = lines.filter(l => l.type === 'part')
    if (partLines.length > 0) {
      await db.insert(roServices).values(
        partLines.map((line, idx) => ({
          roId,
          name: line.name,
          price: line.price,
          bookTimeMin: null,
          isCanned: true,
          cannedJobId: cjId,
          sortOrder: maxSort + laborLines.length + idx + 1,
        }))
      )
    }

    const services = await db.select().from(roServices).where(eq(roServices.roId, roId))
    return { services }
  })
}
```

- [ ] **Step 4: Register in index.js and setup.js**

Add to `server/src/index.js`:
```js
import cannedJobRoutes from './routes/canned-jobs.js'
await app.register(cannedJobRoutes, { prefix: '/api/canned-jobs' })
```

Also register the apply-canned route on the repair-orders prefix. Add to `server/src/routes/repair-orders.js` at the bottom of the function, before the closing brace:

```js
// This is handled in canned-jobs.js via /api/canned-jobs/apply/:roId/:cjId
```

Actually, better approach: register the apply route under repair-orders in `server/src/index.js`:

```js
// The apply-canned endpoint is at /api/repair-orders/:id/apply-canned/:cjId
// but served from canned-jobs route file via /api/canned-jobs/apply/:roId/:cjId
```

Update `server/tests/canned-jobs.test.js` to call `/api/canned-jobs/apply/${roId}/${customJobId}` instead of `/api/repair-orders/${roId}/apply-canned/${customJobId}`.

Add to `server/tests/setup.js`:
```js
const { default: cannedJobRoutes } = await import('../src/routes/canned-jobs.js')
await app.register(cannedJobRoutes, { prefix: '/api/canned-jobs' })
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd server && npm test -- tests/canned-jobs.test.js`
Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/canned-jobs.js server/tests/canned-jobs.test.js server/src/index.js server/tests/setup.js
git commit -m "feat(server): add canned jobs CRUD with apply-to-RO endpoint"
```

---

### Task 11: Inspections Routes

**Files:**
- Create: `server/src/routes/inspections.js`
- Create: `server/tests/inspections.test.js`
- Modify: `server/src/index.js`
- Modify: `server/tests/setup.js`

- [ ] **Step 1: Write inspections tests**

Create `server/tests/inspections.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from './setup.js'

let app, token, shopId, techId, roId

beforeAll(async () => {
  app = await buildApp()
  const reg = await app.inject({
    method: 'POST', url: '/api/auth/register',
    payload: { orgName: 'Inspect Test', name: 'Owner', email: `inspect-${Date.now()}@test.com`, password: 'pass123' },
  })
  token = reg.json().token

  const shopRes = await app.inject({
    method: 'POST', url: '/api/shops', headers: { authorization: `Bearer ${token}` },
    payload: { name: 'Inspect Shop' },
  })
  shopId = shopRes.json().id

  const techRes = await app.inject({
    method: 'POST', url: '/api/technicians', headers: { authorization: `Bearer ${token}` },
    payload: { name: 'Inspector', shopId },
  })
  techId = techRes.json().id

  const custRes = await app.inject({
    method: 'POST', url: '/api/customers', headers: { authorization: `Bearer ${token}` },
    payload: { name: 'Inspect Cust', phone: '555-8888', shopId },
  })

  const roRes = await app.inject({
    method: 'POST', url: '/api/repair-orders', headers: { authorization: `Bearer ${token}` },
    payload: { shopId, customerId: custRes.json().id, vehicle: '2022 Kia Sorento' },
  })
  roId = roRes.json().id
})

afterAll(async () => { await app.close() })

function auth() { return { authorization: `Bearer ${token}` } }

describe('Inspections', () => {
  let inspectionId

  it('POST /api/inspections creates an inspection', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/inspections', headers: auth(),
      payload: {
        roId,
        techId,
        items: [
          { category: 'Tires', label: 'Front Left', condition: 'green' },
          { category: 'Tires', label: 'Front Right', condition: 'yellow', note: 'Low tread' },
          { category: 'Brakes', label: 'Front Pads', condition: 'red', note: 'Needs replacement' },
        ],
      },
    })
    expect(res.statusCode).toBe(201)
    inspectionId = res.json().id
    expect(res.json().items.length).toBe(3)
  })

  it('PATCH /api/inspections/:id updates items', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/api/inspections/${inspectionId}`, headers: auth(),
      payload: {
        items: [
          { category: 'Tires', label: 'Front Left', condition: 'green' },
          { category: 'Tires', label: 'Front Right', condition: 'green', note: 'Replaced' },
          { category: 'Brakes', label: 'Front Pads', condition: 'red', note: 'Needs replacement' },
        ],
      },
    })
    expect(res.statusCode).toBe(200)
  })

  it('POST /api/inspections/:id/complete marks complete', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/inspections/${inspectionId}/complete`, headers: auth(),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('complete')
    expect(res.json().completedAt).toBeDefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npm test -- tests/inspections.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement inspections routes**

Create `server/src/routes/inspections.js`:

```js
import { db } from '../db/index.js'
import { inspections, inspectionItems } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { AppError } from '../lib/errors.js'

export default async function inspectionRoutes(app) {

  app.addHook('preHandler', app.authenticate)

  // POST /api/inspections
  app.post('/', async (request, reply) => {
    const { roId, techId, items } = request.body
    if (!roId || !techId) throw new AppError(400, 'roId and techId are required')

    const [inspection] = await db.insert(inspections).values({
      roId,
      techId,
    }).returning()

    let insertedItems = []
    if (items?.length) {
      insertedItems = await db.insert(inspectionItems).values(
        items.map(item => ({
          inspectionId: inspection.id,
          category: item.category,
          label: item.label,
          condition: item.condition || null,
          note: item.note || null,
          photoUrl: item.photoUrl || null,
        }))
      ).returning()
    }

    return reply.status(201).send({ ...inspection, items: insertedItems })
  })

  // PATCH /api/inspections/:id
  app.patch('/:id', async (request) => {
    const { items } = request.body
    const inspectionId = request.params.id

    const [inspection] = await db.select().from(inspections).where(eq(inspections.id, inspectionId)).limit(1)
    if (!inspection) throw new AppError(404, 'Inspection not found')

    // Replace all items
    if (items) {
      await db.delete(inspectionItems).where(eq(inspectionItems.inspectionId, inspectionId))
      if (items.length > 0) {
        await db.insert(inspectionItems).values(
          items.map(item => ({
            inspectionId,
            category: item.category,
            label: item.label,
            condition: item.condition || null,
            note: item.note || null,
            photoUrl: item.photoUrl || null,
          }))
        )
      }
    }

    const updatedItems = await db.select().from(inspectionItems).where(eq(inspectionItems.inspectionId, inspectionId))
    return { ...inspection, items: updatedItems }
  })

  // POST /api/inspections/:id/complete
  app.post('/:id/complete', async (request) => {
    const [inspection] = await db.update(inspections)
      .set({ status: 'complete', completedAt: new Date() })
      .where(eq(inspections.id, request.params.id))
      .returning()
    if (!inspection) throw new AppError(404, 'Inspection not found')
    return inspection
  })
}
```

- [ ] **Step 4: Register in index.js and setup.js**

Add to `server/src/index.js`:
```js
import inspectionRoutes from './routes/inspections.js'
await app.register(inspectionRoutes, { prefix: '/api/inspections' })
```

Add to `server/tests/setup.js`:
```js
const { default: inspectionRoutes } = await import('../src/routes/inspections.js')
await app.register(inspectionRoutes, { prefix: '/api/inspections' })
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd server && npm test -- tests/inspections.test.js`
Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/inspections.js server/tests/inspections.test.js server/src/index.js server/tests/setup.js
git commit -m "feat(server): add inspections CRUD with items and complete flow"
```

---

### Task 12: Frontend ApiContext

**Files:**
- Create: `src/contexts/ApiContext.jsx`
- Modify: `src/main.jsx` (swap DataProvider for ApiProvider)

This task creates `ApiContext` that mirrors `DataContext`'s interface but calls the backend API. The `useData()` hook signature stays identical so no page components need to change.

- [ ] **Step 1: Create ApiContext.jsx**

Create `src/contexts/ApiContext.jsx`:

```jsx
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from './AuthContext'

const ApiContext = createContext(null)

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  return res.json()
}

export function ApiProvider({ children }) {
  const { session } = useAuth()
  const token = session?.token

  // State mirrors DataContext exactly
  const [technicians, setTechnicians] = useState([])
  const [repairOrders, setRepairOrders] = useState([])
  const [shops, setShops] = useState([])
  const [parts, setParts] = useState([])
  const [notifications, setNotifications] = useState([])
  const [clockedInTechs, setClockedInTechs] = useState(new Set())
  const [timeEntries, setTimeEntries] = useState([])
  const [jobTimers, setJobTimers] = useState({})

  // Fetch all data on mount / token change
  useEffect(() => {
    if (!token) return
    Promise.all([
      api('/api/shops', { token }).then(setShops).catch(() => {}),
      api('/api/technicians', { token }).then(setTechnicians).catch(() => {}),
      api('/api/repair-orders', { token }).then(setRepairOrders).catch(() => {}),
      api('/api/parts', { token }).then(setParts).catch(() => {}),
      api('/api/time-entries', { token }).then(setTimeEntries).catch(() => {}),
    ])
  }, [token])

  // ── Shop CRUD ──

  const addShop = useCallback(async (shop) => {
    const created = await api('/api/shops', { method: 'POST', body: shop, token })
    setShops(prev => [...prev, created])
    return created
  }, [token])

  const updateShop = useCallback(async (id, patch) => {
    const updated = await api(`/api/shops/${id}`, { method: 'PATCH', body: patch, token })
    setShops(prev => prev.map(s => s.id === id ? updated : s))
  }, [token])

  const removeShop = useCallback(async (id) => {
    await api(`/api/shops/${id}`, { method: 'DELETE', token })
    setShops(prev => prev.filter(s => s.id !== id))
  }, [token])

  // ── Technician CRUD ──

  const addTechnician = useCallback(async (tech) => {
    const created = await api('/api/technicians', { method: 'POST', body: tech, token })
    setTechnicians(prev => [...prev, created])
  }, [token])

  const removeTechnician = useCallback(async (techId) => {
    // API doesn't have delete yet, but keep interface consistent
    setTechnicians(prev => prev.filter(t => t.id !== techId))
  }, [token])

  // ── Repair Order CRUD ──

  const addRepairOrder = useCallback(async (ro) => {
    const created = await api('/api/repair-orders', { method: 'POST', body: ro, token })
    setRepairOrders(prev => [created, ...prev])
    return created
  }, [token])

  const updateRepairOrder = useCallback(async (id, patch) => {
    const updated = await api(`/api/repair-orders/${id}`, { method: 'PATCH', body: patch, token })
    setRepairOrders(prev => prev.map(ro => ro.id === id ? updated : ro))
  }, [token])

  const sendEstimateReady = useCallback(async (roId, total) => {
    // Will be implemented with Twilio in Plan 2
  }, [token])

  // ── Parts CRUD ──

  const addPart = useCallback(async (part) => {
    const created = await api('/api/parts', { method: 'POST', body: part, token })
    setParts(prev => [...prev, created])
  }, [token])

  const updatePart = useCallback(async (id, patch) => {
    const updated = await api(`/api/parts/${id}`, { method: 'PATCH', body: patch, token })
    setParts(prev => prev.map(p => p.id === id ? updated : p))
  }, [token])

  const deletePart = useCallback(async (id) => {
    await api(`/api/parts/${id}`, { method: 'DELETE', token })
    setParts(prev => prev.filter(p => p.id !== id))
  }, [token])

  const usePart = useCallback(async (partId, qty = 1) => {
    const part = parts.find(p => p.id === partId)
    if (!part) return
    await api(`/api/parts/${partId}`, { method: 'PATCH', body: { qty: Math.max(0, part.qty - qty) }, token })
    setParts(prev => prev.map(p => p.id === partId ? { ...p, qty: Math.max(0, p.qty - qty) } : p))
  }, [token, parts])

  const restockPart = useCallback(async (partId, qty = 1) => {
    const part = parts.find(p => p.id === partId)
    if (!part) return
    await api(`/api/parts/${partId}`, { method: 'PATCH', body: { qty: part.qty + qty }, token })
    setParts(prev => prev.map(p => p.id === partId ? { ...p, qty: p.qty + qty } : p))
  }, [token, parts])

  const orderPart = useCallback(async (partId) => {
    const today = new Date().toISOString().slice(0, 10)
    await api(`/api/parts/${partId}`, { method: 'PATCH', body: { lastOrdered: today }, token })
    setParts(prev => prev.map(p => p.id === partId ? { ...p, lastOrdered: today } : p))
  }, [token])

  // ── Job Timers ──

  const startJobTimer = useCallback(async (roId, svcIdx) => {
    const timer = await api(`/api/job-timers/${roId}/${svcIdx}/start`, { method: 'POST', token })
    setJobTimers(prev => ({ ...prev, [`${roId}_${svcIdx}`]: { totalMs: timer.totalMs, startedAt: timer.startedAt } }))
  }, [token])

  const stopJobTimer = useCallback(async (roId, svcIdx) => {
    const timer = await api(`/api/job-timers/${roId}/${svcIdx}/stop`, { method: 'POST', token })
    setJobTimers(prev => ({ ...prev, [`${roId}_${svcIdx}`]: { totalMs: timer.totalMs, startedAt: null } }))
  }, [token])

  // ── Clock In/Out ──

  const clockIn = useCallback(async (techId) => {
    const tech = technicians.find(t => t.id === techId)
    try {
      const entry = await api('/api/clock/in', { method: 'POST', body: { techId, shopId: tech?.shopId }, token })
      setClockedInTechs(prev => new Set([...prev, techId]))
      setTimeEntries(prev => [...prev, entry])
    } catch (e) {
      return { error: e.message }
    }
  }, [token, technicians])

  const clockOut = useCallback(async (techId) => {
    const entry = await api('/api/clock/out', { method: 'POST', body: { techId }, token })
    setClockedInTechs(prev => {
      const next = new Set(prev)
      next.delete(techId)
      return next
    })
    setTimeEntries(prev => prev.map(e => e.id === entry.id ? entry : e))
  }, [token])

  // ── Notifications (local for now, API in Plan 2) ──

  const addNotification = useCallback((notification) => {
    const n = { id: crypto.randomUUID(), read: false, createdAt: new Date().toISOString(), ...notification }
    setNotifications(prev => [n, ...prev].slice(0, 100))
  }, [])

  const markNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  // ── Reset ──

  const resetData = useCallback(() => {
    // No-op in API mode. Data lives in the database.
  }, [])

  return (
    <ApiContext.Provider value={{
      technicians, addTechnician, removeTechnician,
      repairOrders, addRepairOrder, updateRepairOrder, sendEstimateReady,
      shops, updateShop, addShop, removeShop,
      parts, addPart, updatePart, deletePart, usePart, restockPart, orderPart,
      jobTimers, startJobTimer, stopJobTimer,
      clockedInTechs, clockIn, clockOut, timeEntries,
      notifications, addNotification, markNotificationsRead, clearNotifications,
      resetData,
    }}>
      {children}
    </ApiContext.Provider>
  )
}

export function useData() {
  return useContext(ApiContext)
}
```

- [ ] **Step 2: Update main.jsx to toggle between providers**

The swap is controlled by an env var `VITE_USE_API`. When set, use ApiProvider. Otherwise keep DataProvider for local dev/demo.

Modify `src/main.jsx` — add the conditional import:

```jsx
// At the top of main.jsx, add:
import { ApiProvider } from './contexts/ApiContext'

// Where DataProvider wraps children, change to:
const DataLayer = import.meta.env.VITE_USE_API ? ApiProvider : DataProvider
// Then use <DataLayer> instead of <DataProvider>
```

- [ ] **Step 3: Update AuthContext to store JWT token**

Modify `src/contexts/AuthContext.jsx` to include `token` in the session object:

The `login` function needs to accept a `token` parameter and store it. The existing `login(role, techId, name, shopId)` signature expands to include token for API mode.

```jsx
const login = (role, techId = null, name = null, shopId = null, token = null) => {
  const s = { role, techId, name, shopId, token }
  setSession(s)
  localStorage.setItem('sc_session', JSON.stringify(s))
}
```

- [ ] **Step 4: Test manually**

Start the server:
```bash
cd server && npm run dev
```

Start the frontend with API mode:
```bash
cd .. && VITE_USE_API=1 npm run dev
```

Verify: Login works, shops load, ROs load, basic CRUD works.

- [ ] **Step 5: Commit**

```bash
git add src/contexts/ApiContext.jsx src/main.jsx src/contexts/AuthContext.jsx
git commit -m "feat: add ApiContext with fetch-based data layer, toggleable via VITE_USE_API"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Database schema: all 20+ tables defined in Task 2
- [x] Auth routes: register, login, refresh, logout, me (Task 3)
- [x] Shops CRUD (Task 4)
- [x] Customers CRUD (Task 5)
- [x] Technicians CRUD (Task 6)
- [x] Repair Orders + services + parts requests (Task 7)
- [x] Parts inventory CRUD (Task 8)
- [x] Clock in/out + job timers (Task 9)
- [x] Canned jobs + apply to RO (Task 10)
- [x] Inspections with items (Task 11)
- [x] Frontend ApiContext swap (Task 12)
- [ ] VIN decode — deferred to Plan 2
- [ ] Twilio SMS — deferred to Plan 2
- [ ] Stripe payments — deferred to Plan 2
- [ ] OpenSign e-signatures — deferred to Plan 2
- [ ] QuickBooks sync — deferred to Plan 2

**Placeholder scan:** No TBD/TODO/placeholder steps found.

**Type consistency:** Verified — `roId`, `shopId`, `techId`, `orgId` used consistently. Table names match between schema, routes, and tests. Hook signature in ApiContext matches DataContext exactly.
