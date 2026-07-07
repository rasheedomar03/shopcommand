import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth as useClerkAuth } from '@clerk/clerk-react'
import { useAuth } from '@/contexts/AuthContext'
import { api, setTokenProvider } from '@/lib/api'
import { setUploadTokenProvider } from '@/lib/uploads'
import {
  parts as initialParts,
  cannedServices,
  shops as mockShops,
  technicians as mockTechnicians,
  repairOrders as mockRepairOrders,
  customers as mockCustomers,
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
    monthlyTarget: 0,
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
    setShops(mockShops)
    setTechnicians(mockTechnicians)
    setRepairOrders(demoROs)
    // Re-base stale lastVisit dates so demo customers look recently active
    setCustomers(mockCustomers.map((c, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - ((i * 7) % 45) - 1)
      return { ...c, lastVisit: d.toISOString().slice(0, 10) }
    }))
    setClockedInTechs(new Set(mockTechnicians.slice(0, 8).map(t => t.id)))
    setLoading(false)
  }, [session?.demo])

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
      const [shopsData, techsData, rosData, custData, paymentsData, partsData] = await Promise.all([
        guard(api('/api/shops')),
        guard(api('/api/technicians')),
        guard(api('/api/repair-orders')),
        guard(api('/api/customers')),
        api('/api/invoices?action=payments').catch(() => []),
        api('/api/health?action=parts').catch(() => null),
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
  }, [session?.onboarded, session?.demo, session?.clerkId])

  useEffect(() => {
    if (tokenInjected.current && session?.onboarded && !session?.demo) {
      fetchAll()
    }
  }, [fetchAll, session?.onboarded, session?.demo, session?.clerkId])

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
    const row = await api('/api/shops', { method: 'POST', body: shop })
    const transformed = transformShop(row)
    setShops(prev => [...prev, transformed])
    return transformed
  }, [])

  const updateShop = useCallback(async (id, patch) => {
    const row = await api('/api/shops', { method: 'PUT', params: { id }, body: patch })
    const transformed = transformShop(row)
    setShops(prev => prev.map(s => s.id === id ? transformed : s))
    return transformed
  }, [])

  const removeShop = useCallback(async (id) => {
    await api('/api/shops', { method: 'DELETE', params: { id } })
    setShops(prev => prev.filter(s => s.id !== id))
  }, [])

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
        lastVisit: new Date().toISOString().slice(0, 10),
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
    const row = await api('/api/customers', { method: 'PUT', params: { id }, body: patch })
    const transformed = transformCustomer(row)
    setCustomers(prev => prev.map(c => c.id === id ? transformed : c))
    return transformed
  }, [])

  const removeCustomer = useCallback(async (id) => {
    await api('/api/customers', { method: 'DELETE', params: { id } })
    setCustomers(prev => prev.filter(c => c.id !== id))
  }, [])

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
        stage: 'Estimate',
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
    }
    const row = await api('/api/repair-orders', { method: 'POST', body })
    const transformed = transformRO(row)
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
    setRepairOrders(prev => prev.map(r => r.id === id ? transformed : r))
    return transformed
  }, [session?.demo])

  const sendEstimateReady = useCallback(() => {
    // placeholder — SMS integration not built yet
  }, [])

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
    const transformed = { ...row, shopId: row.shop_id, minQty: row.min_qty, lastOrdered: row.last_ordered, cost: Number(row.cost || 0), price: Number(row.price || 0), qty: Number(row.qty || 0) }
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
    const transformed = { ...row, shopId: row.shop_id, minQty: row.min_qty, lastOrdered: row.last_ordered, cost: Number(row.cost || 0), price: Number(row.price || 0), qty: Number(row.qty || 0) }
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
    const today = new Date().toISOString().slice(0, 10)
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
      save('sc_parts_orders', next)
      return next
    })
    return entry
  }, [])

  const updatePartsOrder = useCallback((id, patch) => {
    setPartsOrders(prev => {
      const next = prev.map(o => o.id === id ? { ...o, ...patch } : o)
      save('sc_parts_orders', next)
      return next
    })
  }, [])

  const deletePartsOrder = useCallback((id) => {
    setPartsOrders(prev => {
      const next = prev.filter(o => o.id !== id)
      save('sc_parts_orders', next)
      return next
    })
  }, [])

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

  return (
    <DataContext.Provider value={{
      customers, addCustomer, updateCustomer, removeCustomer,
      technicians, addTechnician, removeTechnician,
      repairOrders, addRepairOrder, updateRepairOrder, sendEstimateReady, addVehicle,
      shops, updateShop, addShop, removeShop,
      parts, addPart, updatePart, deletePart, usePart, restockPart, orderPart,
      partsOrders, addPartsOrder, updatePartsOrder, deletePartsOrder,
      jobTimers, startJobTimer, stopJobTimer,
      clockedInTechs, clockIn, clockOut, timeEntries, payments,
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
