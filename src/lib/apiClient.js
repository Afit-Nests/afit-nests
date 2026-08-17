// Resolve the API base URL at build time.
//
// Order of preference:
//   1. VITE_API_BASE_URL (set this in production — either an absolute URL
//      like https://api.example.com/api for direct calls, OR a same-origin
//      path like /api when the SPA host proxies /api/* to the API server.
//   2. Production builds without VITE_API_BASE_URL fall back to a
//      same-origin /api path. This keeps the SPA functional even if the
//      env var was forgotten, instead of silently pointing at the dev
//      backend on localhost.
//   3. Dev builds without VITE_API_BASE_URL fall back to the local
//      backend at http://localhost:4000/api so the default `npm run dev`
//      workflow works without extra setup.
//
// The "is this a production build?" check uses Vite's import.meta.env.PROD,
// which is true only for `vite build` output. `vite dev` leaves it false.
const DEFAULT_API_BASE_URL = import.meta.env.PROD ? '/api' : 'http://localhost:4000/api'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

const getCookie = (name) => {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length !== 2) return null
  return parts.pop().split(';').shift()
}

async function ensureCsrfToken() {
  const existing = getCookie('afit_nests_csrf')
  if (existing) return existing

  await fetch(`${API_BASE_URL}/health`, {
    credentials: 'include',
  }).catch(() => null)

  return getCookie('afit_nests_csrf')
}

export async function apiRequest(path, options = {}) {
  const method = options.method || 'GET'
  const csrfToken = unsafeMethods.has(method.toUpperCase()) ? await ensureCsrfToken() : null
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...options.headers,
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || 'Request failed.')
  }
  return payload
}

export const api = {
  auth: {
    me: () => apiRequest('/auth/me'),
    login: (body) => apiRequest('/auth/login', { method: 'POST', body }),
    logout: () => apiRequest('/auth/logout', { method: 'POST' }),
    registerStudent: (body) => apiRequest('/auth/register/student', { method: 'POST', body }),
    registerLandlord: (body) => apiRequest('/auth/register/landlord', { method: 'POST', body }),
    forgotPassword: (email) => apiRequest('/auth/password/forgot', { method: 'POST', body: { email } }),
    resetPassword: (token, password) => apiRequest('/auth/password/reset', { method: 'POST', body: { token, password } }),
    deleteMe: () => apiRequest('/auth/me', { method: 'DELETE' }),
    mfaSetup: () => apiRequest('/auth/mfa/setup', { method: 'POST' }),
    mfaEnable: (code) => apiRequest('/auth/mfa/enable', { method: 'POST', body: { code } }),
    mfaDisable: (code) => apiRequest('/auth/mfa/disable', { method: 'POST', body: { code } }),
    unlinkGoogle: (password) => apiRequest('/auth/google', { method: 'DELETE', body: { password } }),
  },
  listings: {
    list: () => apiRequest('/listings'),
    get: (id) => apiRequest(`/listings/${id}`),
    create: (body) => apiRequest('/listings', { method: 'POST', body }),
    update: (id, body) => apiRequest(`/listings/${id}`, { method: 'PATCH', body }),
  },
  payments: {
    initialize: (listingId) => apiRequest('/payments/initialize', { method: 'POST', body: { listingId } }),
    paystackCallback: (reference) => apiRequest('/payments/paystack/callback', { method: 'POST', body: { reference } }),
    pendingAllocations: () => apiRequest('/payments/pending-allocations'),
    confirm: (id) => apiRequest(`/payments/${id}/confirm`, { method: 'POST' }),
    reject: (id) => apiRequest(`/payments/${id}/reject`, { method: 'POST' }),
  },
  engagement: {
    notifications: () => apiRequest('/notifications'),
    markNotificationRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
    savedListings: () => apiRequest('/saved-listings'),
    saveListing: (id) => apiRequest(`/listings/${id}/save`, { method: 'POST' }),
    unsaveListing: (id) => apiRequest(`/listings/${id}/save`, { method: 'DELETE' }),
    reviews: (id) => apiRequest(`/listings/${id}/reviews`),
    createReview: (id, body) => apiRequest(`/listings/${id}/reviews`, { method: 'POST', body }),
    availability: (id) => apiRequest(`/listings/${id}/availability`),
    saveAvailability: (id, body) => apiRequest(`/listings/${id}/availability`, { method: 'POST', body }),
  },
  admin: {
    overview: () => apiRequest('/admin/overview'),
    collections: () => apiRequest('/admin/collections'),
    users: () => apiRequest('/admin/users'),
    createUser: (body) => apiRequest('/admin/users', { method: 'POST', body }),
    updateUser: (id, body) => apiRequest(`/admin/users/${id}`, { method: 'PATCH', body }),
    deleteUser: (id) => apiRequest(`/admin/users/${id}`, { method: 'DELETE' }),
    setLandlordVerification: (id, verified) => apiRequest(`/admin/users/${id}/verification`, { method: 'PATCH', body: { verified } }),
    createListing: (body) => apiRequest('/admin/listings', { method: 'POST', body }),
    updateListing: (id, body) => apiRequest(`/admin/listings/${id}`, { method: 'PATCH', body }),
    cmsPages: () => apiRequest('/admin/cms/pages'),
    createCmsPage: (body) => apiRequest('/admin/cms/pages', { method: 'POST', body }),
    updateCmsPage: (id, body) => apiRequest(`/admin/cms/pages/${id}`, { method: 'PATCH', body }),
    settings: () => apiRequest('/admin/settings'),
    createSetting: (body) => apiRequest('/admin/settings', { method: 'POST', body }),
    updateSetting: (id, body) => apiRequest(`/admin/settings/${id}`, { method: 'PATCH', body }),
  },
}
