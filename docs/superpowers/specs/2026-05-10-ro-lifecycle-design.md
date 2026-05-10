# RO Lifecycle & Payment Flow — Design Spec
**Date:** 2026-05-10
**Surface:** Dashboard — Repair Order detail modal (`RODetailModal.jsx`)
**Scope:** Sub-project 1 of 3 (RO Lifecycle → Owner Command Center → Customer Profile)

---

## Context

ShopCommand already has a working RepairOrders list page and a basic RODetailModal. The modal shows stage, customer info, services, financials, and notes — but has no payment flow and ends at "Invoiced." This spec redesigns the modal into a two-column layout with a full payment panel, adds a "Paid" terminal stage, and delivers the complete RO lifecycle experience from a shop owner's point of view.

---

## What Changes

### 1. Add "Paid" stage to the RO lifecycle

`src/lib/utils.js`:
- Add `'Paid'` to the end of `RO_STAGES`
- Add a green entry for `'Paid'` in `STAGE_COLORS`

### 2. Add payment fields to mock ROs

`src/data/mock.js`:
- Add `payment: null` to open ROs
- Add `payment: { method: 'text-to-pay' | 'cash' | 'card' | 'check', paidAt: '2026-05-10T11:42:00' }` to paid ROs
- Add `nextServiceDue: { service: string, miles: number }` to ROs where applicable

### 3. Redesign RODetailModal

`src/components/modals/RODetailModal.jsx` — full redesign. The modal uses `size="xl"` and has two zones:

**Zone 1 — Stage bar (full width, top)**
- Seven labeled segments: Estimate → Approved → In Progress → Waiting Parts → Complete → Invoiced → Paid
- Active and completed stages filled orange; paid stage filled green
- Current stage label bold, others muted
- "Advance stage" button removed from header — replaced by a contextual action in Zone 2

**Zone 2 — Two-column body**

Left column (60% width): Job details
- Customer name, vehicle, technician in a compact three-item row
- Customer concern (complaint text)
- Services list — each line shows service name + price; green checkmark when stage is Complete or later
- When stage is Paid: "Next service due" nudge card (orange tint, shows service + mileage, "Schedule →" link)

Right column (40% width): Context-sensitive panel — switches based on stage

| Stage | Right panel shows |
|-------|-------------------|
| Estimate, Approved, In Progress, Waiting Parts | Financials summary (parts, labor, total) + "Advance to next stage" button |
| Complete | Same financials + prominent "Generate Invoice" button |
| Invoiced | Payment panel (see below) |
| Paid | Payment confirmation (see below) |

---

## Payment Panel (stage = Invoiced)

Shown in the right column when stage is "Invoiced."

**Invoice summary:**
- Line items: each service with price
- Tax line (8.5%)
- Total due in orange, large

**Primary action — Text-to-pay:**
- Full-width orange button: "Send text-to-pay link"
- Subtitle: "Text $[total] link to [customer phone]"
- On click: sets `paymentPending: 'text-to-pay'` in local state, shows "Link sent — waiting for payment" confirmation state

**Divider:** "or mark as paid"

**Secondary actions — three equal buttons:**
- Cash
- Card (their terminal)
- Check

On click of any secondary: immediately sets stage to "Paid" with `payment: { method, paidAt: now }`.

For text-to-pay pending state: shows "Link sent to (xxx) xxx-xxxx" with two options below:
- "Simulate payment received" button (demo only — advances RO to Paid immediately, simulates the webhook that would fire in production)
- "Mark as paid manually" fallback if the customer pays in person instead

---

## Payment Confirmation (stage = Paid)

Shown in the right column when stage is "Paid."

- Green success card: checkmark icon, "$[total] received", method + time
- Single action: "Text receipt" button (only shown; no print)
- Below receipt: "Start new RO for [customer name]" button (dark, full width) — opens NewROModal pre-filled with customer

---

## Paid State — Left Column

When stage is Paid, the left column services list updates:
- Each service line gets a green checkmark
- "Next service due" nudge appears at the bottom (if `nextServiceDue` is set on the RO):
  - Orange-tinted card
  - "[Service] in ~[miles] miles"
  - "Schedule next appointment →" link (no-op for demo, link goes nowhere)

---

## Files

| File | Change |
|------|--------|
| `src/lib/utils.js` | Add `'Paid'` to `RO_STAGES`; add green `'Paid'` entry to `STAGE_COLORS` |
| `src/data/mock.js` | Add `payment` and `nextServiceDue` fields to RO objects |
| `src/components/modals/RODetailModal.jsx` | Full redesign — two-column layout, payment panel, paid state |

---

## Out of Scope

- No real Stripe integration (demo only — button states are simulated with setTimeout)
- No appointment booking page (the "Schedule →" link is a no-op)
- No changes to RepairOrders list page
- No changes to NewROModal beyond accepting pre-filled customer prop
- No email receipts
- No Stripe Terminal UI

---

## Success Criteria

- Stage bar shows all 7 stages including "Paid"; turns green on completion
- Right column switches correctly at each stage
- Payment panel shows text-to-pay as primary and cash/card/check as secondary
- Selecting any payment method advances RO to Paid and shows confirmation
- Paid state shows green checkmark, method, time, and "Text receipt" button
- "Start new RO" button opens NewROModal
- "Next service due" nudge appears on applicable paid ROs
- No Stripe Terminal UI anywhere
