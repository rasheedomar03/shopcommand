import { useState, useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import { localYmd } from '@/lib/utils'
import { useUnitLabel } from '@/lib/unitLabel'
import { PrintPortal } from '@/components/PrintPortal'
import { truckName } from '@/lib/trucks'
import { useCustomerTrucks } from '@/lib/useCustomerTrucks'
import {
  computeTotals, linesFromInvoice, servicesFromItems,
  taxSettingsFor, invoiceNumberTaken,
} from '@/lib/invoiceLines'
import { emptyItem, DRAFT_KEY, readTaxPref, writeTaxPref, nextInvoiceNumber, itemsFromRO, n } from '@/lib/invoiceForm'
import { InvoicePaper } from '@/components/invoice/InvoicePaper'
import { InvoiceDetailsFields } from '@/components/invoice/InvoiceDetailsFields'
import { InvoiceChargesFields } from '@/components/invoice/InvoiceChargesFields'
import { InvoiceActions } from '@/components/invoice/InvoiceActions'

// In-app invoice generator: create a printable invoice from scratch, from a
// repair order, or by reopening a saved invoice or draft. Every line keeps its
// quantity and unit price (labor quantity is hours, price is the rate), so an
// invoice can be reopened and edited without losing anything. The preview is
// rendered as white "paper" so Print / Save as PDF is true to what the
// customer receives.

const REVENUE_STAGES = new Set(['Complete', 'Invoiced', 'Paid'])

export function InvoiceGeneratorModal({ open, onClose, fromInvoice = null, fromRO = null }) {
  const { shops, repairOrders, addInvoice, invoices, voidInvoice, customers, addCustomer } = useData()
  const unitLabel = useUnitLabel() // "Truck #" for a truck shop, "Vehicle ID" otherwise
  const { session } = useAuth()
  const [savedFlash, setSavedFlash] = useState(false)
  const [savedOnServer, setSavedOnServer] = useState(false)
  // After the first save the invoice exists on the server: later saves edit it
  // (same id and number) instead of creating a second one
  const [savedDbId, setSavedDbId] = useState(null)
  const [savedNumber, setSavedNumber] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [confirmVoid, setConfirmVoid] = useState(false)
  const [voiding, setVoiding] = useState(false)

  const [shopId, setShopId] = useState('')
  const [roId, setRoId] = useState('')
  const [invNumber, setInvNumber] = useState(nextInvoiceNumber)
  const [invDate, setInvDate] = useState(() => localYmd())
  const [status, setStatus] = useState('draft')
  const [customer, setCustomer] = useState('')
  // Optional: with an email, the invoice can be emailed to the customer from its page
  const [customerEmail, setCustomerEmail] = useState('')
  // The customer this invoice belongs to, when the name typed is one of the shop's
  // customers. It links the invoice to the customer's profile (and stops that
  // customer from being deleted while they have invoices). null = just a name.
  const [customerId, setCustomerId] = useState(null)
  const changeCustomerName = (name) => {
    setCustomer(name)
    setAddCustomerError(null)
    const wanted = name.trim().toLowerCase()
    const match = wanted ? (customers || []).find(c => String(c.name || '').trim().toLowerCase() === wanted) : null
    setCustomerId(match ? match.id : null)
    // Fill the email from the customer, but never overwrite one already typed
    if (match?.email && !customerEmail.trim()) setCustomerEmail(match.email)
  }
  // A name that is not one of the shop's customers yet can be added right here, so the
  // invoice is linked to a real customer (profile, credit on account, history)
  const [addingCustomer, setAddingCustomer] = useState(false)
  const [addCustomerError, setAddCustomerError] = useState(null)
  const addTypedCustomer = async () => {
    const name = customer.trim()
    if (name.length < 2 || addingCustomer) return
    setAddingCustomer(true)
    setAddCustomerError(null)
    try {
      const email = customerEmail.trim()
      const c = await addCustomer({ name, ...(email ? { email } : {}) })
      setCustomerId(c.id)
    } catch (err) {
      setAddCustomerError(err.message || 'Could not add the customer')
    }
    setAddingCustomer(false)
  }
  const [vehicle, setVehicle] = useState('')
  const [unitNumber, setUnitNumber] = useState('')
  const [vin, setVin] = useState('')
  // The truck this invoice is for (picked from the customer's saved trucks, or
  // added when the invoice is saved). null = no truck link, just the typed text.
  const [vehicleId, setVehicleId] = useState(null)
  const { trucks, ensureTruck } = useCustomerTrucks(customerId, { demo: !!session?.demo })
  const pickTruck = (id) => {
    const t = trucks.find(x => String(x.id) === String(id))
    if (!t) { setVehicleId(null); return }
    setVehicleId(t.id)
    setVehicle(truckName(t))
    setUnitNumber(t.unitNumber)
    setVin(t.vin)
  }
  // Typing a different truck number or VIN means it is no longer the picked truck
  useEffect(() => {
    if (!vehicleId) return
    const t = trucks.find(x => x.id === vehicleId)
    if (t && (unitNumber.trim() !== t.unitNumber || vin.trim() !== t.vin)) setVehicleId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitNumber, vin])
  const [jobTitle, setJobTitle] = useState('')
  const [diagnostics, setDiagnostics] = useState('')
  const [items, setItems] = useState([{ ...emptyItem }])
  const [taxRate, setTaxRate] = useState(() => readTaxPref().rate)
  const [taxLabor, setTaxLabor] = useState(() => readTaxPref().labor)
  const [cardFee, setCardFee] = useState(false)
  const [cardFeeRate, setCardFeeRate] = useState(() => readTaxPref().fee)
  // Categorize lines as labor/part/fee. Some shops bill flat line amounts
  // with no breakdown; remember the choice across sessions.
  const [itemize, setItemize] = useState(() => {
    try { return localStorage.getItem('sc_inv_itemize') !== '0' } catch { return true }
  })
  const toggleItemize = (on) => {
    setItemize(on)
    try { localStorage.setItem('sc_inv_itemize', on ? '1' : '0') } catch { /* per-viewer convenience only */ }
  }
  const changeTaxRate = (v) => { setTaxRate(v); writeTaxPref(v, taxLabor, cardFeeRate) }
  const changeTaxLabor = (v) => { setTaxLabor(v); writeTaxPref(taxRate, v, cardFeeRate) }
  const changeCardFeeRate = (v) => { setCardFeeRate(v); writeTaxPref(taxRate, taxLabor, v) }
  const [notes, setNotes] = useState('')

  // Unsaved-changes tracking. The baseline is the form as it looked right after
  // opening (or after the last Save); anything different from it is unsaved.
  const snapshot = JSON.stringify({ shopId, roId, invNumber, invDate, customer, customerId, vehicleId, customerEmail, vehicle, unitNumber, vin, jobTitle, diagnostics, items, taxRate, taxLabor, cardFee, cardFeeRate, notes })
  const emailInvalid = !!customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())
  const [baseline, setBaseline] = useState(null)
  const [initTick, setInitTick] = useState(0)
  const [restored, setRestored] = useState(false)
  const restoredRef = useRef(false)
  useEffect(() => {
    // Runs in the render after the open-time initialization has been applied.
    // A restored draft counts as unsaved until the user presses Save invoice.
    if (initTick > 0) setBaseline(restoredRef.current ? '__restored_draft__' : snapshot)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initTick])
  const dirty = open && baseline !== null && snapshot !== baseline
  const isScratch = !fromInvoice && !fromRO

  // Autosave: keep a copy of an unsaved from-scratch invoice on this computer
  // (not on the server) so closing or reloading never loses the work.
  useEffect(() => {
    if (!open || !dirty || !isScratch) return
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, snapshot) } catch { /* storage unavailable */ }
    }, 400)
    return () => clearTimeout(t)
  }, [open, dirty, isScratch, snapshot])

  const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ } }

  const handleClose = () => {
    if (dirty) {
      const msg = isScratch
        ? 'You have unsaved changes. A draft is kept on this computer so you can pick up where you left off, but it is not saved as an invoice yet. Close anyway?'
        : 'You have unsaved changes to this invoice. Close without saving?'
      if (!window.confirm(msg)) return
    }
    onClose()
  }

  // Also warn if the tab or window is closed with unsaved changes
  useEffect(() => {
    if (!dirty) return
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const billableROs = repairOrders.filter(ro => REVENUE_STAGES.has(ro.stage))

  const applyRO = (ro) => {
    if (!ro) return
    setRoId(ro.id)
    setShopId(String(ro.shopId ?? ''))
    setCustomer(ro.customerName || '')
    setCustomerId(ro.customerId ?? null)
    setCustomerEmail(ro.customerEmail || '')
    setVehicle(ro.vehicle || '')
    setVin(ro.vin || '')
    setVehicleId(ro.vehicleId ?? null)
    setItems(itemsFromRO(ro))
  }

  const resetBlank = () => {
    const pref = readTaxPref()
    setRoId('')
    setCustomer(''); setCustomerId(null); setCustomerEmail(''); setVehicle(''); setUnitNumber(''); setVin(''); setVehicleId(null)
    setJobTitle(''); setDiagnostics(''); setNotes('')
    setItems([{ ...emptyItem }])
    setTaxRate(pref.rate); setTaxLabor(pref.labor); setCardFee(false); setCardFeeRate(pref.fee)
  }

  // Initialize when opened
  useEffect(() => {
    if (!open) return
    setInvNumber(fromInvoice?.id || nextInvoiceNumber())
    setInvDate(localYmd(fromInvoice?.created || new Date()))
    setStatus(fromInvoice?.status || 'draft')
    setSavedDbId(fromInvoice?.dbId ?? null)
    setSavedNumber(null)
    setSaveError(null)
    setConfirmVoid(false)
    if (fromInvoice) {
      const lines = linesFromInvoice(fromInvoice)
      const tax = taxSettingsFor(fromInvoice, Number(readTaxPref().rate) || 8.25)
      setRoId(fromInvoice.roId || '')
      setShopId(String(fromInvoice.shopId ?? ''))
      setCustomer(fromInvoice.customerName || '')
      setCustomerId(fromInvoice.customerId ?? null)
      setCustomerEmail(fromInvoice.customerEmail || '')
      setVehicle(fromInvoice.vehicle || '')
      setUnitNumber(fromInvoice.unitNumber || '')
      setVin(fromInvoice.vin || '')
      setVehicleId(fromInvoice.vehicleId ?? null)
      setJobTitle(fromInvoice.jobTitle || '')
      setDiagnostics(fromInvoice.diagnostics || '')
      setNotes(fromInvoice.notes || '')
      setItems(lines.length ? lines : [{ ...emptyItem }])
      setTaxRate(tax.taxRate)
      setTaxLabor(tax.taxLabor)
      setCardFee(!!fromInvoice.cardFee)
      setCardFeeRate(String(fromInvoice.cardFeeRate ?? readTaxPref().fee))
      if (typeof fromInvoice.itemize === 'boolean') setItemize(fromInvoice.itemize)
    } else if (fromRO) {
      resetBlank()
      applyRO(fromRO)
    } else {
      resetBlank()
      setShopId(String(session?.shopId ?? shops[0]?.id ?? ''))
    }
    setSavedFlash(false)

    // Restore an autosaved from-scratch draft, if there is one
    restoredRef.current = false
    setRestored(false)
    if (!fromInvoice && !fromRO) {
      try {
        const raw = localStorage.getItem(DRAFT_KEY)
        const d = raw ? JSON.parse(raw) : null
        if (d && Array.isArray(d.items)) {
          setShopId(String(d.shopId ?? ''))
          setRoId(d.roId || '')
          setInvNumber(d.invNumber || nextInvoiceNumber())
          setInvDate(d.invDate || localYmd())
          setCustomer(d.customer || '')
          setCustomerId(d.customerId ?? null)
          setCustomerEmail(d.customerEmail || '')
          setVehicle(d.vehicle || '')
          setUnitNumber(d.unitNumber || '')
          setVin(d.vin || '')
          setVehicleId(d.vehicleId ?? null)
          setJobTitle(d.jobTitle || '')
          setDiagnostics(d.diagnostics || '')
          setItems(d.items.length ? d.items : [{ ...emptyItem }])
          setTaxRate(String(d.taxRate ?? readTaxPref().rate))
          setTaxLabor(!!d.taxLabor)
          setCardFee(!!d.cardFee)
          setCardFeeRate(String(d.cardFeeRate ?? readTaxPref().fee))
          setNotes(d.notes || '')
          restoredRef.current = true
          setRestored(true)
        }
      } catch { /* ignore a corrupt draft */ }
    }
    setInitTick(t => t + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const shop = shops.find(s => String(s.id) === String(shopId))

  // Two invoices can never share a number: saving over an existing number used
  // to silently replace the earlier invoice.
  const selfNumber = savedNumber ?? fromInvoice?.id // this invoice may keep its own number
  const numberTaken = invoiceNumberTaken(invoices, invNumber, selfNumber)
  const useNextFreeNumber = () => {
    let next = nextInvoiceNumber()
    for (let i = 0; i < 20 && invoiceNumberTaken(invoices, next, selfNumber); i++) next = nextInvoiceNumber()
    setInvNumber(next)
  }

  const totals = computeTotals({ items, itemize, taxRate, taxLabor, cardFee, cardFeeRate })
  const feeLabel = `Card fee ${n(cardFeeRate)}%`
  const shown = items.filter(it => it.desc || n(it.price) > 0)
  const setItem = (idx, patch) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it))

  // A draft that already exists (opened from the list, or saved in this window)
  // can be voided here. Drafts open straight in this window, so without this there
  // was no way to get rid of one. The record is kept for the books, like any void.
  const existingId = savedNumber ?? fromInvoice?.id
  const canVoidDraft = !!existingId && status === 'draft' && !roId
  const discardDraft = async () => {
    setVoiding(true)
    setSaveError(null)
    const r = await voidInvoice(existingId)
    setVoiding(false)
    if (r?.error) {
      setSaveError(r.error)
      setConfirmVoid(false)
      return
    }
    clearDraft()
    onClose() // straight away: the unsaved-changes prompt makes no sense for a voided draft
  }

  const save = async (nextStatus) => {
    if (numberTaken || !invNumber.trim() || saving || emailInvalid) return
    const ro = repairOrders.find(r => String(r.id) === String(roId))
    const sentStatus = nextStatus || status
    setSaving(true)
    setSaveError(null)
    // A truck typed on the invoice for a known customer is found (or added) so it
    // is in their list next time. This never blocks saving the invoice.
    let truckId = vehicleId
    if (!truckId && customerId && !roId) {
      truckId = await ensureTruck({ unitNumber, vin, vehicleText: vehicle })
      if (truckId) setVehicleId(truckId)
    }
    // The shop's own trucks are billed to the fleet customer: those invoices carry
    // prices but are not revenue (an internal invoice).
    const forFleet = (customers || []).find(c => String(c.id) === String(customerId))?.is_fleet === true
    const entry = await addInvoice({
      id: invNumber,
      dbId: savedDbId,
      internal: forFleet || (fromInvoice?.internal ?? false),
      vehicleId: truckId ?? null,
      roId: roId || null,
      shopId: shop?.id ?? null,
      customerId: customerId ?? ro?.customerId ?? null,
      customerName: customer,
      customerEmail: customerEmail.trim() || null,
      vehicle, unitNumber, vin, jobTitle, diagnostics, notes,
      status: sentStatus,
      created: `${invDate}T12:00:00`,
      paidAt: fromInvoice?.paidAt ?? null,
      paymentMethod: fromInvoice?.paymentMethod ?? null,
      // Quantity and unit price are kept on every line; `services` (one amount
      // per line) is kept for the list, export and older screens.
      lines: shown.map(it => ({ desc: it.desc || 'Item', type: it.type, qty: n(it.qty), price: n(it.price) })),
      services: servicesFromItems(items),
      taxRate: n(taxRate), taxLabor, itemize, cardFee, cardFeeRate: n(cardFeeRate),
      cardFeeAmount: totals.fee,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
    })
    setSaving(false)
    // Something the user has to fix (number already used, a bad value, trial ended,
    // no connection on an edit): nothing was saved, so keep the draft and the form.
    if (entry?.error) {
      setSaveError(entry.error)
      return
    }
    setBaseline(snapshot)
    restoredRef.current = false
    setRestored(false)
    clearDraft()
    setStatus(sentStatus)
    setSavedDbId(entry?.dbId ?? null)
    setSavedNumber(entry?.id ?? invNumber)
    // Say honestly where it went: on the server, or (no connection) this computer
    setSavedOnServer(!!entry?.dbId)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 3500)
  }

  // Drop a restored draft and begin an empty invoice
  const startFresh = () => {
    clearDraft()
    restoredRef.current = false
    setRestored(false)
    resetBlank()
    setInvNumber(nextInvoiceNumber())
    setInitTick(t => t + 1)
  }

  // The paper itself: shown in the window and again as the print copy
  const paperInner = (
    <InvoicePaper
      {...{ shop, invNumber, invDate, roId, customer, vehicle, unitLabel, unitNumber, vin, jobTitle,
        diagnostics, shown, itemize, totals, taxRate, taxLabor, cardFee, feeLabel, notes }}
    />
  )

  return (
    <Modal open={open} onClose={handleClose} title="Invoice Generator" subtitle="Build, print, or save as PDF" size="full">
      <div className="p-5 grid lg:grid-cols-[380px_1fr] gap-6 items-start">
        {/* Controls */}
        <div className="space-y-4">
          <InvoiceDetailsFields
            billableROs={billableROs}
            roId={roId}
            setRoId={setRoId}
            applyRO={applyRO}
            shops={shops}
            shopId={shopId}
            setShopId={setShopId}
            invNumber={invNumber}
            setInvNumber={setInvNumber}
            numberTaken={numberTaken}
            useNextFreeNumber={useNextFreeNumber}
            invDate={invDate}
            setInvDate={setInvDate}
            taxRate={taxRate}
            changeTaxRate={changeTaxRate}
            customers={customers}
            customer={customer}
            changeCustomerName={changeCustomerName}
            customerId={customerId}
            addTypedCustomer={addTypedCustomer}
            addingCustomer={addingCustomer}
            addCustomerError={addCustomerError}
            trucks={trucks}
            vehicleId={vehicleId}
            pickTruck={pickTruck}
            vehicle={vehicle}
            setVehicle={setVehicle}
            unitLabel={unitLabel}
            unitNumber={unitNumber}
            setUnitNumber={setUnitNumber}
            vin={vin}
            setVin={setVin}
            customerEmail={customerEmail}
            setCustomerEmail={setCustomerEmail}
            emailInvalid={emailInvalid}
            jobTitle={jobTitle}
            setJobTitle={setJobTitle}
            diagnostics={diagnostics}
            setDiagnostics={setDiagnostics}
          />

          <InvoiceChargesFields
            items={items}
            setItems={setItems}
            setItem={setItem}
            itemize={itemize}
            toggleItemize={toggleItemize}
            taxLabor={taxLabor}
            changeTaxLabor={changeTaxLabor}
            cardFee={cardFee}
            setCardFee={setCardFee}
            feeLabel={feeLabel}
            totals={totals}
            cardFeeRate={cardFeeRate}
            changeCardFeeRate={changeCardFeeRate}
            notes={notes}
            setNotes={setNotes}
          />

          <InvoiceActions
            restored={restored}
            startFresh={startFresh}
            dirty={dirty}
            savedNumber={savedNumber}
            status={status}
            numberTaken={numberTaken}
            invNumber={invNumber}
            saving={saving}
            emailInvalid={emailInvalid}
            save={save}
            savedFlash={savedFlash}
            savedOnServer={savedOnServer}
            canVoidDraft={canVoidDraft}
            confirmVoid={confirmVoid}
            setConfirmVoid={setConfirmVoid}
            voiding={voiding}
            discardDraft={discardDraft}
            saveError={saveError}
            demo={!!session?.demo}
            onPrint={() => window.print()}
          />
        </div>

        {/* Paper preview: always light, print-faithful */}
        <div id="sc-invoice-paper" className="rounded-xl border border-border bg-white text-slate-900 p-7 shadow-sm min-h-[480px]">
          {paperInner}
        </div>
      </div>
      {/* The print copy lives outside this window, directly in the page, so it prints on whole pages */}
      {open && <PrintPortal padding={24}>{paperInner}</PrintPortal>}
    </Modal>
  )
}
