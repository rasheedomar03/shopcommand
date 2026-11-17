import { APP_BASE_URL } from './approval.js'

// Emails for the customer estimate approval flow.
//
//   customerEstimateEmail : sent to the customer with the approval link
//   shopResponseEmail     : sent to the owner/advisor when the customer responds
//
// Every value that came from the database or the customer is escaped in the
// HTML and stripped of line breaks in headers.

const BRAND_DARK = '#0D0E14'
const BRAND_ORANGE = '#F97316'

export const esc = s =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

export const firstName = full => String(full || '').trim().split(/\s+/)[0] || 'there'

/**
 * For display names used in email headers: no line breaks, address delimiters,
 * quotes, or backslashes, and a sane length. The caller wraps the result in
 * double quotes for the From header so commas and periods in shop names
 * ("Smith & Sons Auto, Inc.") do not break address parsing.
 */
export const headerSafe = s =>
  String(s ?? '').replace(/[\r\n<>"\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100)

const money = n =>
  '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    timeZone: 'America/Chicago', month: 'long', day: 'numeric', year: 'numeric',
  })
}

const MAX_LINES = 5

function summarize(totals) {
  const lines = [
    ...totals.services.map(s => ({ label: s.name, amount: s.price })),
    ...totals.parts.map(p => ({ label: p.qty > 1 ? `${p.name} (x${p.qty})` : p.name, amount: p.price * p.qty })),
  ]
  return { shown: lines.slice(0, MAX_LINES), more: Math.max(0, lines.length - MAX_LINES) }
}

export function customerEstimateEmail({
  customerName, shopName, shopPhone, shopAddress, vehicle, roNumber, url, totals, expiresAt,
}) {
  const name = firstName(customerName)
  const veh = vehicle || 'your vehicle'
  const { shown, more } = summarize(totals)
  const expires = fmtDate(expiresAt)
  const phone = (shopPhone || '').trim()
  const address = (shopAddress || '').trim()

  const subject = `Your estimate from ${headerSafe(shopName)} is ready`

  // ── plain text ───────────────────────────────────────────────────────────
  const text = [
    `Hi ${name},`,
    '',
    `${shopName} has prepared an estimate for your ${veh}.`,
    '',
    `Estimate ${roNumber || ''}`.trim(),
    ...shown.map(l => `  ${l.label}: ${money(l.amount)}`),
    ...(more ? [`  and ${more} more ${more === 1 ? 'item' : 'items'}`] : []),
    `  Total (includes tax): ${money(totals.total)}`,
    '',
    'Review it and approve or decline from your phone:',
    url,
    '',
    `This link works until ${expires}.`,
    '',
    phone ? `Questions? Call ${shopName} at ${phone}, or reply to this email.` : 'Questions? Reply to this email.',
    ...(address ? [address] : []),
    '',
    phone
      ? `If you were not expecting this estimate, please call ${shopName} at ${phone} before doing anything else.`
      : 'If you were not expecting this estimate, please contact the shop directly before doing anything else.',
    '',
    shopName,
  ].join('\n')

  // ── HTML ─────────────────────────────────────────────────────────────────
  const rows = shown.map(l => `
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#1f2937;">${esc(l.label)}</td>
          <td style="padding:6px 0;font-size:14px;color:#1f2937;text-align:right;white-space:nowrap;">${esc(money(l.amount))}</td>
        </tr>`).join('')
  const moreRow = more
    ? `
        <tr><td colspan="2" style="padding:6px 0;font-size:13px;color:#6b7280;">and ${more} more ${more === 1 ? 'item' : 'items'}</td></tr>`
    : ''

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    Review and approve your ${esc(veh)} estimate from ${esc(shopName)}.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border-top:4px solid ${BRAND_ORANGE};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <tr><td style="padding:24px 28px 8px;">
          <div style="font-size:13px;color:#6b7280;">${esc(shopName)}</div>
          <h1 style="margin:6px 0 0;font-size:22px;line-height:1.3;color:${BRAND_DARK};">Your estimate is ready</h1>
        </td></tr>
        <tr><td style="padding:8px 28px 0;font-size:15px;line-height:1.6;color:#1f2937;">
          Hi ${esc(name)},<br><br>
          ${esc(shopName)} has prepared an estimate for your ${esc(veh)}.
        </td></tr>
        <tr><td style="padding:16px 28px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">
            <tr><td colspan="2" style="padding:10px 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;">Estimate ${esc(roNumber || '')}</td></tr>${rows}${moreRow}
            <tr>
              <td style="padding:10px 0 12px;font-size:15px;font-weight:600;color:${BRAND_DARK};border-top:1px solid #e5e7eb;">Total (includes tax)</td>
              <td style="padding:10px 0 12px;font-size:15px;font-weight:600;color:${BRAND_DARK};text-align:right;border-top:1px solid #e5e7eb;white-space:nowrap;">${esc(money(totals.total))}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:24px 28px 8px;">
          <a href="${esc(url)}" style="display:inline-block;background:${BRAND_DARK};color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 28px;border-radius:8px;">Review your estimate</a>
        </td></tr>
        <tr><td style="padding:4px 28px 0;font-size:13px;line-height:1.6;color:#6b7280;text-align:center;">
          You can approve or decline from your phone. This link works until ${esc(expires)}.
        </td></tr>
        <tr><td style="padding:20px 28px 0;font-size:14px;line-height:1.6;color:#1f2937;">
          Questions? ${phone ? `Call ${esc(shopName)} at ${esc(phone)}, or reply` : 'Reply'} to this email.${address ? `<br><span style="color:#6b7280;">${esc(address)}</span>` : ''}
        </td></tr>
        <tr><td style="padding:16px 28px 24px;font-size:12px;line-height:1.6;color:#6b7280;">
          If you were not expecting this estimate, please ${phone ? `call ${esc(shopName)}` : 'contact the shop directly'} before doing anything else.
          <br><br>
          Button not working? Copy this link into your browser:<br>
          <span style="word-break:break-all;">${esc(url)}</span>
        </td></tr>
      </table>
      <div style="max-width:560px;padding:12px;font-size:11px;color:#9ca3af;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        Sent by ${esc(shopName)} using ShopCommand.
      </div>
    </td></tr>
  </table>
</body>
</html>`

  return { subject, text, html }
}

/** Notice to the shop when a customer approves or declines. */
export function shopResponseEmail({
  decision, signer, customerName, customerPhone, shopName, vehicle, roNumber, total, roId,
}) {
  const approved = decision === 'approve'
  const verb = approved ? 'approved' : 'declined'
  const veh = vehicle || 'a vehicle'
  const who = (signer || customerName || 'The customer').trim()
  const phone = (customerPhone || '').trim()
  const link = `${APP_BASE_URL}/repair-orders?ro=${encodeURIComponent(roId)}`

  const subject = `Estimate ${verb}: ${headerSafe(customerName) || 'customer'}, ${headerSafe(veh)} (${headerSafe(roNumber)})`

  const text = [
    `${who} ${verb} the estimate.`,
    '',
    `Shop: ${shopName || 'Not set'}`,
    `Customer: ${customerName || 'Unknown'}${phone ? `, ${phone}` : ''}`,
    `Vehicle: ${veh}`,
    `Repair order: ${roNumber}`,
    `Estimate total: ${money(total)}`,
    '',
    approved
      ? 'The repair order has moved to Approved.'
      : `The repair order is still in the Estimate stage. You may want to call ${customerName || 'the customer'}${phone ? ` at ${phone}` : ''}.`,
    '',
    `Open this repair order: ${link}`,
  ].join('\n')

  return { subject, text }
}
