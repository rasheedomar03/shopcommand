import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, Truck, Plus } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/Button'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { TruckForm } from '@/components/TruckForm'
import { TruckProfile } from '@/components/TruckProfile'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { formatMoney, formatDate, matchesSearch } from '@/lib/utils'
import { truckFromRow, truckName, truckStats, fleetCustomers, parseVehicleText, DEMO_TRUCKS, truckBodyFromForm } from '@/lib/trucks'

/**
 * The shop's own trucks. They belong to one customer flagged as the fleet (set up
 * with one click), so a truck works like a customer's vehicle: invoices can be made
 * for it and its history is kept. Fleet invoices carry prices but are not revenue.
 */
export default function Fleet() {
  const { customers, invoices, shops, addCustomer } = useData()
  const { session } = useAuth()
  const demo = !!session?.demo
  const isOwner = session?.role === 'owner'
  const fleet = fleetCustomers(customers)[0] || null
  const shop = shops[0] || null

  const [trucks, setTrucks] = useState(demo ? DEMO_TRUCKS : [])
  const [loading, setLoading] = useState(!demo)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [year, setYear] = useState('this')
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(null) // null = closed, { truck } = open (truck missing = add)
  const [settingUp, setSettingUp] = useState(false)

  const load = useCallback(async () => {
    if (demo) return
    try {
      const rows = await api('/api/vehicles?fleet=1')
      setTrucks((Array.isArray(rows) ? rows : []).map(truckFromRow))
      setError(null)
    } catch {
      setError('We could not load your trucks. Try again in a moment.')
    } finally {
      setLoading(false)
    }
  }, [demo])
  useEffect(() => { load() }, [load, fleet?.id])

  const thisYear = new Date().getFullYear()
  const yearArg = year === 'all' ? 'all' : thisYear
  const rows = useMemo(() => trucks
    .map(t => ({ t, year: truckStats(t, invoices, yearArg), all: truckStats(t, invoices, 'all') }))
    .filter(r => matchesSearch(search, r.t.unitNumber, r.t.vin, r.t.make, r.t.model, r.t.year, truckName(r.t)))
    .sort((a, b) => String(a.t.unitNumber).localeCompare(String(b.t.unitNumber), undefined, { numeric: true })),
  [trucks, invoices, yearArg, search])

  const totalSpent = rows.reduce((s, r) => s + r.year.spent, 0)
  const selected = trucks.find(t => t.id === selectedId) || null

  const setUpFleet = async () => {
    setSettingUp(true)
    setError(null)
    try {
      await addCustomer({ name: `${shop?.name || 'Our'} Fleet`, is_fleet: true })
    } catch (err) {
      setError(err?.message || 'Could not set up the fleet.')
    } finally {
      setSettingUp(false)
    }
  }

  const saveTruck = async (existing, v) => {
    const parsed = parseVehicleText(v.vehicle)
    const body = truckBodyFromForm(v)
    if (demo) {
      const local = { unitNumber: body.unit_number, year: parsed.year ?? null, make: parsed.make || '', model: parsed.model || '', vin: v.vin.trim(), mileage: v.mileage ? Number(v.mileage) : null }
      setTrucks(prev => existing
        ? prev.map(t => (t.id === existing.id ? { ...t, ...local } : t))
        : [{ id: `demo-truck-${Date.now()}`, customerId: 'demo-fleet', customerName: 'Our Fleet', trim: '', license: '', ...local }, ...prev])
      setForm(null)
      return undefined
    }
    try {
      // Editing sends every field the form shows, blank ones included, so clearing a
      // field clears it. (Adding a truck only sends what was filled in.)
      const editBody = {
        unit_number: v.unitNumber.trim(),
        year: parsed.year ?? null,
        make: parsed.make || null,
        model: parsed.model || null,
        // The description box already shows the trim as part of the model, so it is
        // saved there (and cleared here) instead of being repeated
        trim: null,
        vin: v.vin.trim() || null,
        last_mileage: v.mileage ? Number(v.mileage) : null,
      }
      if (existing) await api('/api/vehicles', { method: 'PUT', params: { id: existing.id }, body: editBody })
      else await api('/api/vehicles', { method: 'POST', body: { customer_id: fleet.id, ...body } })
      await load()
      setForm(null)
      return undefined
    } catch (err) {
      return { error: err?.message || 'Could not save the truck.' }
    }
  }

  const needsSetup = !demo && !fleet

  return (
    <div className="p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-text-primary">Fleet</h1>
          <p className="text-xs text-text-muted mt-0.5">
            {trucks.length} truck{trucks.length === 1 ? '' : 's'} · {year === 'all' ? 'all time' : `${thisYear}`} spent {formatMoney(totalSpent)}
          </p>
        </div>
        {!needsSetup && (
          <Button onClick={() => setForm({})}><Plus size={15} /> Add truck</Button>
        )}
      </div>

      {error && <div className="rounded-lg border border-status-red/30 bg-status-red/10 px-3 py-2 text-xs text-status-red" role="alert">{error}</div>}

      {needsSetup ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            icon={Truck}
            title="Set up your fleet"
            hint={isOwner
              ? 'Your own trucks live here, like a customer. Invoices for them carry prices but do not count as revenue. One click creates the fleet.'
              : 'Ask the owner to set up the fleet. It takes one click in this page.'}
            actionLabel={settingUp ? 'Setting up...' : 'Set up fleet'}
            onAction={isOwner && !settingUp ? setUpFleet : undefined}
          />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search trucks by number, VIN, make or model..."
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-orange/40"
              />
            </div>
            <select value={year} onChange={e => setYear(e.target.value)} className="h-9 px-2 rounded-lg bg-background border border-border text-xs text-text-primary" aria-label="Spent period">
              <option value="this">Spent this year</option>
              <option value="all">Spent all time</option>
            </select>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            {loading ? (
              <div className="py-12 text-center text-sm text-text-muted">Loading your trucks...</div>
            ) : rows.length === 0 ? (
              trucks.length === 0
                ? <EmptyState icon={Truck} title="No trucks yet" hint="Add your trucks with their number and VIN. Then pick one when you make an invoice, and its history builds up here." actionLabel="Add truck" onAction={() => setForm({})} />
                : <EmptyState search title="No trucks match your search" />
            ) : (
              <Table>
                <Thead>
                  <Tr>
                    <Th>Truck #</Th>
                    <Th>Vehicle</Th>
                    <Th className="hidden md:table-cell">VIN</Th>
                    <Th className="text-right">{year === 'all' ? 'Spent' : 'Spent this year'}</Th>
                    <Th className="hidden sm:table-cell">Last worked on</Th>
                    <Th className="hidden lg:table-cell text-right">Invoices</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {rows.map(({ t, year: y, all }) => (
                    <Tr key={t.id} onClick={() => setSelectedId(t.id)} className="cursor-pointer">
                      <Td><span className="text-sm font-semibold text-text-primary">{t.unitNumber || '-'}</span></Td>
                      <Td><span className="text-xs text-text-secondary">{truckName(t) || '-'}</span></Td>
                      <Td className="hidden md:table-cell"><span className="text-2xs font-mono text-text-muted">{t.vin || ''}</span></Td>
                      <Td className="text-right"><span className="text-sm tabular-nums text-text-primary">{formatMoney(y.spent)}</span></Td>
                      <Td className="hidden sm:table-cell"><span className="text-xs text-text-muted">{all.lastWorked ? formatDate(`${all.lastWorked}T12:00:00`) : 'Not yet'}</span></Td>
                      <Td className="hidden lg:table-cell text-right"><span className="text-xs tabular-nums text-text-muted">{all.count}</span></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </div>
        </>
      )}

      <TruckProfile
        open={!!selected}
        truck={selected}
        invoices={invoices}
        shop={shop}
        onClose={() => setSelectedId(null)}
        onEdit={(t) => { setSelectedId(null); setForm({ truck: t }) }}
      />
      <TruckForm
        open={!!form}
        truck={form?.truck}
        onClose={() => setForm(null)}
        onSave={(v) => saveTruck(form?.truck, v)}
      />
    </div>
  )
}
