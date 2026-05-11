# RO Lifecycle & Payment Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Paid" terminal stage to the RO lifecycle and redesign RODetailModal with a two-column layout, full payment panel (text-to-pay + mark as paid), and paid confirmation state.

**Architecture:** Three-file change — utils.js adds the Paid stage constant, mock.js enriches RO objects with service prices/payment/nextServiceDue fields, and RODetailModal.jsx is fully rewritten to a two-column layout with a context-sensitive right panel that evolves from financials → invoice generation → payment panel → paid confirmation.

**Tech Stack:** React 18 (hooks only — no new deps), Tailwind CSS 3 (existing tokens), Lucide React (existing icons), Vite dev server on port 5174

---

## File Map

| File | Change |
|------|--------|
| `src/lib/utils.js` | Add `'Paid'` to `RO_STAGES`; add green entry to `STAGE_COLORS` |
| `src/data/mock.js` | Services → `{name, price}[]`; add `customerPhone`, `payment`, `nextServiceDue`; add paid RO-8850; update `stageBreakdown` |
| `src/components/modals/NewROModal.jsx` | Accept `preCustomerName` and `preCustomerPhone` props |
| `src/components/modals/RODetailModal.jsx` | Full rewrite — stage bar, two-column layout, all panel states |

---

## Task 1: Add 'Paid' to the stage constants

**Files:**
- Modify: `src/lib/utils.js`

- [ ] **Step 1: Add 'Paid' to RO_STAGES and STAGE_COLORS**

Open `src/lib/utils.js`. Replace the `RO_STAGES` and `STAGE_COLORS` blocks with:

```js
export const RO_STAGES = [
  'Estimate',
  'Approved',
  'In Progress',
  'Waiting Parts',
  'Complete',
  'Invoiced',
  'Paid',
]

export const STAGE_COLORS = {
  'Estimate':      { bg: 'bg-status-blue-subtle',   text: 'text-status-blue',   dot: 'bg-status-blue' },
  'Approved':      { bg: 'bg-status-purple-subtle', text: 'text-status-purple', dot: 'bg-status-purple' },
  'In Progress':   { bg: 'bg-status-orange-subtle', text: 'text-status-orange', dot: 'bg-status-orange' },
  'Waiting Parts': { bg: 'bg-status-yellow-subtle', text: 'text-status-yellow', dot: 'bg-status-yellow' },
  'Complete':      { bg: 'bg-status-green-subtle',  text: 'text-status-green',  dot: 'bg-status-green' },
  'Invoiced':      { bg: 'bg-border',               text: 'text-text-secondary', dot: 'bg-text-muted' },
  'Paid':          { bg: 'bg-status-green-subtle',  text: 'text-status-green',  dot: 'bg-status-green' },
}
```

- [ ] **Step 2: Verify**

Run `npm run dev` (if not already running). Open the Repair Orders page in the browser. The stage filter tabs at the top should now include "Paid (0)" as the last tab. No errors in the console.

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils.js
git commit -m "feat: add Paid stage to RO_STAGES and STAGE_COLORS"
```

---

## Task 2: Enrich mock RO data

**Files:**
- Modify: `src/data/mock.js`

The mock data needs three enrichments:
1. `services` field changes from `string[]` to `{ name: string, price: number }[]` (only used in RODetailModal)
2. `customerPhone` added to each RO (used in text-to-pay subtitle)
3. `payment` field: `null` for open ROs, `{ method, paidAt }` for the new paid RO
4. `nextServiceDue` field on the paid RO
5. New paid RO (RO-8850)
6. `stageBreakdown` gets a Paid entry

- [ ] **Step 1: Replace the entire `repairOrders` array**

In `src/data/mock.js`, replace the `repairOrders` export with the following. Every service object has `{ name, price }`. Prices within each RO sum to `total` (where total > 0):

```js
export const repairOrders = [
  {
    id: 'RO-8841', shopId: 1, customerId: 1,
    customerName: 'Gerald Hutchins', customerPhone: '+1 (713) 881-4472',
    vehicle: '2019 Ford F-150',
    techId: 1, techName: 'Andre Jackson',
    stage: 'In Progress',
    created: '2024-11-07T08:30:00', updated: '2024-11-07T14:15:00',
    complaint: 'Engine misfiring on cold starts, rough idle at low RPM',
    services: [
      { name: 'Spark plug replacement (8)', price: 262 },
      { name: 'Coil pack replacement',      price: 300 },
      { name: 'Engine tune-up',             price: 160 },
    ],
    parts: 342, labor: 380, total: 722,
    payment: null,
    authorized: true,
    notes: ['Customer called at 9am, confirmed diagnosis', 'Parts ordered from NAPA - arriving 2pm'],
  },
  {
    id: 'RO-8842', shopId: 1, customerId: 5,
    customerName: 'Louis Bergman', customerPhone: '+1 (281) 663-0921',
    vehicle: '2021 Toyota Camry',
    techId: 2, techName: 'Rosa Villanueva',
    stage: 'Waiting Parts',
    created: '2024-11-07T09:15:00', updated: '2024-11-07T13:40:00',
    complaint: 'Check engine light on, trans shifting hard',
    services: [
      { name: 'Transmission fluid flush', price: 125 },
      { name: 'Valve body cleaning',      price: 210 },
      { name: 'Solenoid inspection',      price: 140 },
    ],
    parts: 185, labor: 290, total: 475,
    payment: null,
    authorized: true,
    notes: ['Solenoid pack backordered - ETA tomorrow morning'],
  },
  {
    id: 'RO-8843', shopId: 3, customerId: 2,
    customerName: 'Sandra Montoya', customerPhone: '+1 (281) 772-6931',
    vehicle: '2018 Honda Accord',
    techId: 6, techName: 'Marcus Green',
    stage: 'Estimate',
    created: '2024-11-07T10:00:00', updated: '2024-11-07T10:00:00',
    complaint: 'AC not cooling, grinding noise from front right wheel',
    services: [
      { name: 'AC recharge & leak check',              price: 420 },
      { name: 'Front right wheel bearing replacement', price: 580 },
      { name: 'Brake inspection',                      price: 140 },
    ],
    parts: 0, labor: 0, total: 0,
    payment: null,
    authorized: false,
    notes: ['Awaiting customer approval on estimate of $1,140'],
  },
  {
    id: 'RO-8844', shopId: 5, customerId: 3,
    customerName: 'Brent Okwu', customerPhone: '+1 (832) 441-9283',
    vehicle: '2022 BMW 530i',
    techId: 9, techName: 'Chris Nakamura',
    stage: 'Complete',
    created: '2024-11-06T13:00:00', updated: '2024-11-07T11:30:00',
    complaint: 'Oil service, tire rotation, and 60k mile inspection',
    services: [
      { name: 'Oil & filter change (synthetic)', price: 85 },
      { name: 'Tire rotation & balance',         price: 60 },
      { name: '60k inspection',                  price: 120 },
      { name: 'Cabin air filter',                price: 42 },
    ],
    parts: 112, labor: 195, total: 307,
    payment: null,
    authorized: true,
    notes: ['Customer picking up at 3pm', 'Upsell opportunity: rear brakes at 20% - advised customer'],
  },
  {
    id: 'RO-8845', shopId: 5, customerId: 7,
    customerName: 'Derek Williamson', customerPhone: '+1 (832) 798-5503',
    vehicle: '2020 Ram 2500',
    techId: 10, techName: 'Faith Cooper',
    stage: 'Approved',
    created: '2024-11-07T07:45:00', updated: '2024-11-07T09:00:00',
    complaint: 'Diesel injector cleaning, DEF sensor fault code, brake job',
    services: [
      { name: 'Diesel fuel system service',    price: 380 },
      { name: 'DEF sensor replacement',        price: 480 },
      { name: 'Rear brake pads & rotors',      price: 200 },
    ],
    parts: 640, labor: 420, total: 1060,
    payment: null,
    authorized: true,
    notes: ['Authorized full estimate $1,060', 'Parts in stock, tech starting after lunch'],
  },
  {
    id: 'RO-8846', shopId: 2, customerId: 4,
    customerName: 'Tanya Reeves', customerPhone: '+1 (713) 556-3847',
    vehicle: '2016 Chevrolet Cruze',
    techId: 4, techName: 'Lamar Osei',
    stage: 'In Progress',
    created: '2024-11-07T11:30:00', updated: '2024-11-07T12:45:00',
    complaint: 'Coolant leak, overheating warning light',
    services: [
      { name: 'Water pump replacement',  price: 280 },
      { name: 'Thermostat replacement',  price: 110 },
      { name: 'Coolant flush & refill',  price: 100 },
    ],
    parts: 180, labor: 310, total: 490,
    payment: null,
    authorized: true,
    notes: ['Radiator cap also replaced at no charge'],
  },
  {
    id: 'RO-8847', shopId: 4, customerId: 6,
    customerName: 'Alicia Watkins', customerPhone: '+1 (713) 324-8817',
    vehicle: '2017 Nissan Altima',
    techId: 8, techName: 'Tyrone Banks',
    stage: 'Invoiced',
    created: '2024-11-06T08:00:00', updated: '2024-11-07T08:30:00',
    complaint: 'Annual inspection, oil change, wiper blades',
    services: [
      { name: 'State inspection',       price: 55 },
      { name: 'Oil & filter change',    price: 60 },
      { name: 'Wiper blade replacement', price: 18 },
    ],
    parts: 48, labor: 85, total: 133,
    payment: null,
    authorized: true,
    notes: ['Ready for payment'],
  },
  {
    id: 'RO-8848', shopId: 1, customerId: 5,
    customerName: 'Louis Bergman', customerPhone: '+1 (281) 663-0921',
    vehicle: '2019 Jeep Wrangler',
    techId: 3, techName: 'Damon Pierce',
    stage: 'Estimate',
    created: '2024-11-07T13:00:00', updated: '2024-11-07T13:00:00',
    complaint: 'Front suspension clunk, steering wander at highway speed',
    services: [
      { name: 'Front end inspection',        price: 80 },
      { name: 'Tie rod end replacement (2)', price: 560 },
      { name: 'Alignment',                   price: 120 },
    ],
    parts: 0, labor: 0, total: 0,
    payment: null,
    authorized: false,
    notes: ['Estimate sent via text at 1:15pm, waiting response'],
  },
  {
    id: 'RO-8849', shopId: 5, customerId: 3,
    customerName: 'Brent Okwu', customerPhone: '+1 (832) 441-9283',
    vehicle: '2023 Tesla Model 3',
    techId: 9, techName: 'Chris Nakamura',
    stage: 'In Progress',
    created: '2024-11-07T09:00:00', updated: '2024-11-07T14:00:00',
    complaint: 'Tire repair, 12v battery replacement, alignment check',
    services: [
      { name: 'Tire plug repair',          price: 35 },
      { name: '12V auxiliary battery',     price: 285 },
      { name: 'Wheel alignment',           price: 105 },
    ],
    parts: 245, labor: 180, total: 425,
    payment: null,
    authorized: true,
    notes: ['EV certified bay used', 'Tesla diagnostic run - no fault codes'],
  },
  {
    id: 'RO-8850', shopId: 1, customerId: 1,
    customerName: 'Gerald Hutchins', customerPhone: '+1 (713) 881-4472',
    vehicle: '2018 Chevrolet Silverado 1500',
    techId: 1, techName: 'Andre Jackson',
    stage: 'Paid',
    created: '2026-05-10T08:00:00', updated: '2026-05-10T11:42:00',
    complaint: 'Brake pads worn, due for oil change',
    services: [
      { name: 'Brake pad replacement (front)', price: 280 },
      { name: 'Oil change',                    price: 120 },
    ],
    parts: 180, labor: 220, total: 400,
    payment: { method: 'text-to-pay', paidAt: '2026-05-10T11:42:00' },
    nextServiceDue: { service: 'Oil change', miles: 3000 },
    authorized: true,
    notes: ['Text-to-pay link sent at 11:30am', 'Customer paid via phone'],
  },
]
```

- [ ] **Step 2: Add Paid entry to stageBreakdown**

In `src/data/mock.js`, find the `stageBreakdown` export and add the Paid entry:

```js
export const stageBreakdown = [
  { name: 'Estimate',      value: 3, fill: '#3B82F6' },
  { name: 'Approved',      value: 2, fill: '#A855F7' },
  { name: 'In Progress',   value: 4, fill: '#F97316' },
  { name: 'Waiting Parts', value: 2, fill: '#EAB308' },
  { name: 'Complete',      value: 2, fill: '#22C55E' },
  { name: 'Invoiced',      value: 1, fill: '#64748B' },
  { name: 'Paid',          value: 1, fill: '#16A34A' },
]
```

- [ ] **Step 3: Verify**

Open the Repair Orders page. You should see 10 ROs total. The Paid tab should show 1. Clicking RO-8850 in the list opens the modal without crashing (even though the modal isn't redesigned yet — it will just show the services and financials). Check the console for errors.

- [ ] **Step 4: Commit**

```bash
git add src/data/mock.js
git commit -m "feat: enrich RO mock data with service prices, payment fields, and paid RO-8850"
```

---

## Task 3: Update NewROModal to accept pre-filled customer

**Files:**
- Modify: `src/components/modals/NewROModal.jsx`

RODetailModal needs to open NewROModal pre-filled with the current customer after payment. NewROModal currently accepts `preShopId` but not customer name or phone.

- [ ] **Step 1: Add preCustomerName and preCustomerPhone props**

In `src/components/modals/NewROModal.jsx`, update the function signature and the initial `useState` call:

```jsx
// Old signature:
export function NewROModal({ open, onClose, preShopId }) {
  const [form, setForm] = useState({
    shopId: preShopId || '',
    customerName: '',
    customerPhone: '',
    // ...rest

// New signature:
export function NewROModal({ open, onClose, preShopId, preCustomerName = '', preCustomerPhone = '' }) {
  const [form, setForm] = useState({
    shopId: preShopId || '',
    customerName: preCustomerName,
    customerPhone: preCustomerPhone,
    // ...rest
```

Also update the `onClose` reset in `handleSubmit` to clear the pre-filled fields:

```jsx
// Old reset:
setForm({ shopId: preShopId || '', customerName: '', customerPhone: '', vehicle: '', year: '', make: '', model: '', mileage: '', techId: '', complaint: '', stage: 'Estimate' })

// New reset:
setForm({ shopId: preShopId || '', customerName: preCustomerName, customerPhone: preCustomerPhone, vehicle: '', year: '', make: '', model: '', mileage: '', techId: '', complaint: '', stage: 'Estimate' })
```

- [ ] **Step 2: Verify**

The NewROModal still works as before — no visual change. The pre-filled props are only used when passed from RODetailModal (which we'll wire up in Task 4).

- [ ] **Step 3: Commit**

```bash
git add src/components/modals/NewROModal.jsx
git commit -m "feat: NewROModal accepts preCustomerName and preCustomerPhone props"
```

---

## Task 4: Rewrite RODetailModal

**Files:**
- Modify: `src/components/modals/RODetailModal.jsx`

Full rewrite. The component gets `size="xl"` (max-w-3xl), a 7-segment stage bar, and a two-column body where the right column switches panel based on stage.

**State:**
- `stage` — local copy of `ro.stage`, updated by advance/pay actions
- `payment` — local copy of `ro.payment`, set when paid
- `paymentPending` — `null` | `'text-to-pay'` (text-to-pay link sent, waiting)
- `saving` — button loading state
- `showNewRO` — boolean, controls NewROModal

**Right panel routing:**
- `stage === 'Paid'` → paid confirmation
- `stage === 'Invoiced'` → payment panel
- all other stages → financials + advance button (or "Generate Invoice" when Complete)

**Tax:** `subtotal = ro.total`, `taxAmount = round(subtotal × 0.085, 2)`, `grandTotal = subtotal + taxAmount`

- [ ] **Step 1: Write the new RODetailModal**

Replace the entire contents of `src/components/modals/RODetailModal.jsx` with:

```jsx
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { NewROModal } from '@/components/modals/NewROModal'
import { formatCurrency, RO_STAGES } from '@/lib/utils'
import { CheckCircle, MessageSquare, Phone, ChevronRight, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

const TAX_RATE = 0.085

const METHOD_LABELS = {
  'text-to-pay': 'Text-to-pay',
  'cash': 'Cash',
  'card': 'Card',
  'check': 'Check',
}

export function RODetailModal({ open, onClose, ro }) {
  const [stage, setStage] = useState(ro?.stage || 'Estimate')
  const [payment, setPayment] = useState(ro?.payment || null)
  const [paymentPending, setPaymentPending] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showNewRO, setShowNewRO] = useState(false)

  if (!ro) return null

  const currentStageIdx = RO_STAGES.indexOf(stage)
  const subtotal = ro.total
  const taxAmount = Math.round(subtotal * TAX_RATE * 100) / 100
  const grandTotal = subtotal + taxAmount

  const advanceStage = async () => {
    if (currentStageIdx >= RO_STAGES.length - 1) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    setStage(RO_STAGES[currentStageIdx + 1])
    setSaving(false)
  }

  const markPaid = async (method) => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 300))
    setPayment({ method, paidAt: new Date().toISOString() })
    setStage('Paid')
    setPaymentPending(null)
    setSaving(false)
  }

  const paidAt = payment?.paidAt
    ? new Date(payment.paidAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : ''

  // ── Stage bar ────────────────────────────────────────────────────────────
  const stageBar = (
    <div className="px-5 py-3 border-b border-border">
      <div className="flex rounded-md overflow-hidden">
        {RO_STAGES.map((s, i) => {
          const active = i <= currentStageIdx
          const isPaidSegment = s === 'Paid'
          const isCurrent = i === currentStageIdx
          return (
            <div
              key={s}
              className={cn(
                'flex-1 text-center py-1.5 text-xs transition-colors duration-300',
                active && isPaidSegment  ? 'bg-status-green text-white font-semibold' : '',
                active && !isPaidSegment ? 'bg-orange text-white' : '',
                !active ? 'bg-border text-text-muted' : '',
                isCurrent && !isPaidSegment ? 'font-semibold' : ''
              )}
            >
              {isCurrent && isPaidSegment ? '✓ ' : ''}{s}
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── Left column ──────────────────────────────────────────────────────────
  const isPastComplete = currentStageIdx >= RO_STAGES.indexOf('Complete')

  const leftColumn = (
    <div className="flex flex-col gap-5">
      {/* Customer / Vehicle / Tech row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Customer',   value: ro.customerName },
          { label: 'Vehicle',    value: ro.vehicle },
          { label: 'Technician', value: ro.techName || 'Unassigned' },
        ].map(({ label, value }) => (
          <div key={label}>
            <div className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-1">{label}</div>
            <div className="text-sm font-medium text-text-primary leading-snug">{value}</div>
          </div>
        ))}
      </div>

      {/* Customer concern */}
      <div>
        <div className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-1.5">Customer Concern</div>
        <p className="text-sm text-text-secondary leading-relaxed">{ro.complaint}</p>
      </div>

      {/* Services list */}
      <div>
        <div className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-2">Services</div>
        <div className="space-y-2">
          {ro.services.map((svc, i) => (
            <div key={i} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                {isPastComplete ? (
                  <CheckCircle size={13} className="text-status-green flex-shrink-0" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-orange flex-shrink-0" />
                )}
                <span className="text-text-primary truncate">{svc.name}</span>
              </div>
              {svc.price > 0 && (
                <span className="text-text-secondary font-medium tabular-nums flex-shrink-0">
                  {formatCurrency(svc.price)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Next service due (Paid only) */}
      {stage === 'Paid' && ro.nextServiceDue && (
        <div className="bg-orange-subtle border border-orange/20 rounded-lg p-3">
          <div className="text-xs font-semibold text-orange mb-1">Next service due</div>
          <div className="text-sm text-text-primary">
            {ro.nextServiceDue.service} in ~{ro.nextServiceDue.miles.toLocaleString()} miles
          </div>
          <div className="text-xs text-orange font-medium mt-2 cursor-pointer">
            Schedule next appointment →
          </div>
        </div>
      )}
    </div>
  )

  // ── Right panel: pre-invoice stages ─────────────────────────────────────
  const rightPanelEarly = (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-3">Financials</div>
        {ro.total > 0 ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Parts</span>
              <span className="text-text-primary tabular-nums">{formatCurrency(ro.parts)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Labor</span>
              <span className="text-text-primary tabular-nums">{formatCurrency(ro.labor)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-border">
              <span className="font-semibold text-text-primary">Total</span>
              <span className="font-semibold text-orange tabular-nums">{formatCurrency(ro.total)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted">Awaiting estimate approval</p>
        )}
      </div>

      {stage === 'Complete' ? (
        <Button className="w-full" onClick={advanceStage} loading={saving}>
          <FileText size={14} />
          Generate Invoice
        </Button>
      ) : currentStageIdx < RO_STAGES.indexOf('Invoiced') ? (
        <Button className="w-full" onClick={advanceStage} loading={saving}>
          Advance to {RO_STAGES[currentStageIdx + 1]}
          <ChevronRight size={14} />
        </Button>
      ) : null}
    </div>
  )

  // ── Right panel: payment panel (Invoiced) ────────────────────────────────
  const rightPanelInvoiced = (
    <div className="flex flex-col gap-4">
      {/* Invoice summary */}
      <div>
        <div className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-3">Invoice Summary</div>
        <div className="space-y-1.5">
          {ro.services.map((svc, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-text-muted truncate mr-2">{svc.name}</span>
              <span className="text-text-primary tabular-nums flex-shrink-0">{formatCurrency(svc.price)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm pt-2 border-t border-border">
            <span className="text-text-muted">Tax (8.5%)</span>
            <span className="text-text-primary tabular-nums">{formatCurrency(taxAmount)}</span>
          </div>
          <div className="flex justify-between items-baseline pt-2 border-t border-border">
            <span className="text-sm font-semibold text-text-primary">Total due</span>
            <span className="text-2xl font-bold text-orange tabular-nums">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Payment actions */}
      {paymentPending === 'text-to-pay' ? (
        // Pending state — link sent
        <div className="flex flex-col gap-2.5">
          <div className="bg-orange-subtle border border-orange/20 rounded-lg p-3 text-center">
            <div className="text-xs font-semibold text-orange mb-1">Link sent</div>
            <div className="text-sm text-text-primary">{ro.customerPhone}</div>
            <div className="text-xs text-text-muted mt-1">Waiting for payment…</div>
          </div>
          <Button className="w-full" onClick={() => markPaid('text-to-pay')} loading={saving}>
            Simulate payment received
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => markPaid('cash')} loading={saving}>
            Mark as paid manually
          </Button>
        </div>
      ) : (
        // Initial state — choose payment method
        <div className="flex flex-col gap-3">
          {/* Text-to-pay — primary */}
          <button
            onClick={() => setPaymentPending('text-to-pay')}
            className="w-full bg-orange hover:bg-orange-hover text-white rounded-lg p-3 text-left transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-md flex items-center justify-center flex-shrink-0">
                <MessageSquare size={15} className="text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold leading-tight">Send text-to-pay link</div>
                <div className="text-xs text-white/75 mt-0.5">
                  Text {formatCurrency(grandTotal)} link to {ro.customerPhone}
                </div>
              </div>
            </div>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-2xs text-text-muted whitespace-nowrap">or mark as paid</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Cash / Card / Check */}
          <div className="grid grid-cols-3 gap-2">
            {(['cash', 'card', 'check'] ).map(method => (
              <button
                key={method}
                onClick={() => markPaid(method)}
                className="border border-border rounded-lg py-2.5 text-center text-sm font-medium text-text-secondary hover:border-orange hover:text-text-primary transition-colors duration-150 capitalize focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange"
              >
                {method.charAt(0).toUpperCase() + method.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  // ── Right panel: paid confirmation ───────────────────────────────────────
  const rightPanelPaid = (
    <div className="flex flex-col gap-4">
      {/* Green success card */}
      <div className="bg-status-green-subtle border border-status-green/20 rounded-xl p-5 text-center">
        <div className="w-11 h-11 rounded-full bg-status-green/20 flex items-center justify-center mx-auto mb-3">
          <CheckCircle size={22} className="text-status-green" />
        </div>
        <div className="text-lg font-bold text-status-green mb-1">
          {formatCurrency(grandTotal)} received
        </div>
        <div className="text-xs text-text-muted">
          {METHOD_LABELS[payment?.method] || 'Paid'} · {paidAt}
        </div>
      </div>

      {/* Text receipt */}
      <button className="w-full border border-border rounded-lg py-2.5 text-sm font-medium text-text-secondary hover:border-orange hover:text-text-primary transition-colors duration-150 flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange">
        <Phone size={14} />
        Text receipt
      </button>

      {/* Start new RO */}
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => setShowNewRO(true)}
      >
        Start new RO for {ro.customerName} →
      </Button>
    </div>
  )

  // ── Panel routing ────────────────────────────────────────────────────────
  const rightPanel =
    stage === 'Paid'     ? rightPanelPaid :
    stage === 'Invoiced' ? rightPanelInvoiced :
                           rightPanelEarly

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={ro.id}
        subtitle={`${ro.vehicle} · ${ro.customerName}`}
        size="xl"
      >
        {stageBar}
        <div className="grid grid-cols-[3fr_2fr] gap-0 p-0">
          <div className="p-5">
            {leftColumn}
          </div>
          <div className="border-l border-border p-5">
            {rightPanel}
          </div>
        </div>
      </Modal>

      {showNewRO && (
        <NewROModal
          open={showNewRO}
          onClose={() => setShowNewRO(false)}
          preShopId={ro.shopId}
          preCustomerName={ro.customerName}
          preCustomerPhone={ro.customerPhone}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: Verify all stage panels in the browser**

Open each of these ROs and confirm the right panel is correct:

| RO | Expected right panel |
|----|---------------------|
| RO-8843 (Estimate) | "Awaiting estimate approval" + "Advance to Approved" button |
| RO-8844 (Complete) | Parts/labor/total financials + "Generate Invoice" button |
| RO-8847 (Invoiced) | Invoice summary with tax + text-to-pay button + Cash/Card/Check |
| RO-8850 (Paid) | Green checkmark + "$434.00 received" + "Text receipt" + "Start new RO" |

Also verify the stage bar: on RO-8847 (Invoiced) all 6 segments up to Invoiced should be orange; on RO-8850 (Paid) all 7 segments are filled — 6 in orange, Paid in green.

Click "Send text-to-pay link" on RO-8847: right panel switches to "Link sent" state with "Simulate payment received" and "Mark as paid manually" buttons.

Click "Simulate payment received": stage advances to Paid, green confirmation card appears.

Click "Start new RO for Alicia Watkins →": NewROModal opens with customer name and phone pre-filled.

- [ ] **Step 3: Commit**

```bash
git add src/components/modals/RODetailModal.jsx
git commit -m "feat: redesign RODetailModal with stage bar, two-column layout, and payment panel"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task covering it |
|---|---|
| Add 'Paid' to RO_STAGES | Task 1 |
| Add green 'Paid' to STAGE_COLORS | Task 1 |
| payment field on RO objects | Task 2 |
| nextServiceDue field on ROs | Task 2 |
| 7-segment stage bar (orange → green) | Task 4, stageBar |
| Left col: customer/vehicle/tech row | Task 4, leftColumn |
| Left col: complaint | Task 4, leftColumn |
| Left col: services list with price + green checkmark ≥ Complete | Task 4, leftColumn |
| Left col: next service due nudge when Paid | Task 4, leftColumn |
| Right col: financials + advance button for pre-invoice stages | Task 4, rightPanelEarly |
| Right col: "Generate Invoice" button at Complete | Task 4, rightPanelEarly |
| Right col: payment panel at Invoiced | Task 4, rightPanelInvoiced |
| Payment panel: invoice summary with tax | Task 4, rightPanelInvoiced |
| Payment panel: text-to-pay primary | Task 4, rightPanelInvoiced |
| Payment panel: text-to-pay pending state with simulate + manual | Task 4, rightPanelInvoiced |
| Payment panel: cash/card/check secondary | Task 4, rightPanelInvoiced |
| Right col: paid confirmation with checkmark + method + time | Task 4, rightPanelPaid |
| Text receipt button (no print) | Task 4, rightPanelPaid |
| Start new RO button opens NewROModal pre-filled | Tasks 3 + 4 |
| No Stripe Terminal UI | Satisfied — not present anywhere |

**No placeholders found.**

**Type consistency:** `ro.services[i].name` and `ro.services[i].price` used consistently throughout both leftColumn and rightPanelInvoiced.
