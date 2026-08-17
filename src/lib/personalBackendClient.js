import { api, apiRequest } from './apiClient'

// Same production-aware fallback as apiClient.js — /api in production
// builds (relies on the SPA host proxying), http://localhost:4000/api
// in dev so the default `npm run dev` workflow works.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api')

const normalizeError = (error) => ({
  message: error?.message || 'Request failed.',
})

const getCookie = (name) => {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length !== 2) return null
  return parts.pop().split(';').shift()
}

async function ensureCsrfToken() {
  const existing = getCookie('afit_nests_csrf')
  if (existing) return existing

  await fetch(`${API_BASE_URL}/health`, { credentials: 'include' }).catch(() => null)
  return getCookie('afit_nests_csrf')
}

class ApiQuery {
  constructor(table) {
    this.table = table
    this.operation = 'select'
    this.filters = []
    this.orderBy = null
    this.limitValue = null
    this.singleValue = false
    this.countValue = false
    this.payload = null
  }

  select(_columns = '*', options = {}) {
    this.countValue = options?.count === 'exact'
    return this
  }

  insert(payload) {
    this.operation = 'insert'
    this.payload = payload
    return this
  }

  update(payload) {
    this.operation = 'update'
    this.payload = payload
    return this
  }

  eq(column, value) {
    this.filters.push({ column, operator: 'eq', value })
    return this
  }

  order(column, options = {}) {
    this.orderBy = { column, ascending: options.ascending !== false }
    return this
  }

  limit(value) {
    this.limitValue = value
    return this
  }

  single() {
    this.singleValue = true
    return this
  }

  async execute() {
    try {
      const result = await apiRequest(`/data/${this.table}`, {
        method: 'POST',
        body: {
          operation: this.operation,
          filters: this.filters,
          order: this.orderBy,
          limit: this.limitValue,
          single: this.singleValue,
          count: this.countValue,
          payload: this.payload,
        },
      })

      return {
        data: result.data ?? null,
        error: null,
        count: result.count,
      }
    } catch (error) {
      return {
        data: this.singleValue ? null : [],
        error: normalizeError(error),
        count: 0,
      }
    }
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject)
  }
}

// The backend serves uploaded files from the static mount at `${API_BASE_URL}/uploads`
// (i.e. `/api/uploads/...`). Build absolute URLs against that same base so images
// resolve on both same-origin and split frontend/backend deployments.
const toPublicUrl = (relativePath) => {
  if (!relativePath) return ''
  const cleaned = String(relativePath).replace(/^\/?(api\/)?uploads\//, '')
  return `${API_BASE_URL}/uploads/${cleaned}`
}

const storageBucket = (bucket) => ({
  upload: async (path, file) => {
    try {
      const csrfToken = await ensureCsrfToken()
      const key = encodeURIComponent(path.replace(/\.[a-z0-9]+$/i, '').replace(/[^a-zA-Z0-9_-]/g, '-'))
      const response = await fetch(`${API_BASE_URL}/uploads/${bucket}/${key}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': file.type,
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        body: file,
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Upload failed.')
      // Return the server-assigned storage path and a working absolute URL. Callers
      // must use these — the client-side `path` is not the stored filename (the
      // server appends a random suffix).
      return { data: { path: payload.path, fullPath: payload.path, publicUrl: toPublicUrl(payload.path) }, error: null }
    } catch (error) {
      return { data: null, error: normalizeError(error) }
    }
  },
  getPublicUrl: (path) => ({
    data: { publicUrl: toPublicUrl(path) },
  }),
})

const noopChannel = () => ({
  on: () => noopChannel(),
  subscribe: () => noopChannel(),
  send: async () => ({ ok: true }),
})

export const backend = {
  from: (table) => new ApiQuery(table),
  auth: {
    getSession: async () => {
      try {
        const { user } = await api.auth.me()
        return { data: { session: user ? { user } : null }, error: null }
      } catch (error) {
        return { data: { session: null }, error: normalizeError(error) }
      }
    },
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
    signOut: async () => {
      await api.auth.logout().catch(() => null)
      return { error: null }
    },
  },
  storage: {
    from: storageBucket,
  },
  channel: noopChannel,
  removeChannel: () => {},
}
