import { api } from './apiClient'
import { PASSWORD_REQUIREMENTS, isComplexPassword } from './passwordPolicy'

const toCamelUser = (user) => ({
  role: user.role,
  fullName: user.full_name,
  email: user.email || undefined,
  phone: user.phone || undefined,
  verified: Boolean(user.verified),
  matricNumber: user.matric_number || undefined,
  department: user.department || undefined,
  nin: user.nin || undefined,
  address: user.address || undefined,
})

const toAdminListingPayload = (listing) => ({
  landlordId: listing.landlord_id,
  title: listing.title?.trim(),
  type: listing.type,
  price: Number(listing.price || 0),
  distance: Number(listing.distance || 0),
  address: listing.address?.trim(),
  description: listing.description?.trim() || '',
  amenities: Array.isArray(listing.amenities)
    ? listing.amenities
    : String(listing.amenities || '').split(',').map(item => item.trim()).filter(Boolean),
  status: listing.status || 'available',
  photos: Array.isArray(listing.photos) ? listing.photos : [],
  lat: listing.lat ? Number(listing.lat) : null,
  lng: listing.lng ? Number(listing.lng) : null,
})

export async function getPersonalBackendOverview() {
  const { overview } = await api.admin.overview()
  return {
    listings: overview.listings || 0,
    landlords: overview.landlords || 0,
    students: overview.students || 0,
    openDisputes: overview.open_disputes || 0,
    pendingPayments: overview.pending_payments || 0,
    cmsPages: overview.cms_pages || 0,
  }
}

export async function listCmsPages() {
  const { pages } = await api.admin.cmsPages()
  return pages || []
}

export async function saveCmsPage(page) {
  const payload = {
    title: page.title.trim(),
    slug: page.slug.trim().toLowerCase(),
    status: page.status,
    summary: page.summary.trim(),
    body: page.body.trim(),
  }

  const result = page.id
    ? await api.admin.updateCmsPage(page.id, payload)
    : await api.admin.createCmsPage(payload)

  return result.page
}

export async function listPlatformSettings() {
  const { settings } = await api.admin.settings()
  return settings || []
}

export async function savePlatformSetting(setting) {
  const payload = {
    key: setting.key.trim(),
    label: setting.label.trim(),
    value: setting.value.trim(),
    type: setting.type,
  }

  const result = setting.id
    ? await api.admin.updateSetting(setting.id, payload)
    : await api.admin.createSetting(payload)

  return result.setting
}

export async function listBackendCollections() {
  const collections = await api.admin.collections()
  return {
    listings: collections.listings || [],
    users: collections.users || [],
    payments: collections.payments || [],
    disputes: collections.disputes || [],
  }
}

export async function saveAdminUser(user) {
  const payload = toCamelUser(user)
  if (user.password?.trim()) payload.password = user.password.trim()

  if (!user.id && !payload.password) {
    throw new Error('Set an initial password for the new account.')
  }

  if (payload.password && !isComplexPassword(payload.password)) {
    throw new Error(PASSWORD_REQUIREMENTS)
  }

  const result = user.id
    ? await api.admin.updateUser(user.id, payload)
    : await api.admin.createUser(payload)

  return result.user
}

export async function saveAdminListing(listing) {
  const payload = toAdminListingPayload(listing)
  const result = listing.id
    ? await api.admin.updateListing(listing.id, payload)
    : await api.admin.createListing(payload)

  return result.listing
}

export async function updateAdminListingStatus(id, status) {
  const { listing } = await api.admin.updateListing(id, { status })
  return listing
}

export async function updateAdminUserVerification(id, verified) {
  const { user } = await api.admin.setLandlordVerification(id, verified)
  return user
}
