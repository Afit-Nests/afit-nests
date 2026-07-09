import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/common/ProtectedRoute'

const LandingPage = lazy(() => import('./pages/public/LandingPage'))
const ListingsPage = lazy(() => import('./pages/public/ListingsPage'))
const SingleListingPage = lazy(() => import('./pages/public/SingleListingPage'))
const MaintenancePage = lazy(() => import('./pages/public/MaintenancePage'))

const StudentLogin = lazy(() => import('./pages/auth/StudentLogin'))
const StudentSignup = lazy(() => import('./pages/auth/StudentSignup'))
const LandlordLogin = lazy(() => import('./pages/auth/LandlordLogin'))
const LandlordSignup = lazy(() => import('./pages/auth/LandlordSignup'))
const AdminLogin = lazy(() => import('./pages/auth/AdminLogin'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))

const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'))
const MyChats = lazy(() => import('./pages/student/MyChats'))
const MyViewings = lazy(() => import('./pages/student/MyViewings'))
const StudentProfile = lazy(() => import('./pages/student/StudentProfile'))

const LandlordDashboard = lazy(() => import('./pages/landlord/LandlordDashboard'))
const MyListings = lazy(() => import('./pages/landlord/MyListings'))
const CreateListing = lazy(() => import('./pages/landlord/CreateListing'))
const ViewingRequests = lazy(() => import('./pages/landlord/ViewingRequests'))
const LandlordChats = lazy(() => import('./pages/landlord/LandlordChats'))
const LandlordProfile = lazy(() => import('./pages/landlord/LandlordProfile'))

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminCMS = lazy(() => import('./pages/admin/AdminCMS'))
const Verifications = lazy(() => import('./pages/admin/Verifications'))
const PendingAllocations = lazy(() => import('./pages/admin/PendingAllocations'))
const Disputes = lazy(() => import('./pages/admin/Disputes'))

const MAINTENANCE_MODE = false

function PageLoader() {
  return (
    <div className="page-loader">
      <div className="page-loader-mark">AFIT</div>
      <div className="page-loader-line" />
    </div>
  )
}

function ProtectedPage({ roles, children }) {
  return (
    <ProtectedRoute allowedRoles={roles}>
      {children}
    </ProtectedRoute>
  )
}

function App() {
  useEffect(() => {
    const prefetch = () => {
      import('./pages/public/ListingsPage')
      import('./pages/admin/AdminDashboard')
      import('./pages/admin/AdminCMS')
      import('./pages/admin/Verifications')
      import('./pages/admin/PendingAllocations')
    }

    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(prefetch, { timeout: 2500 })
      return () => window.cancelIdleCallback?.(id)
    }

    const timer = window.setTimeout(prefetch, 1800)
    return () => window.clearTimeout(timer)
  }, [])

  if (MAINTENANCE_MODE) {
    return (
      <Suspense fallback={<PageLoader />}>
        <MaintenancePage />
      </Suspense>
    )
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/listings" element={<ListingsPage />} />
          <Route path="/listings/:id" element={<SingleListingPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/student/signup" element={<StudentSignup />} />
          <Route path="/landlord/login" element={<LandlordLogin />} />
          <Route path="/landlord/signup" element={<LandlordSignup />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          <Route path="/student/dashboard" element={<ProtectedPage roles={['student']}><StudentDashboard /></ProtectedPage>} />
          <Route path="/student/chats" element={<ProtectedPage roles={['student']}><MyChats /></ProtectedPage>} />
          <Route path="/student/viewings" element={<ProtectedPage roles={['student']}><MyViewings /></ProtectedPage>} />
          <Route path="/student/profile" element={<ProtectedPage roles={['student']}><StudentProfile /></ProtectedPage>} />

          <Route path="/landlord/dashboard" element={<ProtectedPage roles={['landlord']}><LandlordDashboard /></ProtectedPage>} />
          <Route path="/landlord/listings" element={<ProtectedPage roles={['landlord']}><MyListings /></ProtectedPage>} />
          <Route path="/landlord/listings/create" element={<ProtectedPage roles={['landlord']}><CreateListing /></ProtectedPage>} />
          <Route path="/landlord/viewings" element={<ProtectedPage roles={['landlord']}><ViewingRequests /></ProtectedPage>} />
          <Route path="/landlord/profile" element={<ProtectedPage roles={['landlord']}><LandlordProfile /></ProtectedPage>} />
          <Route path="/landlord/chats" element={<ProtectedPage roles={['landlord']}><LandlordChats /></ProtectedPage>} />

          <Route path="/admin/dashboard" element={<ProtectedPage roles={['admin']}><AdminDashboard /></ProtectedPage>} />
          <Route path="/admin/cms" element={<ProtectedPage roles={['admin']}><AdminCMS /></ProtectedPage>} />
          <Route path="/admin/verifications" element={<ProtectedPage roles={['admin']}><Verifications /></ProtectedPage>} />
          <Route path="/admin/pending-allocations" element={<ProtectedPage roles={['admin']}><PendingAllocations /></ProtectedPage>} />
          <Route path="/admin/disputes" element={<ProtectedPage roles={['admin']}><Disputes /></ProtectedPage>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
