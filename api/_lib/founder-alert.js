// Plain-text heads-up emails to the founder about signups, so a stuck or
// abandoned signup is noticed within a day instead of weeks later.
//
// Never throws and never blocks onboarding: returns true when Resend accepted
// the message, false otherwise (including when RESEND_API_KEY is not set, as
// on Preview deployments).

// Keep header values on one line and a sane length
function oneLine(value, max = 150) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max)
}

export async function sendFounderAlert({ subject, lines = [] }) {
  const key = process.env.RESEND_API_KEY
  if (!key) return false
  const to = process.env.FOUNDER_ALERT_EMAIL || 'hello@shopcommand.net'
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'ShopCommand <notifications@shopcommand.net>',
        to: [to],
        subject: oneLine(subject),
        text: lines.map(l => oneLine(l, 300)).join('\n'),
      }),
    })
    return res.ok
  } catch {
    return false
  }
}
