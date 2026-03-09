import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Public Pages
import LandingPage from './pages/public/LandingPage'
import ListingsPage from './pages/public/ListingsPage'
import SingleListingPage from './pages/public/SingleListingPage'

import MaintenancePage from './pages/public/MaintenancePage'

// Auth Pages
import StudentLogin from './pages/auth/StudentLogin'
import StudentSignup from './pages/auth/StudentSignup'
import LandlordLogin from './pages/auth/LandlordLogin'
import LandlordSignup from './pages/auth/LandlordSignup'

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard'
import MyChats from './pages/student/MyChats'
import MyViewings from './pages/student/MyViewings'
import StudentProfile from './pages/student/StudentProfile'

// Landlord Pages
import LandlordDashboard from './pages/landlord/LandlordDashboard'
import MyListings from './pages/landlord/MyListings'
import CreateListing from './pages/landlord/CreateListing'
import ViewingRequests from './pages/landlord/ViewingRequests'

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import Verifications from './pages/admin/Verifications'
import Disputes from './pages/admin/Disputes'

import ProtectedRoute from './components/common/ProtectedRoute'

import LandlordChats from './pages/landlord/LandlordChats'

import LandlordProfile from './pages/landlord/LandlordProfile'

// 🔧 MAINTENANCE MODE - set to true to show maintenance page
const MAINTENANCE_MODE = false

function App() {
  if (MAINTENANCE_MODE) {
    return <MaintenancePage />
  }

  return (
    <BrowserRouter>
      <Routes>

        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/listings" element={<ListingsPage />} />
        <Route path="/listings/:id" element={<SingleListingPage />} />

        {/* Auth Routes */}
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/student/signup" element={<StudentSignup />} />
        <Route path="/landlord/login" element={<LandlordLogin />} />
        <Route path="/landlord/signup" element={<LandlordSignup />} />

        {/* Student Routes - protected */}
        <Route path="/student/dashboard" element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        } />
        <Route path="/student/chats" element={
          <ProtectedRoute allowedRoles={['student']}>
            <MyChats />
          </ProtectedRoute>
        } />
        <Route path="/student/viewings" element={
          <ProtectedRoute allowedRoles={['student']}>
            <MyViewings />
          </ProtectedRoute>
        } />
        <Route path="/student/profile" element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentProfile />
          </ProtectedRoute>
        } />

        {/* Landlord Routes - protected */}
        <Route path="/landlord/dashboard" element={
          <ProtectedRoute allowedRoles={['landlord']}>
            <LandlordDashboard />
          </ProtectedRoute>
        } />
        <Route path="/landlord/listings" element={
          <ProtectedRoute allowedRoles={['landlord']}>
            <MyListings />
          </ProtectedRoute>
        } />
        <Route path="/landlord/listings/create" element={
          <ProtectedRoute allowedRoles={['landlord']}>
            <CreateListing />
          </ProtectedRoute>
        } />
        <Route path="/landlord/viewings" element={
          <ProtectedRoute allowedRoles={['landlord']}>
            <ViewingRequests />
          </ProtectedRoute>
        } />
        <Route path="/landlord/profile" element={<LandlordProfile />} />

        {/* Admin Routes - protected */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/verifications" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Verifications />
          </ProtectedRoute>
        } />
        <Route path="/admin/disputes" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Disputes />
          </ProtectedRoute>
        } />

        <Route path="/landlord/chats" element={
          <ProtectedRoute allowedRoles={['landlord']}>
            <LandlordChats />
          </ProtectedRoute>
        } />

      </Routes>
    </BrowserRouter>
  )
}

export default App