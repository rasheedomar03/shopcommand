# ShopCommand Backend Design Spec

## Goal

Replace the localStorage-based mock data layer with a real backend. Add the essentials integration tier (Twilio SMS, VIN decode, Stripe payments, QuickBooks sync, OpenSign e-signatures, canned jobs) with SMS usage tracking and plan-based billing.

## Architecture

Node.js API server (Express or Fastify) backed by PostgreSQL. Deployed on Railway or Render alongside the existing Vercel frontend. The React app swaps `DataContext` localStorage calls for `fetch()` calls to the API. Auth via JWT tokens issued on login, stored in httpOnly cookies.

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Fastify (lighter, schema validation built in)
- **Database:** PostgreSQL 16 (hosted on Railway/Supabase)
- **ORM:** Drizzle ORM (type-safe, lightweight, SQL-first)
- **Auth:** JWT (access token 15min + refresh token 7d), bcrypt passwords
- **External APIs:** Twilio, NHTSA, Stripe, QuickBooks, OpenSign

---

## Database Schema

### Core Tables

```
organizations
  id              uuid PK
  name            text NOT NULL
  owner_user_id   uuid FK → users
  is_founding     boolean DEFAULT false
  stripe_customer_id  text
  created_at      timestamptz

users
  id              uuid PK
  org_id          uuid FK → organizations
  email           text UNIQUE NOT NULL
  password_hash   text NOT NULL
  name            text NOT NULL
  role            enum('owner','advisor','tech')
  shop_id         uuid FK → shops (nullable, for advisors/techs)
  tech_id         uuid FK → technicians (nullable, for tech role)
  created_at      timestamptz

shops
  id              uuid PK
  org_id          uuid FK → organizations
  name            text NOT NULL
  address         text
  phone           text
  manager         text
  twilio_phone    text          -- Twilio number assigned to this shop
  hours           jsonb         -- { mon: { open, close, closed }, ... }
  clock_in_buffer_mins  int DEFAULT 15
  max_shift_hours       int DEFAULT 12
  monthly_target  int DEFAULT 0
  status          enum('open','closed')
  created_at      timestamptz

technicians
  id              uuid PK
  org_id          uuid FK → organizations
  shop_id         uuid FK → shops
  user_id         uuid FK → users
  name            text NOT NULL
  specialty       text
  hourly_rate     decimal(10,2) DEFAULT 28.00
  book_bonus_pct  decimal(5,2) DEFAULT 0.30
  status          enum('active','inactive')
  created_at      timestamptz

customers
  id              uuid PK
  org_id          uuid FK → organizations
  shop_id         uuid FK → shops
  name            text NOT NULL
  email           text
  phone           text NOT NULL
  ro_count        int DEFAULT 0
  lifetime_value  decimal(10,2) DEFAULT 0
  created_at      timestamptz
```

### Repair Order Tables

```
repair_orders
  id              text PK       -- "RO-XXXX" format
  org_id          uuid FK → organizations
  shop_id         uuid FK → shops
  customer_id     uuid FK → customers
  tech_id         uuid FK → technicians (nullable)
  vehicle         text NOT NULL
  vin             text          -- decoded via NHTSA
  vehicle_year    int
  vehicle_make    text
  vehicle_model   text
  complaint       text
  stage           enum('Estimate','Approved','Waiting Parts','In Progress','Complete','Invoiced','Paid')
  authorized      boolean DEFAULT false
  signature_url   text          -- OpenSign document URL
  parts_total     decimal(10,2) DEFAULT 0
  labor_total     decimal(10,2) DEFAULT 0
  tax_total       decimal(10,2) DEFAULT 0
  total           decimal(10,2) DEFAULT 0
  payment_method  text
  payment_ref     text          -- Stripe payment intent ID
  notes           jsonb DEFAULT '[]'
  created_at      timestamptz
  updated_at      timestamptz

ro_services
  id              uuid PK
  ro_id           text FK → repair_orders
  name            text NOT NULL
  price           decimal(10,2)
  book_time_min   int           -- from canned job or manual entry
  is_canned       boolean DEFAULT false
  canned_job_id   uuid FK → canned_jobs (nullable)
  sort_order      int

ro_parts_requests
  id              uuid PK
  ro_id           text FK → repair_orders
  name            text NOT NULL
  part_number     text
  qty             int DEFAULT 1
  status          enum('requested','ordered','shipped','arrived','ready')
  supplier        text
  eta             text
  carrier         text
  tracking_number text
  requested_by    text
  requested_at    timestamptz

inspections
  id              uuid PK
  ro_id           text FK → repair_orders
  tech_id         uuid FK → technicians
  status          enum('draft','complete','sent')
  created_at      timestamptz
  completed_at    timestamptz

inspection_items
  id              uuid PK
  inspection_id   uuid FK → inspections
  category        text NOT NULL
  label           text NOT NULL
  condition       enum('green','yellow','red')
  note            text
  photo_url       text
```

### Time Tracking

```
time_entries
  id              uuid PK
  tech_id         uuid FK → technicians
  shop_id         uuid FK → shops
  clock_in_at     timestamptz NOT NULL
  clock_out_at    timestamptz

job_timers
  id              uuid PK
  ro_id           text FK → repair_orders
  service_idx     int NOT NULL
  total_ms        bigint DEFAULT 0
  started_at      timestamptz   -- null = paused
  UNIQUE(ro_id, service_idx)
```

### Canned Jobs

```
canned_jobs
  id              uuid PK
  org_id          uuid FK → organizations
  shop_id         uuid FK → shops (nullable = org-wide)
  name            text NOT NULL      -- e.g. "Oil Change - Conventional"
  category        text               -- e.g. "Maintenance", "Brakes"
  created_at      timestamptz

canned_job_lines
  id              uuid PK
  canned_job_id   uuid FK → canned_jobs
  type            enum('labor','part')
  name            text NOT NULL
  price           decimal(10,2)
  book_time_min   int               -- labor lines only
  part_number     text               -- part lines only
  qty             int DEFAULT 1
  sort_order      int
```

### SMS & Usage Tracking

```
sms_messages
  id              uuid PK
  org_id          uuid FK → organizations
  shop_id         uuid FK → shops
  customer_id     uuid FK → customers
  ro_id           text FK → repair_orders (nullable)
  direction       enum('outbound','inbound')
  from_number     text NOT NULL
  to_number       text NOT NULL
  body            text NOT NULL
  twilio_sid      text              -- Twilio message SID
  status          enum('queued','sent','delivered','failed','received')
  is_automated    boolean DEFAULT false
  created_at      timestamptz

sms_usage
  id              uuid PK
  org_id          uuid FK → organizations
  period_start    date NOT NULL     -- billing cycle start
  period_end      date NOT NULL
  messages_used   int DEFAULT 0     -- outbound only
  message_limit   int NOT NULL      -- from plan tier
  alert_sent_80   boolean DEFAULT false
  alert_sent_100  boolean DEFAULT false
  overage_count   int DEFAULT 0
  UNIQUE(org_id, period_start)
```

### Payments & Billing

```
payments
  id              uuid PK
  org_id          uuid FK → organizations
  shop_id         uuid FK → shops
  ro_id           text FK → repair_orders
  customer_id     uuid FK → customers
  amount          decimal(10,2) NOT NULL
  method          text              -- 'card', 'cash', 'check', 'financing'
  stripe_payment_intent_id  text
  status          enum('pending','completed','failed','refunded')
  last4           text              -- card last 4 digits
  created_at      timestamptz

subscriptions
  id              uuid PK
  org_id          uuid FK → organizations
  stripe_subscription_id  text
  status          enum('active','past_due','canceled')
  is_founding     boolean DEFAULT false  -- locked at $125/mo
  price_cents     int NOT NULL           -- 12500 for founding members
  current_period_start  timestamptz
  current_period_end    timestamptz
  message_limit   int DEFAULT 500
  overage_rate    decimal(5,4) DEFAULT 0.03
```

### QuickBooks Sync

```
qb_connections
  id              uuid PK
  org_id          uuid FK → organizations
  realm_id        text NOT NULL     -- QuickBooks company ID
  access_token    text NOT NULL     -- encrypted
  refresh_token   text NOT NULL     -- encrypted
  token_expires_at timestamptz
  connected_at    timestamptz
  last_sync_at    timestamptz

qb_sync_log
  id              uuid PK
  org_id          uuid FK → organizations
  entity_type     enum('invoice','payment','customer')
  local_id        text NOT NULL
  qb_id           text              -- QuickBooks entity ID
  action          enum('create','update','skip','error')
  error_message   text
  synced_at       timestamptz
```

---

## API Routes

### Auth
```
POST   /api/auth/register        -- create org + owner user
POST   /api/auth/login            -- email/password → JWT
POST   /api/auth/refresh          -- refresh token → new access token
POST   /api/auth/logout           -- clear refresh token
GET    /api/auth/me               -- current user + org + plan info
```

### Shops
```
GET    /api/shops                  -- list shops in org
POST   /api/shops                  -- create shop
PATCH  /api/shops/:id             -- update shop
DELETE /api/shops/:id             -- remove shop
```

### Repair Orders
```
GET    /api/repair-orders          -- list (filterable by shop, stage, tech, date)
POST   /api/repair-orders          -- create RO (triggers Estimate SMS)
PATCH  /api/repair-orders/:id     -- update (stage change triggers SMS)
GET    /api/repair-orders/:id     -- single RO with services, parts, inspection
```

### Services & Canned Jobs
```
POST   /api/repair-orders/:id/services      -- add service line
DELETE /api/repair-orders/:id/services/:sid  -- remove service line

GET    /api/canned-jobs                      -- list org's canned jobs
POST   /api/canned-jobs                      -- create canned job + lines
PATCH  /api/canned-jobs/:id                  -- update
DELETE /api/canned-jobs/:id                  -- remove
POST   /api/repair-orders/:id/apply-canned/:cjId  -- apply canned job to RO
```

### Customers
```
GET    /api/customers              -- list (filterable by shop)
POST   /api/customers              -- create
PATCH  /api/customers/:id         -- update
GET    /api/customers/:id         -- profile with RO history
```

### Technicians & Time
```
GET    /api/technicians            -- list
POST   /api/technicians            -- create
PATCH  /api/technicians/:id       -- update
POST   /api/clock/in              -- clock in (validates shop hours)
POST   /api/clock/out             -- clock out
GET    /api/time-entries           -- list (filterable by tech, date range)
POST   /api/job-timers/:roId/:svcIdx/start   -- start service timer
POST   /api/job-timers/:roId/:svcIdx/stop    -- stop service timer
```

### Parts
```
GET    /api/parts                  -- list (filterable by shop)
POST   /api/parts                  -- create
PATCH  /api/parts/:id             -- update (stock, reorder)
DELETE /api/parts/:id             -- remove
POST   /api/repair-orders/:id/parts-request  -- tech requests a part
```

### Inspections
```
POST   /api/inspections            -- create inspection for RO
PATCH  /api/inspections/:id       -- update items, conditions
POST   /api/inspections/:id/complete  -- mark complete
POST   /api/inspections/:id/send     -- send to customer (SMS link)
```

---

## Integration Details

### 1. Twilio SMS

**Setup:** One Twilio number per shop, stored in `shops.twilio_phone`.

**Outbound triggers:**
- Stage transitions on RO (templates already defined in DataContext)
- Advisor sends manual message from Messages page
- Estimate/invoice link sent to customer
- Appointment reminders (cron job, 24h before)

**Inbound:** Twilio webhook `POST /api/webhooks/twilio/inbound` receives customer replies. Matched to customer by phone number, stored in `sms_messages`, displayed in Messages page via polling or WebSocket.

**Usage tracking flow:**
```
On every outbound SMS:
  1. Insert into sms_messages
  2. Increment sms_usage.messages_used for current period
  3. Check threshold:
     - If messages_used >= message_limit * 0.80 AND NOT alert_sent_80:
       → Set alert_sent_80 = true
       → Create notification: "You've used 80% of your monthly messages"
       → Send email to org owner
     - If messages_used >= message_limit AND NOT alert_sent_100:
       → Set alert_sent_100 = true
       → Create notification: "Message limit reached. Overage rate: $X/msg"
       → Send email to org owner
     - If messages_used > message_limit:
       → Increment overage_count
       → Still send the message (soft limit, not hard block)
```

**Billing cycle reset:** Cron job runs daily, checks if `period_end < today` for any `sms_usage` row, creates next period row with counters at 0.

**Limits:** 500 messages/mo included, $0.03/msg overage. Same for all customers.

### 2. NHTSA VIN Decoder

**Endpoint:** `GET /api/vin/:vin`

**Flow:**
1. Frontend sends VIN (from manual entry or barcode scan)
2. Backend calls `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{vin}?format=json`
3. Parse response for: Year, Make, Model, Engine, Trim, Body Class
4. Return structured object to frontend
5. Frontend auto-fills vehicle fields on new RO form
6. Store decoded fields on `repair_orders` (vin, vehicle_year, vehicle_make, vehicle_model)

**Cache:** Store VIN decode results in a `vin_cache` table (vin → decoded fields). VINs don't change, so cache indefinitely. Saves API calls and speeds up repeat vehicles.

```
vin_cache
  vin             text PK
  year            int
  make            text
  model           text
  engine          text
  trim            text
  body_class      text
  decoded_at      timestamptz
```

### 3. Stripe Payments

**Setup:** Org creates a Stripe Connect account (Standard or Express). Stored as `organizations.stripe_customer_id`.

**Payment flow:**
1. Advisor clicks "Send Payment Link" on an invoice
2. Backend creates a Stripe Payment Intent for the invoice amount
3. Customer receives SMS/email with a payment link
4. Customer pays on Stripe-hosted checkout page
5. Stripe webhook `POST /api/webhooks/stripe` confirms payment
6. Backend updates `payments` table and sets RO stage to 'Paid'
7. If QuickBooks connected, sync the payment

**Terminal (in-person):** Future — Stripe Terminal SDK for card-present payments at the shop counter.

**Subscription billing:** Org's own ShopCommand subscription is a Stripe Subscription. Plan upgrades/downgrades handled via Stripe Customer Portal.

### 4. QuickBooks Online Sync

**OAuth flow:**
1. Owner clicks "Connect QuickBooks" in Settings
2. Redirect to Intuit OAuth2 consent screen
3. Callback stores tokens in `qb_connections` (encrypted at rest)
4. Refresh token auto-refreshes before expiry

**What syncs:**
| ShopCommand event | QuickBooks action |
|---|---|
| RO stage → Invoiced | Create Invoice (line items = services + parts) |
| Payment recorded | Create Payment against the Invoice |
| New customer created | Create/match Customer |

**Sync is one-way:** ShopCommand → QuickBooks. We don't pull data back from QB.

**Error handling:** If sync fails (token expired, QB down), log to `qb_sync_log` with error, retry up to 3 times with exponential backoff. Surface failed syncs in Settings with a "Retry" button.

**Mapping:**
- Labor revenue → QB Income Account "Labor Revenue" (auto-created on first sync)
- Parts revenue → QB Income Account "Parts Revenue"
- Sales tax → QB Tax Rate matching shop's tax rate
- Payments → QB Payment linked to the Invoice

### 5. OpenSign E-Signatures

**Flow:**
1. Advisor clicks "Send for Approval" on an estimate
2. Backend creates an OpenSign signature request with the estimate PDF
3. Customer receives SMS with signing link
4. Customer reviews estimate and signs on their phone
5. OpenSign webhook notifies us of completion
6. Backend sets `repair_orders.authorized = true`, stores `signature_url`
7. RO stage transitions to 'Approved', triggers SMS

**Self-hosted:** OpenSign runs as a Docker container alongside our API. No per-envelope cost.

**Estimate PDF generation:** Use `@react-pdf/renderer` or `puppeteer` to generate a clean PDF from the estimate data (vehicle info, line items, totals, shop branding).

### 6. Canned Jobs

**Pure internal feature — no external integration.**

**How it works:**
1. Owner/advisor creates a canned job in Settings (e.g. "Conventional Oil Change")
2. Adds line items: labor lines (with book time) and part lines (with part number, price)
3. Canned jobs are org-wide or shop-specific
4. When creating/editing an RO, advisor clicks "Add Canned Job"
5. Searchable dropdown shows available canned jobs
6. Selecting one copies all line items onto the RO's services list
7. Advisor can edit prices/quantities after applying

**Starter canned jobs (seeded on org creation):**
- Oil Change — Conventional ($49.99, 30min book)
- Oil Change — Full Synthetic ($89.99, 30min book)
- Tire Rotation ($29.99, 20min book)
- Brake Pad Replacement — Front ($249.99, 60min book)
- Brake Pad Replacement — Rear ($249.99, 60min book)
- AC Recharge ($149.99, 45min book)
- Battery Replacement ($179.99, 25min book)
- Cabin Air Filter ($39.99, 10min book)
- Engine Air Filter ($34.99, 10min book)
- Alignment — 4-Wheel ($99.99, 45min book)

---

## Pricing

**Founding Member Plan — $125/mo per shop** (first 25 customers, locked in)

Everything included, no tiers, no feature gates:
- Unlimited users (owners, advisors, techs)
- 500 SMS/mo included, $0.03/msg overage
- Stripe payments
- QuickBooks sync
- E-signatures
- VIN decode
- Unlimited canned jobs
- Full reports

No plan selection logic in the codebase. One plan, one price. Tiers can be introduced later once we have real usage data from 25+ shops.

---

## Migration Path

The frontend currently uses `DataContext` with localStorage. Migration approach:

1. **Build API first** with all CRUD endpoints matching DataContext's current methods
2. **Create `ApiContext`** that mirrors DataContext's interface but calls the API
3. **Swap providers** — replace `<DataContext>` with `<ApiContext>` in main.jsx
4. **Keep DataContext as fallback** — if API is unreachable, fall back to localStorage (offline mode)
5. **Auth upgrade** — replace localStorage session with JWT-based auth, add real login/register

Each page continues to call `useData()` — the hook signature doesn't change. Only the underlying implementation switches from localStorage to fetch.

---

## Implementation Order

1. **Database + Auth** — Postgres schema, user registration, JWT login
2. **Core CRUD** — Shops, customers, technicians, repair orders, parts
3. **Canned jobs** — Internal feature, no external dependencies
4. **VIN decode** — Free API, quick win, high demo impact
5. **Twilio SMS** — Outbound templates, inbound webhook, usage tracking + 80% alert
6. **Stripe payments** — Payment intents, webhooks, subscription billing
7. **OpenSign e-signatures** — Docker setup, estimate PDF generation, signing flow
8. **QuickBooks sync** — OAuth flow, invoice/payment sync, error handling
