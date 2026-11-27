import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAuth as useClerkAuth } from '@clerk/clerk-react'
import { useAuth } from '@/contexts/AuthContext'
import { api, setTokenProvider } from '@/lib/api'
import { setUploadTokenProvider } from '@/lib/uploads'
import { invoiceRevenueTotals } from '@/lib/invoiceRevenue'
import { DEMO_TRUCKS } from '@/lib/trucks'
import { localYmd } from '@/lib/utils'
import { invoiceFromServerRow, saveInvoiceToServer, planImport, moveLocalInvoices, remainingLocal, mergeSetAside, buildImportReport, voidedInvoiceRows } from '@/lib/serverInvoices'
import { returnedCreditEntry, withShopNames } from '@/lib/demoData'
import {
  parts as initialParts,
  cannedServices,
  shops as mockShops,
  technicians as mockTechnicians,
  repairOrders as mockRepairOrders,
  customers as mockCustomers,
  invoices as mockInvoices,
} from '@/data/mock'

const DataContext = createContext(null)

// Transform API snake_case → camelCase so all existing pages keep working
function transformShop(s) {
  return {
    ...s,
    orgId: s.org_id,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    openROs: Number(s.open_ros || 0),
    revenue: {
      today: Number(s.revenue_today || 0),
      mtd: Number(s.revenue_mtd || 0),
      ytd: Number(s.revenue_ytd || 0),
    },
    avgTicket: Number(s.avg_ticket || 0),
    efficiency: Number(s.efficiency || 0),
    activeTechs: Number(s.active_techs || 0),
    status: 'open',
    // Owner-configured extras live in the shops.data JSONB column
    bays: Number(s.data?.bays) || 0,
    manager: s.data?.manager || '',
    monthlyTarget: Number(s.data?.monthly_target) || 0,
    schedule: s.data?.schedule || null,
    // Printed on invoices: a small picture (data URL) and the width it prints at
    logo: s.data?.logo || null,
    logoWidth: Number(s.data?.logo_width) || 0,
    // The shop tracks its own trucks (shows the Fleet page); off by default
    fleetEnabled: s.data?.fleet_enabled === true,
  }
}

// DB invoices are RO-linked rows (amount/status/paid_at); enrich them with
// display fields and line items from the already-loaded repair orders.
function transformInvoice(row, rosById) {
  if (row.status === 'void') return null
  // From-scratch and imported invoices carry their own lines and customer
  if (!row.ro_id) return invoiceFromServerRow(row)
  const ro = rosById[row.ro_id]
  const displayId = row.number || (row.ro_number
    ? `INV-${String(row.ro_number).replace(/^RO-?/i, '')}`
    : `INV-${String(row.id).slice(0, 8).toUpperCase()}`)
  const isPaid = row.status === 'paid'
  const amountPaid = Number(row.amount_paid) || 0
  const ageMs = Date.now() - new Date(row.created_at).getTime()
  return {
    id: displayId,
    dbId: row.id,
    roId: ro?.roNumber || ro?.id || row.ro_id,
    shopId: ro?.shopId ?? null,
    customerId: ro?.customerId ?? null,
    vehicleId: ro?.vehicleId ?? null,
    creditApplied: Number(row.credit_applied) || 0,
    customerName: row.customer_name || ro?.customerName || '',
    customerEmail: ro?.customerEmail || null,
    vehicle: ro?.vehicle || '',
    status: isPaid ? 'paid' : amountPaid > 0 ? 'partial' : ageMs > 14 * 86400000 ? 'overdue' : 'sent',
    created: row.created_at,
    paidAt: row.paid_at || null,
    amountPaid,
    paymentMethod: null,
    // Line items = RO services plus parts used on the job (kept separately on
    // the RO) so displayed lines and edit math account for the whole amount
    services: [
      ...(ro?.services || []).map(s => ({ name: s.name, parts: 0, labor: Number(s.price) || 0 })),
      ...(ro?.partsUsed || []).map(p => ({
        name: `${p.name || 'Part'}${Number(p.qty) > 1 ? ` (x${Number(p.qty)})` : ''}`,
        parts: (Number(p.price) || 0) * (Number(p.qty) || 1),
        labor: 0,
      })),
    ],
    subtotal: Number(row.amount) || 0,
    tax: 0,
    total: Number(row.amount) || 0,
  }
}

function transformPartsOrder(p) {
  return {
    id: p.id,
    shopId: p.shop_id,
    name: p.name,
    partNumber: p.part_number || '',
    qty: Number(p.qty) || 1,
    status: p.status || 'ordered',
    supplier: p.supplier || '',
    eta: p.eta || '',
    carrier: p.carrier || '',
    trackingNumber: p.tracking_number || '',
    requestedBy: p.requested_by || '',
    requestedAt: p.created_at,
  }
}

function transformTech(t) {
  return {
    ...t,
    shopId: t.shop_id,
    shopName: t.shop_name,
    clerkId: t.clerk_id,
    activeROs: Number(t.active_ros || 0),
    entriesToday: Number(t.entries_today || 0),
    clockedInSince: t.clocked_in_since,
    createdAt: t.created_at,
    // Safe defaults so list/profile pages never crash on missing fields
    efficiency: Number(t.efficiency || 0),
    specialty: t.specialty || 'General',
    level: t.level || 'Technician',
    certifications: Array.isArray(t.certifications) ? t.certifications : [],
    hoursWeek: Number(t.hours_week || 0),
  }
}

function transformRO(ro) {
  // Merge JSONB data column back into the RO object
  const data = ro.data || {}
  return {
    ...ro,
    ...data,
    shopId: ro.shop_id,
    customerId: ro.customer_id,
    vehicleId: ro.vehicle_id,
    techId: ro.tech_id,
    advisorId: ro.advisor_id,
    roNumber: ro.ro_number,
    customerName: ro.customer_name || '',
    customerEmail: ro.customer_email,
    customerPhone: ro.customer_phone,
    vehicle: [ro.vehicle_year, ro.vehicle_make, ro.vehicle_model].filter(Boolean).join(' '),
    techName: ro.tech_name || 'Unassigned',
    advisorName: ro.advisor_name,
    shopName: ro.shop_name,
    total: Number(ro.total || 0),
    created: ro.created_at,
    updated: ro.updated_at,
    scheduledAt: ro.scheduled_at || null,
    // DB 'notes' column is the complaint string; JSONB 'data.notes' is the notes array — resolve the collision
    complaint: typeof ro.notes === 'string' ? ro.notes : (data.complaint || ''),
    notes: Array.isArray(data.notes) ? data.notes : [],
  }
}

function transformCustomer(c) {
  const totalSpent = Number(c.total_spent || 0)
  const roCount = Number(c.ro_count || 0)
  return {
    ...c,
    orgId: c.org_id,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    totalSpent,
    roCount,
    lastVisit: c.last_visit || null,
    // Money the customer has paid ahead (a deposit or overpayment), used up as invoices come due
    creditBalance: Number(c.credit_balance || 0),
    vehicles: Number(c.vehicle_count || c.vehicles || 0),
    status: c.status || (totalSpent >= 5000 ? 'vip' : roCount <= 1 ? 'new' : 'regular'),
  }
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

export function DataProvider({ children }) {
  const { getToken } = useClerkAuth()
  const { session } = useAuth()
  const tokenInjected = useRef(false)
  const lastClerkId = useRef(null)

  // Inject Clerk token provider into api.js and uploads.js once
  useEffect(() => {
    if (getToken && !tokenInjected.current) {
      setTokenProvider(getToken)
      setUploadTokenProvider(getToken)
      tokenInjected.current = true
    }
  }, [getToken])

  // ── API-backed state ─────────────────────────────────────────────────────
  const [shops, setShops] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [repairOrders, setRepairOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [clockedInTechs, setClockedInTechs] = useState(new Set())
  const [timeEntries, setTimeEntries] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  // Invoices: demo seeds from mock. Real accounts keep them on the server; the
  // browser copy (sc_invoices) only holds ones not yet saved there, and is moved
  // up once by runInvoiceImport below.
  const [invoices, setInvoices] = useState(() => load('sc_invoices', []))
  // Result of moving this computer's invoices to the server, shown until dismissed
  const [invoiceImport, setInvoiceImport] = useState(() => load('sc_invoice_import_report', null))
  const [importTick, setImportTick] = useState(0)
  // Demo only: the customer credit ledger (real accounts keep it on the server)
  const [demoLedger, setDemoLedger] = useState({})
  // Demo only: invoices voided this visit (real accounts read them from the server)
  const [demoVoided, setDemoVoided] = useState([])
  const importTried = useRef(new Set())
  const importing = useRef(false)

  // ── Parts state (API for real users, localStorage for demo) ──────────────
  const [parts, setParts] = useState(() => {
    return sessionStorage.getItem('sc_demo') === '1' ? initialParts : []
  })
  const [jobTimers, setJobTimers] = useState(() => load('sc_job_timers', {}))
  const [notifications, setNotifications] = useState(() => {
    const stored = load('sc_notifications', null)
    if (stored && stored.length > 0) return stored
    return []
  })
  const [partsOrders, setPartsOrders] = useState(() => load('sc_parts_orders', []))

  // ── Clear all data when user identity changes (prevents cross-account bleed)
  useEffect(() => {
    const currentId = session?.clerkId || (session?.demo ? '__demo__' : null)
    if (currentId && lastClerkId.current && currentId !== lastClerkId.current) {
      // Different user logged in — wipe previous user's data
      setShops([])
      setTechnicians([])
      setRepairOrders([])
      setCustomers([])
      setClockedInTechs(new Set())
      setTimeEntries([])
      setPayments([])
      setInvoices([])
      setParts([])
      setNotifications([])
      setPartsOrders([])
      setLoading(true)
    }
    if (currentId) lastClerkId.current = currentId
  }, [session?.clerkId, session?.demo])

  // ── Clear stale mock data for real users ─────────────────────────────────
  useEffect(() => {
    if (session && !session.demo && session.onboarded) {
      // Real user — remove any leftover mock data from localStorage
      const storedParts = load('sc_parts', null)
      if (storedParts && storedParts.length > 0 && storedParts[0]?.sku === 'BRK-4411') {
        localStorage.removeItem('sc_parts')
        setParts([])
      }
      localStorage.removeItem('sc_notifications')
      setNotifications([])
    }
  }, [session])

  // ── Demo mode: load mock data directly, skip API ─────────────────────────
  useEffect(() => {
    if (!session?.demo) return
    const today = new Date()
    const demoROs = mockRepairOrders.map((ro, i) => {
      const offset = i % 11
      const d = new Date(today)
      d.setDate(d.getDate() - offset)
      const ymd = d.toISOString().slice(0, 19)
      return { ...ro, created: ymd, updated: ymd }
    })
    setShops(mockShops.map(s => ({ ...s, fleetEnabled: true }))) // the demo shows the Fleet page
    setTechnicians(mockTechnicians)
    setRepairOrders(withShopNames(demoROs, mockShops))
    // Give the first demo invoices to the demo fleet trucks, so the Fleet page has history
    setInvoices(mockInvoices.map((inv, i) => (i < 6 ? { ...inv, vehicleId: DEMO_TRUCKS[i % DEMO_TRUCKS.length].id } : inv)))
    // Re-base stale lastVisit dates so demo customers look recently active
    setCustomers(mockCustomers.map((c, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - ((i * 7) % 45) - 1)
      return { ...c, lastVisit: d.toISOString().slice(0, 10) }
    }))
    setClockedInTechs(new Set(mockTechnicians.slice(0, 8).map(t => t.id)))
    // Seed time entries so hours/time-log/audit views have data in demo:
    // an open shift today (staggered 7:00–8:45am starts) plus four 8h-ish
    // closed shifts on prior weekdays per clocked-in tech.
    const demoEntries = []
    mockTechnicians.slice(0, 8).forEach((t, i) => {
      const start = new Date(today)
      start.setHours(7, (i * 15) % 60, 0, 0)
      demoEntries.push({ id: `te-${t.id}-0`, techId: t.id, roId: null, clockInAt: start.toISOString(), clockOutAt: null })
      for (let d = 1; d <= 4; d++) {
        const inAt = new Date(today)
        inAt.setDate(inAt.getDate() - d)
        if (inAt.getDay() === 0 || inAt.getDay() === 6) continue
        inAt.setHours(7, 30, 0, 0)
        const outAt = new Date(inAt)
        outAt.setHours(16, 15 + ((i + d) % 4) * 10, 0, 0)
        demoEntries.push({ id: `te-${t.id}-${d}`, techId: t.id, roId: null, clockInAt: inAt.toISOString(), clockOutAt: outAt.toISOString() })
      }
    })
    setTimeEntries(demoEntries)
    setLoading(false)
  }, [session?.demo])

  // ── One-time move of this computer's invoices to the server ──────────────
  // Safety rules: a full copy is kept first (sc_invoices_backup_v1); a local
  // invoice leaves the live list ONLY after the server confirms it saved it, or
  // already has the same number and amount; a number the server has with a
  // DIFFERENT amount is not moved, is saved in full to sc_invoice_conflicts_v1
  // and reported; anything that fails stays in the live list and is retried.
  const runInvoiceImport = useCallback(async (serverRows) => {
    if (session?.demo || session?.role === 'tech' || importing.current) return
    // Kill switch for support: localStorage sc_invoice_import = 'off' stops the move
    // in this browser (nothing else is needed to run it).
    try { if (localStorage.getItem('sc_invoice_import') === 'off') return } catch { /* storage blocked: carry on, the move itself checks the server */ }
    const local = load('sc_invoices', [])
    if (!Array.isArray(local) || local.length === 0) return
    const plan = planImport(local, serverRows)
    const pending = plan.toSend.length + plan.conflicts.length + plan.duplicates.length
    if (!pending) return

    importing.current = true
    try {
      try {
        if (!localStorage.getItem('sc_invoices_backup_v1')) {
          localStorage.setItem('sc_invoices_backup_v1', localStorage.getItem('sc_invoices') || '[]')
        }
      } catch { /* storage full or blocked: the server copy is still confirmed before anything is removed */ }

      const result = await moveLocalInvoices({
        local,
        serverRows,
        tried: importTried.current,
        post: (batch) => api('/api/invoices?action=import', { method: 'POST', body: { invoices: batch } }),
      })

      // A conflict (same number as a server invoice, different amount) is first
      // written, in full, to its own key. Only when that write worked does it leave
      // the live list, so no later save of the list can ever drop it.
      let setAside = false
      if (result.conflictItems.length) {
        try {
          localStorage.setItem('sc_invoice_conflicts_v1', JSON.stringify(mergeSetAside(load('sc_invoice_conflicts_v1', []), result.conflictItems)))
          setAside = true
        } catch { setAside = false }
      }

      // Re-read right before writing so an invoice saved meanwhile is never lost
      const changed = result.moved.size || result.duplicateKeys.size || (setAside && result.conflictKeys.size)
      if (changed) {
        save('sc_invoices', remainingLocal(load('sc_invoices', []), result, { conflictsSavedAside: setAside }))
      }

      // The message ADDS to an unread one, so the "N moved" summary is never lost
      if (result.moved.size || result.failed.length || result.conflicts.length) {
        const report = buildImportReport(load('sc_invoice_import_report', null), result)
        save('sc_invoice_import_report', report)
        setInvoiceImport(report)
      }
      if (changed) setImportTick(t => t + 1) // reload so the server copies show
    } finally {
      importing.current = false
    }
  }, [session?.demo, session?.role])

  const dismissInvoiceImport = useCallback(() => {
    setInvoiceImport(null)
    try { localStorage.removeItem('sc_invoice_import_report') } catch {}
  }, [])

  // ── Fetch all data from API when session is ready ────────────────────────
  const fetchAll = useCallback(async () => {
    if (!session?.onboarded || session?.demo) return
    setLoading(true)
    try {
      // Track failures so the UI can distinguish "no data" from "couldn't load".
      // Failed fetches return null (not []) so we keep previously loaded data
      // instead of wiping it — never show $0 because of a network blip.
      let coreFailures = 0
      const guard = (p) => p.catch(() => { coreFailures++; return null })
      const [shopsData, techsData, rosData, custData, paymentsData, partsData, entriesData, invoicesData, partsOrdersData] = await Promise.all([
        guard(api('/api/shops')),
        guard(api('/api/technicians')),
        guard(api('/api/repair-orders')),
        guard(api('/api/customers')),
        api('/api/invoices?action=payments').catch(() => []),
        api('/api/health?action=parts').catch(() => null),
        api('/api/time-entries').catch(() => null),
        api('/api/invoices').catch(() => null),
        api('/api/health?action=parts-orders').catch(() => null),
      ])
      setFetchError(coreFailures > 0)
      if (shopsData) setShops(shopsData.map(transformShop))
      if (techsData) setTechnicians(techsData.map(transformTech))
      const transformedROs = rosData ? rosData.map(transformRO) : null
      if (transformedROs) setRepairOrders(transformedROs)
      if (custData) setCustomers(custData.map(transformCustomer))
      setPayments(paymentsData)
      if (Array.isArray(partsData)) {
        setParts(partsData.map(p => ({
          ...p, shopId: p.shop_id, minQty: p.min_qty, lastOrdered: p.last_ordered,
          name: p.name || '', sku: p.sku || '', category: p.category || '', vendor: p.vendor || '',
          cost: Number(p.cost || 0), price: Number(p.price || 0), qty: Number(p.qty || 0),
        })))
      }

      // Hydrate job timers from RO JSONB data (merge with localStorage, API wins)
      const apiTimers = {}
      for (const ro of transformedROs || []) {
        if (ro.jobTimers) Object.assign(apiTimers, ro.jobTimers)
      }
      if (Object.keys(apiTimers).length) {
        setJobTimers(prev => {
          const merged = { ...prev, ...apiTimers }
          save('sc_job_timers', merged)
          return merged
        })
      }

      // Invoices from the DB, enriched from the loaded ROs; locally-saved
      // custom invoices (generator drafts without a DB row) are kept alongside
      if (Array.isArray(invoicesData) && transformedROs) {
        const rosById = Object.fromEntries(transformedROs.map(r => [r.id, r]))
        const serverInvoices = invoicesData.map(row => transformInvoice(row, rosById)).filter(Boolean)
        const serverIds = new Set(serverInvoices.map(i => i.id))
        const localOnly = load('sc_invoices', []).filter(i => !i.dbId && !serverIds.has(i.id))
        setInvoices([...serverInvoices, ...localOnly].sort((a, b) => new Date(b.created) - new Date(a.created)))
        // Move any invoices still only on this computer up to the server
        runInvoiceImport(invoicesData)
      }

      if (Array.isArray(partsOrdersData)) {
        setPartsOrders(partsOrdersData.map(transformPartsOrder))
      }

      // Time entries power hours/audit/pay displays — snake_case → camelCase
      if (Array.isArray(entriesData)) {
        setTimeEntries(entriesData.map(e => ({
          id: e.id,
          techId: e.tech_id,
          roId: e.ro_id,
          clockInAt: e.clock_in,
          clockOutAt: e.clock_out,
        })))
      }

      // Derive clocked-in techs from technician data
      if (techsData) {
        const clockedIn = new Set()
        for (const t of techsData) {
          if (t.clocked_in_since) clockedIn.add(t.id)
        }
        setClockedInTechs(clockedIn)
      }
    } catch {
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }, [session?.onboarded, session?.demo, session?.clerkId, runInvoiceImport])

  useEffect(() => {
    if (tokenInjected.current && session?.onboarded && !session?.demo) {
      fetchAll()
    }
  }, [fetchAll, session?.onboarded, session?.demo, session?.clerkId])

  // After invoices were moved to the server, reload so the saved copies show
  useEffect(() => {
    if (importTick > 0 && !session?.demo) fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importTick])

  // ── Auto-refresh every 30s when tab is visible (non-demo) ───────────────
  useEffect(() => {
    if (session?.demo || !session?.onboarded) return
    let interval = null
    const start = () => { interval = setInterval(fetchAll, 30_000) }
    const stop = () => { clearInterval(interval); interval = null }
    const handleVisibility = () => {
      if (document.hidden) stop()
      else { fetchAll(); start() }
    }
    start()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => { stop(); document.removeEventListener('visibilitychange', handleVisibility) }
  }, [fetchAll, session?.demo, session?.onboarded])

  // ── shop CRUD ─────────────────────────────────────────────────────────────

  const addShop = useCallback(async (shop) => {
    if (session?.demo) {
      const demoShop = {
        id: crypto.randomUUID(),
        ...shop,
        openROs: 0,
        revenue: { today: 0, mtd: 0, ytd: 0 },
        avgTicket: 0, efficiency: 0, activeTechs: 0,
        status: 'open',
        bays: Number(shop.bays) || 0,
        monthlyTarget: Number(shop.monthly_target ?? shop.monthlyTarget) || 0,
      }
      delete demoShop.monthly_target
      const newCount = shops.length + 1
      setShops(prev => [...prev, demoShop])
      return { ...demoShop, billing: { monthlyTotal: 100 + (newCount - 1) * 50, shopCount: newCount } }
    }
    const row = await api('/api/shops', { method: 'POST', body: shop })
    const { billing, ...shopRow } = row
    const transformed = transformShop(shopRow)
    setShops(prev => [...prev, transformed])
    return { ...transformed, billing }
  }, [session?.demo, shops.length])

  const updateShop = useCallback(async (id, patch) => {
    if (session?.demo) {
      // Settings sends API field names — normalize for local demo state
      const local = { ...patch }
      if ('monthly_target' in local) { local.monthlyTarget = Number(local.monthly_target) || 0; delete local.monthly_target }
      if ('bays' in local) local.bays = Number(local.bays) || 0
      if ('logo_width' in local) { local.logoWidth = Number(local.logo_width) || 0; delete local.logo_width }
      if ('fleet_enabled' in local) { local.fleetEnabled = local.fleet_enabled === true; delete local.fleet_enabled }
      setShops(prev => prev.map(s => s.id === id ? { ...s, ...local } : s))
      return { id, ...local }
    }
    const row = await api('/api/shops', { method: 'PUT', params: { id }, body: patch })
    const transformed = transformShop(row)
    setShops(prev => prev.map(s => s.id === id ? transformed : s))
    return transformed
  }, [session?.demo])

  const removeShop = useCallback(async (id) => {
    if (session?.demo) {
      const newCount = Math.max(1, shops.length - 1)
      setShops(prev => prev.filter(s => s.id !== id))
      return { deleted: id, billing: { monthlyTotal: 100 + (newCount - 1) * 50, shopCount: newCount } }
    }
    const res = await api('/api/shops', { method: 'DELETE', params: { id } })
    setShops(prev => prev.filter(s => s.id !== id))
    return res
  }, [session?.demo, shops.length])

  // ── customer CRUD ────────────────────────────────────────────────────────

  const addCustomer = useCallback(async (cust) => {
    if (session?.demo) {
      const demoCust = {
        id: crypto.randomUUID(),
        name: cust.name,
        phone: cust.phone || null,
        email: cust.email || null,
        shopId: cust.shop_id || cust.shopId || null,
        vehicles: 0,
        totalSpent: 0,
        roCount: 0,
        lastVisit: localYmd(),
        status: 'new',
      }
      setCustomers(prev => [demoCust, ...prev])
      return demoCust
    }
    const row = await api('/api/customers', { method: 'POST', body: cust })
    const transformed = transformCustomer(row)
    setCustomers(prev => [transformed, ...prev])
    return transformed
  }, [session?.demo])

  const updateCustomer = useCallback(async (id, patch) => {
    if (session?.demo) {
      let updated
      setCustomers(prev => prev.map(c => {
        if (c.id !== id) return c
        updated = { ...c, ...patch }
        return updated
      }))
      return updated
    }
    const row = await api('/api/customers', { method: 'PUT', params: { id }, body: patch })
    // PUT returns the bare row (no stats aggregates) — merge the contact
    // fields into the existing record instead of replacing it
    let merged
    setCustomers(prev => prev.map(c => {
      if (c.id !== id) return c
      merged = { ...c, name: row.name, email: row.email, phone: row.phone, address: row.address, notes: row.notes, updatedAt: row.updated_at }
      return merged
    }))
    return merged
  }, [session?.demo])

  // Deleting a customer with repair orders or invoices also erases them, so the
  // server refuses (409 has_history) unless { force: true } is passed.
  const removeCustomer = useCallback(async (id, { force = false } = {}) => {
    if (session?.demo) {
      const ros = repairOrders.filter(r => r.customerId === id)
      const roIds = new Set(ros.flatMap(r => [r.id, r.roNumber]))
      const linked = invoices.filter(i => i.customerId === id || roIds.has(i.roId)).length
      if (linked > 0) {
        const err = new Error(`This customer has ${linked} invoice${linked === 1 ? '' : 's'}. Invoices are never deleted with a customer. Void them first, or keep the customer.`)
        err.status = 409
        err.data = { code: 'has_invoices', repairOrders: ros.length, invoices: linked, vehicles: 0 }
        throw err
      }
      if (ros.length > 0 && !force) {
        const err = new Error('This customer has repair orders.')
        err.status = 409
        err.data = { code: 'has_history', repairOrders: ros.length, invoices: 0, vehicles: 0 }
        throw err
      }
    } else {
      await api('/api/customers', { method: 'DELETE', params: { id, ...(force ? { force: 'true' } : {}) } })
    }
    setCustomers(prev => prev.filter(c => c.id !== id))
    if (force) setRepairOrders(prev => prev.filter(r => r.customerId !== id))
  }, [session?.demo, repairOrders, invoices])

  // ── customer credit (prepaid balances, deposits, overpayments) ────────────
  // A ledger: every change is an entry and the balance is their sum. A deposit is
  // not revenue until it is applied to an invoice, where it counts as a payment.

  const setCreditBalance = useCallback((customerId, balance) => {
    setCustomers(prev => prev.map(c => (String(c.id) === String(customerId) ? { ...c, creditBalance: balance } : c)))
  }, [])

  /** { balance, entries } for one customer, newest entry first. */
  const loadCustomerCredit = useCallback(async (customerId) => {
    if (session?.demo) {
      const entries = demoLedger[customerId] || []
      return { balance: Math.round(entries.reduce((s, e) => s + e.amount, 0) * 100) / 100, entries }
    }
    return api('/api/customers', { params: { action: 'credit', id: customerId } })
  }, [session?.demo, demoLedger])

  /** Add a deposit or refund some credit. Returns { balance } or throws with a message. */
  const addCustomerCredit = useCallback(async (customerId, { kind, amount, note }) => {
    const amt = Math.round((Number(amount) || 0) * 100) / 100
    if (!(amt > 0)) throw new Error('Enter an amount more than zero')
    if (session?.demo) {
      const have = (demoLedger[customerId] || []).reduce((s, e) => s + e.amount, 0)
      if (kind === 'refund' && amt > have + 0.005) throw new Error('That is more than the credit the customer has')
      const entry = { id: `demo-${Date.now()}-${Math.random()}`, kind, amount: kind === 'refund' ? -amt : amt, note: note || null, created_at: new Date().toISOString(), invoice_number: null }
      const balance = Math.round((have + entry.amount) * 100) / 100
      setDemoLedger(prev => ({ ...prev, [customerId]: [entry, ...(prev[customerId] || [])] }))
      setCreditBalance(customerId, balance)
      return { balance }
    }
    const res = await api('/api/customers', { method: 'POST', params: { action: 'credit' }, body: { customer_id: customerId, kind, amount: amt, note: note || undefined } })
    setCreditBalance(customerId, res.balance)
    return res
  }, [session?.demo, demoLedger, setCreditBalance])

  // ── technician CRUD ──────────────────────────────────────────────────────

  const addTechnician = useCallback(async (tech) => {
    const row = await api('/api/technicians', { method: 'POST', body: tech })
    const transformed = transformTech(row)
    setTechnicians(prev => [...prev, transformed])
    return transformed
  }, [])

  const removeTechnician = useCallback(async (techId) => {
    await api('/api/technicians', { method: 'DELETE', params: { id: techId } })
    setTechnicians(prev => prev.filter(t => t.id !== techId))
  }, [])

  // ── repair order CRUD ────────────────────────────────────────────────────

  // Demo mode: create vehicles locally so New RO flow works without the API
  const addVehicle = useCallback(async (vehicle) => {
    if (session?.demo) {
      return { id: crypto.randomUUID(), ...vehicle }
    }
    return api('/api/vehicles', { method: 'POST', body: vehicle })
  }, [session?.demo])

  const addRepairOrder = useCallback(async (ro) => {
    if (session?.demo) {
      const shopId = ro.shopId || ro.shop_id
      const shop = shops.find(s => String(s.id) === String(shopId))
      const cust = customers.find(c => String(c.id) === String(ro.customerId || ro.customer_id))
      const tech = technicians.find(t => String(t.id) === String(ro.techId || ro.tech_id))
      const now = new Date().toISOString()
      const nextNum = 8900 + repairOrders.length
      const demoRO = {
        id: `RO-${nextNum}`,
        roNumber: `RO-${nextNum}`,
        shopId,
        shopName: shop?.name || '',
        customerId: cust?.id || null,
        customerName: cust?.name || ro.customerName || '',
        customerPhone: cust?.phone || '',
        vehicleId: ro.vehicleId || null,
        vehicle: ro.vehicle || '',
        techId: tech?.id || null,
        techName: tech?.name || 'Unassigned',
        stage: ro.stage && ro.stage !== 'Invoiced' && ro.stage !== 'Paid' ? ro.stage : 'Estimate',
        complaint: ro.complaint || '',
        scheduledAt: ro.scheduledAt || null,
        services: [],
        parts: 0, labor: 0, total: 0,
        payment: null, authorized: false,
        notes: [],
        created: now, updated: now,
      }
      setRepairOrders(prev => [demoRO, ...prev])
      return demoRO
    }
    // Map camelCase frontend fields to snake_case API fields
    const body = {
      shop_id: ro.shopId || ro.shop_id,
      customer_id: ro.customerId || ro.customer_id,
      vehicle_id: ro.vehicleId || ro.vehicle_id || null,
      tech_id: ro.techId || ro.tech_id || null,
      advisor_id: ro.advisorId || ro.advisor_id || null,
      notes: ro.complaint || ro.notes || null,
      scheduled_at: ro.scheduledAt || ro.scheduled_at || null,
      ...(ro.stage && ro.stage !== 'Estimate' ? { stage: ro.stage } : {}),
      // The shop's own day, for the date in the repair order number
      local_date: localYmd().replace(/-/g, ''),
    }
    const row = await api('/api/repair-orders', { method: 'POST', body })
    // The server sends back the bare row; fill in the names the list shows so the
    // new order does not look empty until the next reload
    const techId = ro.techId || ro.tech_id
    const transformed = {
      ...transformRO(row),
      customerName: ro.customerName || customers.find(c => String(c.id) === String(body.customer_id))?.name || '',
      customerEmail: ro.customerEmail || null,
      customerPhone: ro.customerPhone || null,
      vehicle: ro.vehicle || '',
      techName: technicians.find(t => String(t.id) === String(techId))?.name || 'Unassigned',
      shopName: shops.find(s => String(s.id) === String(body.shop_id))?.name || '',
    }
    setRepairOrders(prev => [transformed, ...prev])
    return transformed
  }, [session?.demo, shops, customers, technicians, repairOrders.length])

  const updateRepairOrder = useCallback(async (id, patch) => {
    if (session?.demo) {
      // Demo mode: update local state only, no API call
      setRepairOrders(prev => prev.map(r => r.id === id ? { ...r, ...patch, updated: new Date().toISOString() } : r))
      return { id, ...patch }
    }
    const row = await api('/api/repair-orders', { method: 'PUT', params: { id }, body: patch })
    const transformed = transformRO(row)
    // The server sends back the bare row, without the customer, vehicle, technician
    // and shop names. Keep the ones already on screen (a technician change is the
    // one that must follow the patch).
    const newTechId = patch.tech_id || patch.techId
    setRepairOrders(prev => prev.map(r => {
      if (r.id !== id) return r
      const merged = {
        ...transformed,
        customerName: r.customerName, customerEmail: r.customerEmail, customerPhone: r.customerPhone,
        vehicle: r.vehicle, advisorName: r.advisorName, shopName: r.shopName,
        techName: newTechId ? (technicians.find(t => String(t.id) === String(newTechId))?.name || r.techName) : r.techName,
      }
      return merged
    }))
    return transformed
  }, [session?.demo, technicians])

  const sendEstimateReady = useCallback(() => {
    // placeholder — SMS integration not built yet
  }, [])

  const removeRepairOrder = useCallback(async (id) => {
    if (!session?.demo) {
      // Owner-only server-side; blocks ROs with a paid invoice
      await api('/api/repair-orders', { method: 'DELETE', params: { id } })
    }
    setRepairOrders(prev => prev.filter(r => r.id !== id))
    // Drop any unpaid invoices that pointed at it (server cascades these)
    setInvoices(prev => prev.filter(i => !(i.roId === id && i.status !== 'paid')))
    return { ok: true }
  }, [session?.demo])

  // ── invoices ─────────────────────────────────────────────────────────────

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  const addInvoice = useCallback(async (invoice) => {
    // Real accounts + RO-linked invoice → the DB is the source of truth.
    // POST /api/invoices also moves the RO Complete → Invoiced server-side.
    if (!session?.demo && invoice.roId && UUID_RE.test(String(invoice.roId))) {
      try {
        const row = await api('/api/invoices', { method: 'POST', body: { ro_id: invoice.roId } })
        const entry = {
          ...invoice,
          dbId: row.id,
          status: 'sent',
          created: row.created_at || invoice.created,
          subtotal: Number(row.amount) || invoice.subtotal,
          total: Number(row.amount) || invoice.total,
        }
        setInvoices(prev => [entry, ...prev.filter(i => i.id !== entry.id)])
        setRepairOrders(prev => prev.map(r => r.id === invoice.roId ? { ...r, stage: 'Invoiced' } : r))
        return entry
      } catch {
        // Fall through to local persistence — better a device-local record
        // than a lost invoice; it merges out on next successful fetch
      }
    }
    // Real accounts + invoice made from scratch → saved on the server, which
    // works out the totals. Returns { error } for something the user must fix
    // (a number already used, a bad value, trial ended). Only when the server
    // cannot be reached does a NEW invoice fall back to this computer, so it is
    // never lost; the one-time import moves it up on a later refresh.
    const linkedToRO = !!invoice.roId && UUID_RE.test(String(invoice.roId))
    if (!session?.demo && !linkedToRO) {
      const out = await saveInvoiceToServer({ api, invoice })
      if (out.error) return { error: out.error }
      if (out.entry) {
        const saved = out.entry
        setInvoices(prev => {
          const next = [saved, ...prev.filter(i => i.id !== saved.id && i.dbId !== saved.dbId)]
          save('sc_invoices', next.filter(i => !i.dbId))
          return next
        })
        return saved
      }
      // out.offline: no connection and a new invoice, so keep it on this computer below
    }
    const entry = { status: 'draft', paidAt: null, paymentMethod: null, ...invoice }
    setInvoices(prev => {
      // Same invoice number saved again replaces the earlier draft
      const next = [entry, ...prev.filter(i => i.id !== entry.id)]
      if (!session?.demo) save('sc_invoices', next.filter(i => !i.dbId))
      return next
    })
    return entry
  }, [session?.demo])

  // After an undo or a void the server hands back any credit the invoice had used,
  // so reload that customer's balance (a failure here is harmless: the next load fixes it).
  const refreshCreditBalance = useCallback(async (customerId) => {
    if (!customerId) return
    try {
      const res = await api('/api/customers', { params: { action: 'credit', id: customerId } })
      setCreditBalance(customerId, res.balance)
    } catch { /* ignore */ }
  }, [setCreditBalance])

  // Demo only: give back the credit an invoice used, as the server does
  const returnDemoCredit = useCallback((invoice) => {
    const entry = returnedCreditEntry(invoice)
    if (!entry) return
    const cust = customers.find(c => String(c.id) === String(invoice.customerId)) || customers.find(c => c.name === invoice.customerName)
    if (!cust) return
    const balance = (demoLedger[cust.id] || []).reduce((s, e) => s + e.amount, entry.amount)
    setDemoLedger(prev => ({ ...prev, [cust.id]: [entry, ...(prev[cust.id] || [])] }))
    setCreditBalance(cust.id, Math.round(balance * 100) / 100)
  }, [customers, demoLedger, setCreditBalance])

  // Voided invoices are not part of the invoice list; this reads them on demand
  const loadVoidedInvoices = useCallback(async () => {
    if (session?.demo) return demoVoided
    return voidedInvoiceRows(await api('/api/invoices'), repairOrders)
  }, [session?.demo, demoVoided, repairOrders])

  const voidInvoice = useCallback(async (id) => {
    const target = invoices.find(i => i.id === id)
    if (!target) return { error: 'Invoice not found' }
    if (target.status === 'paid') return { error: 'Paid invoices cannot be voided' }
    if (!session?.demo && target.dbId) {
      try {
        // Server also moves the linked RO back to Complete
        await api('/api/invoices', { method: 'PUT', params: { id: target.dbId }, body: { status: 'void' } })
      } catch (err) {
        return { error: err.message || 'Failed to void invoice' }
      }
      if (Number(target.creditApplied) > 0) refreshCreditBalance(target.customerId)
    }
    if (session?.demo) {
      returnDemoCredit(target)
      setDemoVoided(prev => [target, ...prev])
    }
    setInvoices(prev => {
      const next = prev.filter(i => i.id !== id)
      if (!session?.demo) save('sc_invoices', next.filter(i => !i.dbId))
      return next
    })
    // Reflect the RO reverting to Complete locally
    if (target.roId) {
      setRepairOrders(prev => prev.map(r =>
        (r.id === target.roId || r.roNumber === target.roId) && r.stage === 'Invoiced'
          ? { ...r, stage: 'Complete' }
          : r
      ))
    }
    return { ok: true }
  }, [session?.demo, invoices, refreshCreditBalance, returnDemoCredit])

  // Record a payment against an invoice; partial amounts leave a balance.
  // Returns { ok } or { error }.
  const recordInvoicePayment = useCallback(async (id, amount, method = 'other') => {
    const target = invoices.find(i => i.id === id)
    if (!target) return { error: 'Invoice not found' }
    const total = Number(target.total) || 0
    const already = Number(target.amountPaid) || 0
    const balance = Math.round((total - already) * 100) / 100
    const pay = Math.round((Number(amount) || 0) * 100) / 100
    if (pay <= 0) return { error: 'Payment amount must be greater than zero' }
    if (pay > balance + 0.005) return { error: `Payment exceeds the remaining balance of $${balance.toFixed(2)}` }

    if (!session?.demo && target.dbId) {
      try {
        await api('/api/invoices?action=pay', {
          method: 'POST',
          // The server knows cash and check; a card payment is recorded as "other"
          body: { invoice_id: target.dbId, method: ['cash', 'check'].includes(method) ? method : 'other', amount: pay },
        })
      } catch (err) {
        return { error: err.message || 'Failed to record payment' }
      }
    }
    const newPaid = already + pay
    const full = newPaid >= total - 0.005
    setInvoices(prev => {
      const next = prev.map(i => i.id === id ? {
        ...i,
        amountPaid: newPaid,
        status: full ? 'paid' : 'partial',
        paidAt: full ? new Date().toISOString() : i.paidAt,
        paymentMethod: full ? (i.paymentMethod || (method !== 'other' ? method : 'Recorded manually')) : i.paymentMethod,
      } : i)
      if (!session?.demo) save('sc_invoices', next.filter(i => !i.dbId))
      else save('sc_invoices', next)
      return next
    })
    return { ok: true, paid: full }
  }, [session?.demo, invoices])

  // Use a customer's credit on an invoice. The server does the whole change in one
  // step (ledger entry, payment, invoice). Returns { ok } or { error }.
  const applyInvoiceCredit = useCallback(async (id, amount) => {
    const target = invoices.find(i => i.id === id)
    if (!target) return { error: 'Invoice not found' }
    const amt = Math.round((Number(amount) || 0) * 100) / 100
    if (!(amt > 0)) return { error: 'Enter an amount more than zero' }
    if (session?.demo) {
      const cust = customers.find(c => String(c.id) === String(target.customerId)) || customers.find(c => c.name === target.customerName)
      if (!cust) return { error: 'This invoice has no customer on file' }
      const have = (demoLedger[cust.id] || []).reduce((s, e) => s + e.amount, 0)
      const due = Math.round(((Number(target.total) || 0) - (Number(target.amountPaid) || 0)) * 100) / 100
      if (amt > due + 0.005) return { error: `That is more than the invoice still owes ($${due.toFixed(2)})` }
      if (amt > have + 0.005) return { error: `That is more than the customer's credit ($${have.toFixed(2)})` }
      const entry = { id: `demo-${Date.now()}-${Math.random()}`, kind: 'applied', amount: -amt, note: 'Applied to an invoice', created_at: new Date().toISOString(), invoice_number: target.id }
      setDemoLedger(prev => ({ ...prev, [cust.id]: [entry, ...(prev[cust.id] || [])] }))
      setCreditBalance(cust.id, Math.round((have - amt) * 100) / 100)
      const paid = (Number(target.amountPaid) || 0) + amt
      const full = paid >= (Number(target.total) || 0) - 0.005
      setInvoices(prev => prev.map(i => (i.id === id ? { ...i, amountPaid: paid, creditApplied: (Number(i.creditApplied) || 0) + amt, status: full ? 'paid' : 'partial', paidAt: full ? new Date().toISOString() : i.paidAt, customerId: i.customerId ?? cust.id } : i)))
      return { ok: true, paid: full }
    }
    if (!target.dbId) return { error: 'Save this invoice to your account first' }
    try {
      const res = await api('/api/invoices', { method: 'POST', params: { action: 'apply-credit' }, body: { invoice_id: target.dbId, amount: amt } })
      await fetchAll() // the invoice, its payments and the customer's balance all changed
      return { ok: true, paid: res.paid }
    } catch (err) {
      return { error: err?.message || 'Could not apply the credit' }
    }
  }, [session?.demo, invoices, customers, demoLedger, setCreditBalance, fetchAll])

  // Email the invoice to the customer from {Shop} <invoices@shopcommand.net>.
  // Demo and local-only invoices simulate the send (nothing actually goes out).
  const emailInvoice = useCallback(async (id) => {
    const target = invoices.find(i => i.id === id)
    if (!target) return { error: 'Invoice not found' }
    if (!target.customerEmail) return { error: 'This customer has no email on file. Add one on the Customers page first.' }
    if (session?.demo || !target.dbId) {
      return { ok: true, to: target.customerEmail, simulated: true }
    }
    try {
      const r = await api('/api/invoices?action=email', {
        method: 'POST',
        body: { invoice_id: target.dbId },
      })
      return { ok: true, to: r.to }
    } catch (err) {
      return { error: err.message || 'Failed to send the invoice' }
    }
  }, [session?.demo, invoices])

  const updateInvoice = useCallback(async (id, patch) => {
    const target = invoices.find(i => i.id === id)
    // From-scratch invoice saved on the server: sent and draft are server statuses
    // ('sent' is the server's 'unpaid')
    if (!session?.demo && target?.dbId && !target.roId && (patch.status === 'sent' || patch.status === 'draft')) {
      try {
        await api('/api/invoices', { method: 'PUT', params: { id: target.dbId }, body: { status: patch.status === 'sent' ? 'unpaid' : 'draft' } })
      } catch (err) {
        return { error: err.message || 'Failed to change the invoice status' }
      }
    }
    // DB-backed invoice being paid → record it server-side first
    if (!session?.demo && target?.dbId && patch.status === 'paid') {
      try {
        await api('/api/invoices?action=pay', {
          method: 'POST',
          body: { invoice_id: target.dbId, method: 'other' },
        })
      } catch (err) {
        return { error: err.message || 'Failed to record payment' }
      }
    }
    // Paid → unpaid revert (mistaken payment); server also resets payments
    if (patch.status === 'unpaid') {
      if (session?.demo) returnDemoCredit(target)
      if (!session?.demo && target?.dbId) {
        try {
          await api('/api/invoices', { method: 'PUT', params: { id: target.dbId }, body: { status: 'unpaid' } })
        } catch (err) {
          return { error: err.message || 'Failed to mark unpaid' }
        }
        if (Number(target.creditApplied) > 0) refreshCreditBalance(target.customerId)
      }
      // 'unpaid' is a server status; locally the invoice goes back to sent
      patch = { ...patch, status: 'sent', paidAt: null, amountPaid: 0, creditApplied: 0, paymentMethod: null }
    }
    // DB-backed content edit (services/total/number, no status change) →
    // persist the new amount/number on the invoice and the edited service
    // lines on its RO, since the server stores line detail on the RO.
    if (!session?.demo && target?.dbId && target.roId && patch.status === undefined && (patch.total !== undefined || patch.number !== undefined)) {
      try {
        await api('/api/invoices', {
          method: 'PUT',
          params: { id: target.dbId },
          body: {
            ...(patch.total !== undefined ? { amount: patch.total } : {}),
            ...(patch.number !== undefined ? { number: patch.number } : {}),
          },
        })
      } catch (err) {
        return { error: err.message || 'Failed to update invoice' }
      }
      if (patch.services) {
        const ro = repairOrders.find(r => r.id === target.roId || r.roNumber === target.roId)
        if (ro) {
          try {
            // The invoice's editable rows already include the RO's parts as
            // lines, so write the full list as services and clear partsUsed —
            // leaving both would double-count on the next load
            await updateRepairOrder(ro.id, {
              services: patch.services.map(s => ({ name: s.name, price: (Number(s.parts) || 0) + (Number(s.labor) || 0) })),
              ...(ro.partsUsed?.length ? { partsUsed: [] } : {}),
              // Keep the repair order total equal to the invoice amount so
              // revenue and later invoices do not use a stale figure
              ...(patch.total !== undefined ? { total: patch.total } : {}),
            })
          } catch (_) { /* amount persisted; service names refresh from RO on next load */ }
        }
      }
    }
    // Contact edits write through to the customer record (name/email live
    // there, not on the invoice); demo mode updates its local customer
    if ((patch.customerName !== undefined || patch.customerEmail !== undefined) && target?.customerId) {
      try {
        await updateCustomer(target.customerId, {
          ...(patch.customerName !== undefined ? { name: patch.customerName } : {}),
          ...(patch.customerEmail !== undefined ? { email: patch.customerEmail } : {}),
        })
      } catch (err) {
        return { error: err.message || 'Failed to update customer info' }
      }
    }
    // A new number becomes the invoice's display id locally
    if (patch.number !== undefined) patch = { ...patch, id: patch.number }
    setInvoices(prev => {
      const next = prev.map(i => i.id === id ? { ...i, ...patch } : i)
      if (!session?.demo) save('sc_invoices', next.filter(i => !i.dbId))
      return next
    })
    return { ok: true }
  }, [session?.demo, invoices, repairOrders, updateRepairOrder, updateCustomer, refreshCreditBalance, returnDemoCredit])

  // ── clock in/out ─────────────────────────────────────────────────────────

  const clockIn = useCallback(async (techId) => {
    try {
      await api('/api/time-entries', { method: 'POST', body: { tech_id: techId } })
      setClockedInTechs(prev => {
        const next = new Set(prev)
        next.add(techId)
        return next
      })
    } catch (err) {
      return { error: err.message }
    }
  }, [])

  const clockOut = useCallback(async (techId) => {
    // Find the open time entry for this tech
    try {
      const entries = await api('/api/time-entries', { params: { tech_id: techId } })
      const open = entries.find(e => !e.clock_out)
      if (open) {
        await api('/api/time-entries', { method: 'PUT', params: { id: open.id } })
      }
      setClockedInTechs(prev => {
        const next = new Set(prev)
        next.delete(techId)
        return next
      })
    } catch (err) {
      return { error: err.message }
    }
  }, [])

  // ── notifications (localStorage only) ────────────────────────────────────

  const addNotification = useCallback((notification) => {
    const n = { id: crypto.randomUUID(), read: false, createdAt: new Date().toISOString(), ...notification }
    setNotifications(prev => {
      const next = [n, ...prev].slice(0, 100)
      save('sc_notifications', next)
      return next
    })
  }, [])

  const markNotificationsRead = useCallback(() => {
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, read: true }))
      save('sc_notifications', next)
      return next
    })
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
    save('sc_notifications', [])
  }, [])

  // ── parts inventory ──────────────────────────────────────────────────────

  const addPart = useCallback(async (part) => {
    if (session?.demo) {
      setParts(prev => {
        const next = [...prev, { ...part, id: crypto.randomUUID(), lastOrdered: null }]
        save('sc_parts', next)
        return next
      })
      return
    }
    const row = await api('/api/health?action=add-part', {
      method: 'POST',
      body: { shop_id: part.shopId, name: part.name, sku: part.sku, category: part.category, vendor: part.vendor, qty: part.qty, min_qty: part.minQty, cost: part.cost, price: part.price },
    })
    const transformed = { ...row, shopId: row.shop_id, minQty: row.min_qty, lastOrdered: row.last_ordered, name: row.name || '', sku: row.sku || '', category: row.category || '', vendor: row.vendor || '', cost: Number(row.cost || 0), price: Number(row.price || 0), qty: Number(row.qty || 0) }
    setParts(prev => [...prev, transformed])
  }, [session?.demo])

  const updatePart = useCallback(async (id, patch) => {
    if (session?.demo) {
      setParts(prev => {
        const next = prev.map(p => p.id === id ? { ...p, ...patch } : p)
        save('sc_parts', next)
        return next
      })
      return
    }
    const row = await api('/api/health?action=update-part', {
      method: 'PUT',
      params: { id },
      body: { name: patch.name, sku: patch.sku, category: patch.category, vendor: patch.vendor, qty: patch.qty, min_qty: patch.minQty, cost: patch.cost, price: patch.price },
    })
    const transformed = { ...row, shopId: row.shop_id, minQty: row.min_qty, lastOrdered: row.last_ordered, name: row.name || '', sku: row.sku || '', category: row.category || '', vendor: row.vendor || '', cost: Number(row.cost || 0), price: Number(row.price || 0), qty: Number(row.qty || 0) }
    setParts(prev => prev.map(p => p.id === id ? transformed : p))

    // Low stock notification
    const oldPart = parts.find(p => p.id === id)
    if (oldPart && 'qty' in patch) {
      const newQty = Number(patch.qty)
      const minQty = 'minQty' in patch ? Number(patch.minQty) : oldPart.minQty
      if (newQty <= minQty && oldPart.qty > minQty) {
        addNotification({ type: 'low_stock', partName: oldPart.name, qty: newQty, minQty, shopId: oldPart.shopId })
      }
    }
  }, [session?.demo, parts, addNotification])

  const deletePart = useCallback(async (id) => {
    if (session?.demo) {
      setParts(prev => {
        const next = prev.filter(p => p.id !== id)
        save('sc_parts', next)
        return next
      })
      return
    }
    await api('/api/health?action=delete-part', { method: 'DELETE', params: { id } })
    setParts(prev => prev.filter(p => p.id !== id))
  }, [session?.demo])

  const usePart = useCallback((partId, qty = 1) => {
    setParts(prev => {
      const part = prev.find(p => p.id === partId)
      if (!part) return prev
      const newQty = Math.max(0, part.qty - qty)
      const next = prev.map(p => p.id === partId ? { ...p, qty: newQty } : p)
      save('sc_parts', next)
      if (!session?.demo) {
        api('/api/health?action=update-part', { method: 'PUT', params: { id: partId }, body: { qty: newQty } }).catch(() => {})
      }
      if (newQty <= part.minQty && part.qty > part.minQty) {
        setTimeout(() => addNotification({
          type: 'low_stock',
          partName: part.name,
          qty: newQty,
          minQty: part.minQty,
          shopId: part.shopId,
        }), 0)
      }
      return next
    })
  }, [addNotification, session?.demo])

  const restockPart = useCallback((partId, qty = 1) => {
    setParts(prev => {
      const part = prev.find(p => p.id === partId)
      if (!part) return prev
      const newQty = part.qty + qty
      const next = prev.map(p => p.id === partId ? { ...p, qty: newQty } : p)
      save('sc_parts', next)
      if (!session?.demo) {
        api('/api/health?action=update-part', { method: 'PUT', params: { id: partId }, body: { qty: newQty } }).catch(() => {})
      }
      return next
    })
  }, [session?.demo])

  const orderPart = useCallback((partId) => {
    const today = localYmd()
    setParts(prev => {
      const next = prev.map(p => p.id === partId ? { ...p, lastOrdered: today } : p)
      save('sc_parts', next)
      if (!session?.demo) {
        api('/api/health?action=update-part', { method: 'PUT', params: { id: partId }, body: { last_ordered: today } }).catch(() => {})
      }
      return next
    })
  }, [session?.demo])

  const addPartsOrder = useCallback((order) => {
    const entry = { id: crypto.randomUUID(), status: 'ordered', requestedAt: new Date().toISOString(), supplier: '', eta: '', carrier: '', trackingNumber: '', ...order }
    setPartsOrders(prev => {
      const next = [entry, ...prev]
      if (session?.demo) save('sc_parts_orders', next)
      return next
    })
    if (session?.demo) return entry
    // Persist server-side; swap the optimistic entry for the DB row so later
    // updates target a real id
    api('/api/health?action=add-parts-order', {
      method: 'POST',
      body: {
        shop_id: order.shopId || null,
        name: order.name,
        part_number: order.partNumber || null,
        qty: order.qty || 1,
        requested_by: session?.name || null,
      },
    }).then(row => {
      setPartsOrders(prev => prev.map(o => o.id === entry.id ? { ...transformPartsOrder(row), shopName: order.shopName, partId: order.partId } : o))
    }).catch(() => { /* optimistic entry stays for this session */ })
    return entry
  }, [session?.demo, session?.name])

  const updatePartsOrder = useCallback((id, patch) => {
    setPartsOrders(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o))
    if (session?.demo) return
    api('/api/health?action=update-parts-order', {
      method: 'PUT',
      params: { id },
      body: {
        status: patch.status,
        supplier: patch.supplier,
        eta: patch.eta,
        carrier: patch.carrier,
        tracking_number: patch.trackingNumber,
        qty: patch.qty,
      },
    }).catch(() => {})
  }, [session?.demo])

  const deletePartsOrder = useCallback((id) => {
    setPartsOrders(prev => prev.filter(o => o.id !== id))
    if (session?.demo) return
    api('/api/health?action=delete-parts-order', { method: 'DELETE', params: { id } }).catch(() => {})
  }, [session?.demo])

  // ── job timers ────────────────────────────────────────────────────────────

  const persistTimers = useCallback((roId, timersForRO) => {
    if (!session?.demo) {
      api('/api/repair-orders', { method: 'PUT', params: { id: roId }, body: { jobTimers: timersForRO } }).catch(() => {})
    }
  }, [session?.demo])

  const startJobTimer = useCallback((roId, svcIdx) => {
    setJobTimers(prev => {
      const key = `${roId}_${svcIdx}`
      const existing = prev[key] || { totalMs: 0, startedAt: null }
      if (existing.startedAt) return prev
      const updated = { ...existing, startedAt: new Date().toISOString() }
      const next = { ...prev, [key]: updated }
      save('sc_job_timers', next)
      const roTimers = Object.fromEntries(Object.entries(next).filter(([k]) => k.startsWith(roId)))
      persistTimers(roId, roTimers)
      return next
    })
  }, [persistTimers])

  const stopJobTimer = useCallback((roId, svcIdx) => {
    setJobTimers(prev => {
      const key = `${roId}_${svcIdx}`
      const existing = prev[key]
      if (!existing?.startedAt) return prev
      const elapsed = Date.now() - new Date(existing.startedAt).getTime()
      const updated = { totalMs: existing.totalMs + elapsed, startedAt: null }
      const next = { ...prev, [key]: updated }
      save('sc_job_timers', next)
      const roTimers = Object.fromEntries(Object.entries(next).filter(([k]) => k.startsWith(roId)))
      persistTimers(roId, roTimers)
      return next
    })
  }, [persistTimers])

  // ── reset (dev helper) ────────────────────────────────────────────────────

  const resetData = useCallback(() => {
    setParts(initialParts)
    setJobTimers({})
    setNotifications([])
    localStorage.removeItem('sc_parts')
    localStorage.removeItem('sc_job_timers')
    localStorage.removeItem('sc_notifications')
    fetchAll()
  }, [fetchAll])

  // Each shop's revenue (today, month, year) also counts its paid from-scratch
  // invoices. The server figure only covers repair orders, so a shop that bills
  // with the invoice generator read $0 in Reports. Only the revenue figures are
  // changed; the stored shops stay as the server sent them.
  const shopsWithInvoiceRevenue = useMemo(() => {
    const today = localYmd()
    return shops.map(s => {
      const extra = invoiceRevenueTotals(invoices, today, s.id)
      if (!extra.today && !extra.mtd && !extra.ytd) return s
      const base = s.revenue || { today: 0, mtd: 0, ytd: 0 }
      return { ...s, revenue: { today: base.today + extra.today, mtd: base.mtd + extra.mtd, ytd: base.ytd + extra.ytd } }
    })
  }, [shops, invoices])

  return (
    <DataContext.Provider value={{
      customers, addCustomer, updateCustomer, removeCustomer,
      loadCustomerCredit, addCustomerCredit, applyInvoiceCredit,
      technicians, addTechnician, removeTechnician,
      repairOrders, addRepairOrder, updateRepairOrder, removeRepairOrder, sendEstimateReady, addVehicle,
      shops: shopsWithInvoiceRevenue, updateShop, addShop, removeShop,
      parts, addPart, updatePart, deletePart, usePart, restockPart, orderPart,
      partsOrders, addPartsOrder, updatePartsOrder, deletePartsOrder,
      jobTimers, startJobTimer, stopJobTimer,
      clockedInTechs, clockIn, clockOut, timeEntries, payments,
      invoices, loadVoidedInvoices, addInvoice, updateInvoice, voidInvoice, recordInvoicePayment, emailInvoice,
      invoiceImport, dismissInvoiceImport,
      notifications, addNotification, markNotificationsRead, clearNotifications,
      cannedServices,
      resetData, loading, fetchAll, fetchError,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}
