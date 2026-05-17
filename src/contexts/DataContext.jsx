/**
 * DataContext — mutable in-memory store for technicians and repairOrders.
 * Both are persisted to localStorage so changes survive refresh and are
 * shared between the owner dashboard and the tech board.
 *
 * Everything else (shops, customers, parts, alerts) is still imported
 * directly from mock.js because we're not adding CRUD for those yet.
 */
import { createContext, useContext, useState } from 'react'
import {
  technicians as initialTechnicians,
  repairOrders as initialRepairOrders,
  parts as initialParts,
  shops as initialShops,
  customers,
} from '@/data/mock'

// SMS templates fired on stage transitions.
// PRODUCTION: replace console.log block with → POST /api/sms/send
const SMS_TEMPLATES = {
  'Estimate':       (ro, shop) => `Hi! ${shop.name} has received your vehicle and is preparing an estimate for your ${ro.vehicle}. We'll text you shortly with details.`,
  'EstimateReady':  (ro, shop, total) => `Your estimate for your ${ro.vehicle} is ready — $${Number(total).toFixed(2)}. Reply YES to approve or call us at ${shop.phone}. — ${shop.name}`,
  'Approved':      (ro, shop) => `Hi! We've approved the estimate for your ${ro.vehicle} — $${ro.total}. Work begins shortly. — ${shop.name}`,
  'Waiting Parts': (ro, shop) => `Update on your ${ro.vehicle}: parts have been ordered and we'll text you when they arrive. — ${shop.name}`,
  'In Progress':   (ro, shop) => `Your ${ro.vehicle} is now being worked on. We'll text you when it's ready. — ${shop.name}`,
  'Complete':      (ro, shop) => `Great news! Your ${ro.vehicle} is ready for pickup at ${shop.name}. See you soon!`,
  'Invoiced':      (ro, shop) => `Your invoice is ready — $${ro.total} for your ${ro.vehicle}. ${shop.name} will send a payment link shortly.`,
  'Paid':          (ro, shop) => `Payment received. Thanks for choosing ${shop.name}! Drive safe.`,
}

function fmt12(time24) {
  if (!time24) return ''
  const [h, m] = time24.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

const DataContext = createContext(null)

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
  const [technicians, setTechnicians] = useState(() =>
    load('sc_technicians', initialTechnicians)
  )
  const [repairOrders, setRepairOrders] = useState(() =>
    load('sc_ros', initialRepairOrders)
  )
  const [clockedInTechs, setClockedInTechs] = useState(() =>
    new Set(load('sc_clocked_in', []))
  )
  const [timeEntries, setTimeEntries] = useState(() =>
    load('sc_time_entries', [])
  )
  const [parts, setParts] = useState(() =>
    load('sc_parts', initialParts)
  )
  const [jobTimers, setJobTimers] = useState(() =>
    load('sc_job_timers', {})
  )
  const [shops, setShops] = useState(() =>
    load('sc_shops', initialShops)
  )
  const [notifications, setNotifications] = useState(() =>
    load('sc_notifications', [])
  )

  // ── SMS helpers ───────────────────────────────────────────────────────────

  const triggerStageSMS = (ro, newStage) => {
    const template = SMS_TEMPLATES[newStage]
    if (!template) return
    const shop     = shops.find(s => s.id === ro.shopId)
    const customer = customers.find(c => c.name === ro.customerName)
    if (!shop || !customer) return
    // ─── PRODUCTION: swap this block for a real API call ───────────────────
    // await fetch('/api/sms/send', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ to: customer.phone, from: shop.twilioPhone, body }),
    // })
    // ───────────────────────────────────────────────────────────────────────
    // POST /api/sms/send when backend is ready
    // { to: customer.phone, from: shop.twilioPhone, body: template(ro, shop) }
  }

  // ── notifications ─────────────────────────────────────────────────────────

  const addNotification = (notification) => {
    const n = { id: crypto.randomUUID(), read: false, createdAt: new Date().toISOString(), ...notification }
    setNotifications(prev => {
      const next = [n, ...prev].slice(0, 100)
      save('sc_notifications', next)
      return next
    })
  }

  const markNotificationsRead = () => {
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, read: true }))
      save('sc_notifications', next)
      return next
    })
  }

  const clearNotifications = () => {
    setNotifications([])
    save('sc_notifications', [])
  }

  // ── shop CRUD ─────────────────────────────────────────────────────────────

  const updateShop = (id, patch) => {
    const next = shops.map(s => s.id === id ? { ...s, ...patch } : s)
    setShops(next)
    save('sc_shops', next)
  }

  const addShop = (shop) => {
    const newShop = {
      ...shop,
      id: crypto.randomUUID(),
      openROs: 0,
      revenue: { today: 0, mtd: 0, ytd: 0 },
      avgTicket: 0,
      efficiency: 0,
      activeTechs: 0,
      status: 'open',
      monthlyTarget: shop.monthlyTarget || 0,
      hours: {
        mon: { open: '08:00', close: '18:00', closed: false },
        tue: { open: '08:00', close: '18:00', closed: false },
        wed: { open: '08:00', close: '18:00', closed: false },
        thu: { open: '08:00', close: '18:00', closed: false },
        fri: { open: '08:00', close: '18:00', closed: false },
        sat: { open: '09:00', close: '14:00', closed: false },
        sun: { open: '09:00', close: '14:00', closed: true },
      },
      clockInBufferMins: 15,
      maxShiftHours: 12,
      maxShiftAction: 'alert',
    }
    const next = [...shops, newShop]
    setShops(next)
    save('sc_shops', next)
    return newShop
  }

  const removeShop = (id) => {
    const next = shops.filter(s => s.id !== id)
    setShops(next)
    save('sc_shops', next)
  }

  // ── technician CRUD ────────────────────────────────────────────────────────

  const addTechnician = (tech) => {
    const next = [
      ...technicians,
      { ...tech, id: crypto.randomUUID(), activeROs: 0, completedToday: 0, hoursWorked: 0 },
    ]
    setTechnicians(next)
    save('sc_technicians', next)
  }

  const removeTechnician = (techId) => {
    const next = technicians.filter(t => t.id !== techId)
    setTechnicians(next)
    save('sc_technicians', next)
  }

  // ── repairOrder CRUD ───────────────────────────────────────────────────────

  const addRepairOrder = (ro) => {
    const newRO = {
      ...ro,
      id: `RO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      parts: 0,
      labor: 0,
      total: 0,
      payment: null,
      authorized: false,
      notes: [],
      services: ro.services || [],
      mpi: ro.mpi || null,
    }
    const next = [newRO, ...repairOrders]
    setRepairOrders(next)
    save('sc_ros', next)
    triggerStageSMS(newRO, 'Estimate')
    return newRO
  }

  const sendEstimateReady = (roId, total) => {
    const ro       = repairOrders.find(r => r.id === roId)
    const shop     = ro ? shops.find(s => s.id === ro.shopId) : null
    const customer = ro ? customers.find(c => c.name === ro.customerName) : null
    if (!ro || !shop || !customer) return
    const body = SMS_TEMPLATES['EstimateReady'](ro, shop, total)
    // POST /api/sms/send when backend is ready
    // { to: customer.phone, from: shop.twilioPhone, body }
  }

  const updateRepairOrder = (id, patch) => {
    const existing = repairOrders.find(ro => ro.id === id)
    if (existing && patch.stage && patch.stage !== existing.stage) {
      triggerStageSMS(existing, patch.stage)
    }
    const next = repairOrders.map(ro => ro.id === id ? { ...ro, ...patch, updated: new Date().toISOString() } : ro)
    setRepairOrders(next)
    save('sc_ros', next)
  }

  // ── parts inventory ───────────────────────────────────────────────────────

  const addPart = (part) => {
    const next = [...parts, { ...part, id: crypto.randomUUID(), lastOrdered: null }]
    setParts(next)
    save('sc_parts', next)
  }

  const updatePart = (id, patch) => {
    const part = parts.find(p => p.id === id)
    const next = parts.map(p => p.id === id ? { ...p, ...patch } : p)
    setParts(next)
    save('sc_parts', next)
    // Notify if a manual qty edit just crossed below minimum
    if (part && 'qty' in patch) {
      const newQty   = Number(patch.qty)
      const minQty   = 'minQty' in patch ? Number(patch.minQty) : part.minQty
      if (newQty <= minQty && part.qty > minQty) {
        addNotification({
          type:     'low_stock',
          partName: part.name,
          qty:      newQty,
          minQty,
          shopId:   part.shopId,
        })
      }
    }
  }

  const deletePart = (id) => {
    const next = parts.filter(p => p.id !== id)
    setParts(next)
    save('sc_parts', next)
  }

  const usePart = (partId, qty = 1) => {
    setParts(prev => {
      const part   = prev.find(p => p.id === partId)
      if (!part) return prev
      const newQty = Math.max(0, part.qty - qty)
      const next   = prev.map(p => p.id === partId ? { ...p, qty: newQty } : p)
      save('sc_parts', next)
      if (newQty <= part.minQty && part.qty > part.minQty) {
        setTimeout(() => addNotification({
          type:     'low_stock',
          partName: part.name,
          qty:      newQty,
          minQty:   part.minQty,
          shopId:   part.shopId,
        }), 0)
      }
      return next
    })
  }

  const restockPart = (partId, qty = 1) => {
    setParts(prev => {
      const next = prev.map(p => p.id === partId ? { ...p, qty: p.qty + qty } : p)
      save('sc_parts', next)
      return next
    })
  }

  const orderPart = (partId) => {
    setParts(prev => {
      const next = prev.map(p => p.id === partId ? { ...p, lastOrdered: new Date().toISOString().slice(0, 10) } : p)
      save('sc_parts', next)
      return next
    })
  }

  // ── job timers ────────────────────────────────────────────────────────────

  const startJobTimer = (roId, svcIdx) => {
    setJobTimers(prev => {
      const key = `${roId}_${svcIdx}`
      const existing = prev[key] || { totalMs: 0, startedAt: null }
      if (existing.startedAt) return prev  // already running
      const next = { ...prev, [key]: { ...existing, startedAt: new Date().toISOString() } }
      save('sc_job_timers', next)
      return next
    })
  }

  const stopJobTimer = (roId, svcIdx) => {
    setJobTimers(prev => {
      const key = `${roId}_${svcIdx}`
      const existing = prev[key]
      if (!existing?.startedAt) return prev
      const elapsed = Date.now() - new Date(existing.startedAt).getTime()
      const next = { ...prev, [key]: { totalMs: existing.totalMs + elapsed, startedAt: null } }
      save('sc_job_timers', next)
      return next
    })
  }

  // ── clock in/out ──────────────────────────────────────────────────────────

  const clockIn = (techId) => {
    const tech = technicians.find(t => t.id === techId)
    const shop = shops.find(s => s.id === tech?.shopId)

    if (shop?.hours) {
      const now  = new Date()
      const keys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
      const day  = shop.hours[keys[now.getDay()]]

      if (day?.closed) {
        return { error: 'Shop is closed today — clock-in is not allowed.' }
      }

      if (day?.open && day?.close) {
        const bufferMins = shop.clockInBufferMins ?? 15
        const [openH, openM]   = day.open.split(':').map(Number)
        const [closeH, closeM] = day.close.split(':').map(Number)

        const allowedTotalM = openH * 60 + openM - bufferMins
        const allowedAt = new Date(now)
        allowedAt.setHours(Math.floor(allowedTotalM / 60), allowedTotalM % 60, 0, 0)

        const closeAt = new Date(now)
        closeAt.setHours(closeH, closeM, 0, 0)

        if (now < allowedAt) {
          const allowedStr = fmt12(`${String(Math.floor(allowedTotalM / 60)).padStart(2,'0')}:${String(allowedTotalM % 60).padStart(2,'0')}`)
          return { error: `Clock-in opens at ${allowedStr} (${bufferMins} min before ${fmt12(day.open)}).` }
        }

        if (now > closeAt) {
          return { error: `Shop closed at ${fmt12(day.close)} — clock-in not available.` }
        }
      }
    }

    const next = new Set(clockedInTechs)
    next.add(techId)
    setClockedInTechs(next)
    save('sc_clocked_in', [...next])

    const entry = { id: crypto.randomUUID(), techId, clockInAt: new Date().toISOString(), clockOutAt: null }
    const nextEntries = [...timeEntries, entry]
    setTimeEntries(nextEntries)
    save('sc_time_entries', nextEntries)
  }

  const clockOut = (techId) => {
    const next = new Set(clockedInTechs)
    next.delete(techId)
    setClockedInTechs(next)
    save('sc_clocked_in', [...next])

    const now = new Date().toISOString()
    const nextEntries = timeEntries.map(e =>
      e.techId === techId && !e.clockOutAt ? { ...e, clockOutAt: now } : e
    )
    setTimeEntries(nextEntries)
    save('sc_time_entries', nextEntries)
  }

  // ── reset (dev helper) ────────────────────────────────────────────────────

  const resetData = () => {
    setTechnicians(initialTechnicians)
    setRepairOrders(initialRepairOrders)
    setParts(initialParts)
    setShops(initialShops)
    setJobTimers({})
    setClockedInTechs(new Set())
    localStorage.removeItem('sc_technicians')
    localStorage.removeItem('sc_ros')
    localStorage.removeItem('sc_parts')
    localStorage.removeItem('sc_shops')
    localStorage.removeItem('sc_job_timers')
    localStorage.removeItem('sc_clocked_in')
    setTimeEntries([])
    localStorage.removeItem('sc_time_entries')
  }

  return (
    <DataContext.Provider value={{
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
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}
