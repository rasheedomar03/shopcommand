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
    // UI fields not in DB yet — safe defaults
    openROs: 0,
    revenue: { today: 0, mtd: 0, ytd: 0 },
    avgTicket: 0,
    efficiency: 0,
    activeTechs: 0,
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
  }
}

function transformRO(ro) {
  return {
    ...ro,
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
  }
}

function transformCustomer(c) {
  return {
    ...c,
    orgId: c.org_id,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
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

  // ── localStorage-only state (no API yet) ─────────────────────────────────
  const [parts, setParts] = useState(() => load('sc_parts', initialParts))
  const [jobTimers, setJobTimers] = useState(() => load('sc_job_timers', {}))
  const [notifications, setNotifications] = useState(() => load('sc_notifications', []))

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
    setCustomers(mockCustomers)
    setClockedInTechs(new Set(mockTechnicians.slice(0, 8).map(t => t.id)))
    setLoading(false)
  }, [session?.demo])

  // ── Fetch all data from API when session is ready ────────────────────────
  const fetchAll = useCallback(async () => {
    if (!session?.onboarded || session?.demo) return
    setLoading(true)
    try {
      const [shopsData, techsData, rosData, custData, paymentsData] = await Promise.all([
        api('/api/shops').catch(() => []),
        api('/api/technicians').catch(() => []),
        api('/api/repair-orders').catch(() => []),
        api('/api/customers').catch(() => []),
        api('/api/invoices?action=payments').catch(() => []),
      ])
      setShops(shopsData.map(transformShop))
      setTechnicians(techsData.map(transformTech))
      setRepairOrders(rosData.map(transformRO))
      setCustomers(custData.map(transformCustomer))
      setPayments(paymentsData)

      // Derive clocked-in techs from technician data
      const clockedIn = new Set()
      for (const t of techsData) {
        if (t.clocked_in_since) clockedIn.add(t.id)
      }
      setClockedInTechs(clockedIn)
    } catch {
      // silent — individual catches above prevent full failure
    } finally {
      setLoading(false)
    }
  }, [session?.onboarded, session?.demo])

  useEffect(() => {
    if (tokenInjected.current && session?.onboarded && !session?.demo) {
      fetchAll()
    }
  }, [fetchAll, session?.onboarded, session?.demo])

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
    const row = await api('/api/customers', { method: 'POST', body: cust })
    const transformed = transformCustomer(row)
    setCustomers(prev => [transformed, ...prev])
    return transformed
  }, [])

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

  const addRepairOrder = useCallback(async (ro) => {
    const row = await api('/api/repair-orders', { method: 'POST', body: ro })
    const transformed = transformRO(row)
    setRepairOrders(prev => [transformed, ...prev])
    return transformed
  }, [])

  const updateRepairOrder = useCallback(async (id, patch) => {
    const row = await api('/api/repair-orders', { method: 'PUT', params: { id }, body: patch })
    const transformed = transformRO(row)
    setRepairOrders(prev => prev.map(r => r.id === id ? transformed : r))
    return transformed
  }, [])

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

  // ── parts inventory (localStorage only — no API yet) ─────────────────────

  const addPart = useCallback((part) => {
    setParts(prev => {
      const next = [...prev, { ...part, id: crypto.randomUUID(), lastOrdered: null }]
      save('sc_parts', next)
      return next
    })
  }, [])

  const updatePart = useCallback((id, patch) => {
    setParts(prev => {
      const part = prev.find(p => p.id === id)
      const next = prev.map(p => p.id === id ? { ...p, ...patch } : p)
      save('sc_parts', next)
      if (part && 'qty' in patch) {
        const newQty = Number(patch.qty)
        const minQty = 'minQty' in patch ? Number(patch.minQty) : part.minQty
        if (newQty <= minQty && part.qty > minQty) {
          setTimeout(() => addNotification({
            type: 'low_stock',
            partName: part.name,
            qty: newQty,
            minQty,
            shopId: part.shopId,
          }), 0)
        }
      }
      return next
    })
  }, [addNotification])

  const deletePart = useCallback((id) => {
    setParts(prev => {
      const next = prev.filter(p => p.id !== id)
      save('sc_parts', next)
      return next
    })
  }, [])

  const usePart = useCallback((partId, qty = 1) => {
    setParts(prev => {
      const part = prev.find(p => p.id === partId)
      if (!part) return prev
      const newQty = Math.max(0, part.qty - qty)
      const next = prev.map(p => p.id === partId ? { ...p, qty: newQty } : p)
      save('sc_parts', next)
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
  }, [addNotification])

  const restockPart = useCallback((partId, qty = 1) => {
    setParts(prev => {
      const next = prev.map(p => p.id === partId ? { ...p, qty: p.qty + qty } : p)
      save('sc_parts', next)
      return next
    })
  }, [])

  const orderPart = useCallback((partId) => {
    setParts(prev => {
      const next = prev.map(p => p.id === partId ? { ...p, lastOrdered: new Date().toISOString().slice(0, 10) } : p)
      save('sc_parts', next)
      return next
    })
  }, [])

  // ── job timers (localStorage only) ───────────────────────────────────────

  const startJobTimer = useCallback((roId, svcIdx) => {
    setJobTimers(prev => {
      const key = `${roId}_${svcIdx}`
      const existing = prev[key] || { totalMs: 0, startedAt: null }
      if (existing.startedAt) return prev
      const next = { ...prev, [key]: { ...existing, startedAt: new Date().toISOString() } }
      save('sc_job_timers', next)
      return next
    })
  }, [])

  const stopJobTimer = useCallback((roId, svcIdx) => {
    setJobTimers(prev => {
      const key = `${roId}_${svcIdx}`
      const existing = prev[key]
      if (!existing?.startedAt) return prev
      const elapsed = Date.now() - new Date(existing.startedAt).getTime()
      const next = { ...prev, [key]: { totalMs: existing.totalMs + elapsed, startedAt: null } }
      save('sc_job_timers', next)
      return next
    })
  }, [])

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
      repairOrders, addRepairOrder, updateRepairOrder, sendEstimateReady,
      shops, updateShop, addShop, removeShop,
      parts, addPart, updatePart, deletePart, usePart, restockPart, orderPart,
      jobTimers, startJobTimer, stopJobTimer,
      clockedInTechs, clockIn, clockOut, timeEntries, payments,
      notifications, addNotification, markNotificationsRead, clearNotifications,
      cannedServices,
      resetData, loading, fetchAll,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}
