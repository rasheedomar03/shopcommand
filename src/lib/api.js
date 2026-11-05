/**
 * Authenticated API client for ShopCommand.
 * All requests include the Clerk JWT Bearer token.
 * Never import this in files outside src/ (API routes use their own auth).
 */

let _getToken = null

/** Called once from DataProvider to inject Clerk's getToken */
export function setTokenProvider(fn) {
  _getToken = fn
}

async function getAuthHeaders() {
  if (!_getToken) return {}
  const token = await _getToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

/**
 * Make an authenticated API request.
 * @param {string} path — e.g. '/api/customers'
 * @param {object} opts — { method, body, params }
 * @returns {Promise<any>} parsed JSON
 * @throws {Error} with message from API or generic error
 */
export async function api(path, opts = {}) {
  const { method = 'GET', body, params } = opts

  let url = path
  if (params) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') qs.set(k, v)
    }
    const str = qs.toString()
    // The path may already carry a query string (e.g. /api/health?action=x)
    if (str) url += (url.includes('?') ? '&' : '?') + str
  }

  const headers = await getAuthHeaders()
  const fetchOpts = { method, headers }

  if (body && method !== 'GET') {
    headers['Content-Type'] = 'application/json'
    fetchOpts.body = JSON.stringify(body)
  }

  const res = await fetch(url, fetchOpts)
  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }

  return data
}
