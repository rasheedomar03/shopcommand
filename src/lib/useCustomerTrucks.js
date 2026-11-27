import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { truckFromRow, planTruck, findSameTruck, truckBodyFromForm } from '@/lib/trucks'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The trucks saved for one customer (for the invoice generator's truck picker),
 * and `ensureTruck`, which finds the truck an invoice is for or adds it, so a
 * truck typed on an invoice is there to pick next time. It never throws: if a
 * truck cannot be saved the invoice still saves, just without a truck link.
 * Real accounts only (the demo has no server), except addTruck, which the
 * customer profile uses and which keeps a demo truck on screen.
 */
export function useCustomerTrucks(customerId, { demo = false } = {}) {
  const [trucks, setTrucks] = useState([])

  useEffect(() => {
    let alive = true
    if (!customerId || demo || !UUID_RE.test(String(customerId))) { setTrucks([]); return undefined }
    api(`/api/vehicles?customer_id=${customerId}`)
      .then(rows => { if (alive) setTrucks((Array.isArray(rows) ? rows : []).map(truckFromRow)) })
      .catch(() => { if (alive) setTrucks([]) })
    return () => { alive = false }
  }, [customerId, demo])

  const ensureTruck = useCallback(async ({ unitNumber, vin, vehicleText }) => {
    if (demo || !customerId || !UUID_RE.test(String(customerId))) return null
    const plan = planTruck({ trucks, customerId, unitNumber, vin, vehicleText })
    if (plan.action === 'none') return null
    if (plan.action === 'use') return plan.id
    try {
      const row = await api('/api/vehicles', { method: 'POST', body: plan.body })
      setTrucks(prev => [truckFromRow(row), ...prev])
      return row.id
    } catch {
      return null
    }
  }, [customerId, demo, trucks])

  // Add a truck typed into the add-truck form. Returns { error } or nothing.
  const addTruck = useCallback(async (values) => {
    if (findSameTruck(trucks, values)) return { error: 'This customer already has a truck with that number or VIN.' }
    const body = { customer_id: customerId, ...truckBodyFromForm(values) }
    if (demo) {
      setTrucks(prev => [truckFromRow({ id: `demo-truck-${Date.now()}`, ...body }), ...prev])
      return undefined
    }
    try {
      const row = await api('/api/vehicles', { method: 'POST', body })
      setTrucks(prev => [truckFromRow(row), ...prev])
      return undefined
    } catch (err) {
      return { error: err?.message || 'Could not save the truck.' }
    }
  }, [customerId, demo, trucks])

  return { trucks, ensureTruck, addTruck }
}
