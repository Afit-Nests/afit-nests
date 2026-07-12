const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'
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
