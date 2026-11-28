import { Printer, Check, Save, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'

/** Save state, the save / print / send buttons, and voiding a draft. */
export function InvoiceActions({
  restored, startFresh, dirty, savedNumber, status, numberTaken, invNumber, saving, emailInvalid,
  save, savedFlash, savedOnServer, demo, canVoidDraft, confirmVoid, setConfirmVoid, voiding,
  discardDraft, saveError, onPrint,
}) {
  return (
    <>
      {restored && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-orange/20 bg-orange/[0.05] px-3 py-2 text-xs text-text-secondary">
          <span>We restored the draft you were working on. It is not saved as an invoice yet.</span>
          <button
            onClick={startFresh}
            className="font-semibold text-orange hover:underline whitespace-nowrap"
          >
            Start fresh
          </button>
        </div>
      )}
      {dirty && (
        <p className="text-xs font-medium text-status-yellow">
          You have unsaved changes. Press Save invoice to keep them.
        </p>
      )}
      {!dirty && savedNumber && (
        <p className="text-xs font-medium text-status-green">
          Saved as {savedNumber}{status === 'draft' ? ' (draft)' : ''}. It is on your Invoices page; close this window when you are done.
        </p>
      )}

      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          disabled={numberTaken || !invNumber.trim() || saving || emailInvalid}
          onClick={() => save()}
        >
          {saving
            ? 'Saving...'
            : savedFlash
              ? <><Check size={14} className="text-status-green" /> {savedOnServer ? 'Saved' : 'Saved on this computer'}</>
              : <><Save size={14} /> Save invoice</>}
        </Button>
        <Button className="flex-1" onClick={onPrint}>
          <Printer size={14} /> Print / PDF
        </Button>
      </div>
      {status === 'draft' && (
        <Button variant="secondary" className="w-full" disabled={numberTaken || !invNumber.trim() || saving || emailInvalid} onClick={() => save('sent')}>
          <Send size={14} /> Save and mark as sent
        </Button>
      )}
      {canVoidDraft && (
        confirmVoid ? (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-status-red">Void this draft? It is kept on record for your books.</span>
            <button onClick={discardDraft} disabled={voiding} className="font-semibold text-status-red hover:underline whitespace-nowrap">
              {voiding ? 'Voiding...' : 'Yes, void it'}
            </button>
            <button onClick={() => setConfirmVoid(false)} disabled={voiding} className="text-text-muted hover:text-text-primary">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmVoid(true)} className="text-xs font-medium text-status-red hover:underline">
            Void this draft
          </button>
        )
      )}
      {saveError && (
        <p className="text-xs font-medium text-status-red" role="alert">{saveError}</p>
      )}
      {savedFlash && !savedOnServer && !demo && (
        <p className="text-xs text-text-muted">
          We could not reach the server, so this invoice is kept on this computer for now. It moves to your account automatically the next time the app connects.
        </p>
      )}
      <p className="text-2xs text-text-muted">
        Print / PDF prints the paper preview on the right. In the print window, choose Save as PDF to get a PDF file.
      </p>
    </>
  )
}
