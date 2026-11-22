import { createPortal } from 'react-dom'

// One way to print every document in the app.
//
// Printing a document from inside a pop-up window does not work well: fixed
// content in a dialog is clipped and split across pages, and the app behind it
// (hidden but still there) adds blank pages. So each printable document renders
// a second copy through this component, placed directly in the page body. On
// screen it is hidden. When printing, EVERYTHING ELSE is removed from the page
// (display none, so it takes no space) and this copy flows across as many pages
// as it needs, with table headings repeated and rows kept whole.
//
// Use: <PrintPortal padding={24}>...the document...</PrintPortal>
// Render it only while the document is open (it is a copy of what is on screen).

const PRINT_CSS = `
  .sc-print-root { display: none; }
  @media print {
    body > *:not(.sc-print-root):not(style) { display: none !important; }
    .sc-print-root { display: block !important; background: #fff; color: #0f172a; font-family: system-ui, sans-serif; font-size: 13px; }
    .sc-print-root, .sc-print-root * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .sc-print-root table { border-collapse: collapse; }
    .sc-print-root thead { display: table-header-group; }
    .sc-print-root tr { break-inside: avoid; page-break-inside: avoid; }
    .sc-print-root img { max-width: 100%; }
    @page { margin: 12mm; }
  }
`

export function PrintPortal({ padding = 0, children }) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <>
      <style>{PRINT_CSS}</style>
      <div className="sc-print-root" style={{ padding }}>{children}</div>
    </>,
    document.body,
  )
}
