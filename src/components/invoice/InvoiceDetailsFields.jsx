import { truckLabel } from '@/lib/trucks'
import { n, field, label } from '@/lib/invoiceForm'

/** Who and what the invoice is for: repair order, shop, number, customer, vehicle, findings. */
export function InvoiceDetailsFields({
  billableROs, roId, setRoId, applyRO, shops, shopId, setShopId, invNumber, setInvNumber,
  numberTaken, useNextFreeNumber, invDate, setInvDate, taxRate, changeTaxRate, customers, customer,
  changeCustomerName, customerId, addTypedCustomer, addingCustomer, addCustomerError, trucks,
  vehicleId, pickTruck, vehicle, setVehicle, unitLabel, unitNumber, setUnitNumber, vin, setVin,
  customerEmail, setCustomerEmail, emailInvalid, jobTitle, setJobTitle, diagnostics, setDiagnostics,
}) {
  return (
    <>
      {billableROs.length > 0 && (
        <div>
          <label className={label}>Fill from repair order</label>
          <select
            className={`${field} mt-1`}
            value={roId}
            onChange={e => {
              const ro = billableROs.find(r => String(r.id) === e.target.value)
              if (ro) applyRO(ro)
              else setRoId('')
            }}
          >
            <option value="">Start blank…</option>
            {billableROs.map(ro => (
              <option key={ro.id} value={ro.id}>
                {ro.roNumber || ro.id} · {ro.customerName} · {ro.vehicle}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Shop</label>
          <select className={`${field} mt-1`} value={shopId} onChange={e => setShopId(e.target.value)}>
            {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Invoice #</label>
          <input className={`${field} mt-1 ${numberTaken ? 'border-status-red' : ''}`} value={invNumber} onChange={e => setInvNumber(e.target.value)} />
          {numberTaken && (
            <p className="mt-1 text-2xs text-status-red">
              That number is already used by another invoice.{' '}
              <button type="button" onClick={useNextFreeNumber} className="font-semibold underline">Use a free number</button>
            </p>
          )}
        </div>
        <div>
          <label className={label}>Date</label>
          <input type="date" className={`${field} mt-1`} value={invDate} onChange={e => setInvDate(e.target.value)} />
        </div>
        <div>
          <label className={label}>Sales tax %</label>
          <input className={`${field} mt-1`} inputMode="decimal" value={taxRate} onChange={e => changeTaxRate(e.target.value)} />
          <p className="mt-1 text-2xs text-text-muted">
            Type 0 if your prices already include tax.{' '}
            {n(taxRate) !== 0 && <button type="button" onClick={() => changeTaxRate('0')} className="font-semibold text-orange underline">No tax</button>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Customer</label>
          <input className={`${field} mt-1`} placeholder="Customer or company" value={customer} onChange={e => changeCustomerName(e.target.value)} list="sc-invoice-customers" autoComplete="off" />
          <datalist id="sc-invoice-customers">
            {(customers || []).slice(0, 300).map(c => <option key={c.id} value={c.name} />)}
          </datalist>
          {customerId && <p className="mt-1 text-2xs text-text-muted">Linked to this customer's profile.</p>}
          {!customerId && customer.trim().length >= 2 && (
            <p className="mt-1 text-2xs text-text-muted">
              Not in your customers yet.{' '}
              <button type="button" onClick={addTypedCustomer} disabled={addingCustomer} className="font-semibold text-orange underline disabled:opacity-50">
                {addingCustomer ? 'Adding…' : `Add "${customer.trim()}" as a customer`}
              </button>
              {' '}so you can see their invoices and keep credit on account.
            </p>
          )}
          {addCustomerError && <p className="mt-1 text-2xs font-medium text-status-red">{addCustomerError}</p>}
          {trucks.length > 0 && (
            <div className="mt-2">
              <label className={label}>Saved trucks</label>
              <select className={`${field} mt-1`} value={vehicleId || ''} onChange={e => pickTruck(e.target.value)}>
                <option value="">Pick a saved truck (or type one below)</option>
                {trucks.map(t => <option key={t.id} value={t.id}>{truckLabel(t)}</option>)}
              </select>
            </div>
          )}
        </div>
        <div>
          <label className={label}>Vehicle</label>
          <input className={`${field} mt-1`} placeholder="2019 Freightliner Cascadia" value={vehicle} onChange={e => setVehicle(e.target.value)} />
        </div>
        <div>
          <label className={label}>{unitLabel} (optional)</label>
          <input className={`${field} mt-1`} placeholder={unitLabel === 'Truck #' ? 'Unit or truck number' : 'Unit, stock or fleet number'} value={unitNumber} onChange={e => setUnitNumber(e.target.value)} />
        </div>
        <div>
          <label className={label}>VIN</label>
          <input className={`${field} mt-1 font-mono`} placeholder="17 characters" maxLength={17} value={vin} onChange={e => setVin(e.target.value.toUpperCase().replace(/\s/g, ''))} />
        </div>
        <div className="col-span-2">
          <label className={label}>Customer email (optional)</label>
          <input type="email" className={`${field} mt-1`} placeholder="So you can email them this invoice" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
          {emailInvalid && <p className="mt-1 text-2xs font-medium text-status-red">That email address does not look right.</p>}
        </div>
      </div>

      <div>
        <label className={label}>What was the repair?</label>
        <input className={`${field} mt-1`} placeholder="e.g. Brake job, front axle" maxLength={120} value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
      </div>

      <div>
        <label className={label}>Diagnostics</label>
        <textarea className={`${field} mt-1 h-16 py-2`} placeholder="What was found. Prints on the invoice." value={diagnostics} onChange={e => setDiagnostics(e.target.value)} />
      </div>
    </>
  )
}
