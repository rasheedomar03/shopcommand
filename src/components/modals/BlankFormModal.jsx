import { useState } from 'react'
import { Printer } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import { logoOf } from '@/lib/shopLogo'

// A blank paper work order the shop can print ahead of time and fill in by
// hand, so work can continue if the system is ever unavailable. Layout follows
// a typical truck-shop form: customer and truck details across the top,
// Diagnostics and Parts columns, then technician, signature and notes.

const LINES = 23 // keeps the whole form on one letter page with margin to spare

function Field({ label, flex = 1 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flex }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ flex: 1, borderBottom: '1px solid #1e293b', height: 16 }} />
    </div>
  )
}

function RuledColumn({ title }) {
  return (
    <div style={{ flex: 1, borderRight: title === 'DIAGNOSTICS' ? '1px solid #1e293b' : 'none' }}>
      <div className="sc-bar" style={{ background: '#374151', color: '#fff', textAlign: 'center', fontWeight: 800, fontSize: 14, padding: '5px 0', letterSpacing: 0.5 }}>
        {title}
      </div>
      {Array.from({ length: LINES }).map((_, i) => (
        <div key={i} style={{ height: 26, borderBottom: '1px solid #64748b', margin: '0 10px' }} />
      ))}
    </div>
  )
}

export function BlankFormModal({ open, onClose }) {
  const { shops } = useData()
  const { session } = useAuth()
  const [shopId, setShopId] = useState('')

  const chosen = shopId || String(session?.shopId ?? shops[0]?.id ?? '')
  const shop = shops.find(s => String(s.id) === chosen) || shops[0]

  return (
    <Modal open={open} onClose={onClose} title="Print blank work order" subtitle="A paper form to fill in by hand, for when the system is down" size="xl">
      <style>{`
        @page { size: letter; margin: 0.4in; }
        @media print {
          body * { visibility: hidden !important; }
          #sc-blank-form, #sc-blank-form * { visibility: visible !important; }
          #sc-blank-form { position: fixed !important; inset: 0 !important; width: auto !important; border: none !important; padding: 0 !important; box-shadow: none !important; }
          #sc-blank-form .sc-bar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {shops.length > 1 && (
            <select
              value={chosen}
              onChange={e => setShopId(e.target.value)}
              aria-label="Shop on the form"
              className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary focus:outline-none focus:border-orange"
            >
              {shops.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
            </select>
          )}
          <Button onClick={() => window.print()}>
            <Printer size={14} /> Print form
          </Button>
          <span className="text-xs text-text-muted">Choose how many copies in the print window. Keep a stack by the counter.</span>
        </div>

        {/* Paper: always light, print-faithful */}
        <div id="sc-blank-form" className="bg-white text-slate-900" style={{ border: '1px solid #1e293b', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #1e293b' }}>
            <div style={{ width: '40%', padding: '12px 14px', borderRight: '1px solid #1e293b' }}>
              {logoOf(shop) && <img src={logoOf(shop).src} alt="" style={{ width: logoOf(shop).width, maxWidth: '100%', height: 'auto', marginBottom: 6 }} />}
              <div style={{ fontSize: 17, fontWeight: 800, textTransform: 'uppercase' }}>{shop?.name || 'Shop name'}</div>
              {shop?.address && <div style={{ fontSize: 11, color: '#334155', marginTop: 4 }}>{shop.address}</div>}
              {shop?.phone && <div style={{ fontSize: 11, color: '#334155', marginTop: 2 }}>{shop.phone}</div>}
              {shop?.email && <div style={{ fontSize: 11, color: '#334155', marginTop: 2 }}>{shop.email}</div>}
            </div>
            <div style={{ flex: 1, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: 6, fontSize: 10, fontWeight: 700 }}>
                DATE:
                <span style={{ width: 38, borderBottom: '1px solid #1e293b', height: 14 }} />/
                <span style={{ width: 38, borderBottom: '1px solid #1e293b', height: 14 }} />/
                <span style={{ width: 52, borderBottom: '1px solid #1e293b', height: 14 }} />
              </div>
              <Field label="COMPANY NAME:" />
              <Field label="CUSTOMER NAME:" />
              <Field label="PHONE #:" />
              <div style={{ display: 'flex', gap: 14 }}>
                <Field label="YEAR:" />
                <Field label="TRUCK #:" />
              </div>
              <Field label="MAKE / MODEL:" />
              <Field label="VIN #:" />
              <Field label="MILEAGE:" />
            </div>
          </div>

          <div style={{ display: 'flex' }}>
            <RuledColumn title="DIAGNOSTICS" />
            <RuledColumn title="PARTS" />
          </div>

          <div style={{ borderTop: '1px solid #1e293b', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 24 }}>
              <Field label="TECHNICIAN:" />
              <Field label="CUSTOMER SIGNATURE:" flex={1.4} />
            </div>
            <Field label="NOTES:" />
            <div style={{ borderBottom: '1px solid #1e293b', height: 14 }} />
          </div>
        </div>
      </div>
    </Modal>
  )
}
