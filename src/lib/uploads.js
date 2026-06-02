import { api } from './api'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

/**
 * Upload a file to Vercel Blob via the dashboard API.
 * @param {File} file - the File object from an input
 * @param {object} opts - { roId, category }
 * @returns {Promise<{url, pathname, filename, category, uploadedAt}>}
 */
export async function uploadFile(file, opts = {}) {
  if (!file) throw new Error('No file provided')
  if (file.size > MAX_FILE_SIZE) throw new Error('File too large (max 10MB)')
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Unsupported file type')

  const { roId, category } = opts

  // Upload via our API (which proxies to Vercel Blob)
  const formData = new FormData()
  formData.append('file', file)

  const params = new URLSearchParams({
    action: 'upload',
    ...(roId && { roId }),
    ...(category && { category }),
  })

  // Use fetch directly for multipart uploads
  const token = await getTokenFromProvider()
  const res = await fetch(`/api/dashboard?${params}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: file,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Upload failed')
  }

  return res.json()
}

/**
 * Delete a file from Vercel Blob.
 * @param {string} url - the blob URL to delete
 */
export async function deleteFile(url) {
  return api('/api/dashboard?action=delete-file', {
    method: 'DELETE',
    body: { url },
  })
}

/**
 * List files for a given prefix (org/ro).
 * @param {string} prefix - e.g. "orgId/roId"
 */
export async function listFiles(prefix) {
  return api(`/api/dashboard?action=files&prefix=${encodeURIComponent(prefix)}`)
}

// Internal: get auth token
let _tokenProvider = null
export function setUploadTokenProvider(fn) { _tokenProvider = fn }
async function getTokenFromProvider() {
  if (!_tokenProvider) return ''
  return _tokenProvider()
}
