import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="h-6 w-6 rounded-full border-2 border-orange border-t-transparent animate-spin" />
    </div>
  )
}

import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { useAuth } from '@/contexts/AuthContext'

// Eagerly load landing + login (first paint)
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'

// Lazy-load everything behind auth
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const AllShops = lazy(() => import('@/pages/AllShops'))
const ShopDetail = lazy(() => import('@/pages/ShopDetail'))
const RepairOrders = lazy(() => import('@/pages/RepairOrders'))
const Technicians = lazy(() => import('@/pages/Technicians'))
const Customers = lazy(() => import('@/pages/Customers'))
const CustomerProfile = lazy(() => import('@/pages/CustomerProfile'))
const TechnicianProfile = lazy(() => import('@/pages/TechnicianProfile'))
const TechBoard = lazy(() => import('@/pages/TechBoard'))
const Parts = lazy(() => import('@/pages/Parts'))
const Estimates = lazy(() => import('@/pages/Estimates'))
const Invoices = lazy(() => import('@/pages/Invoices'))
const Messages = lazy(() => import('@/pages/Messages'))
const Inspections = lazy(() => import('@/pages/Inspections'))
const Payments = lazy(() => import('@/pages/Payments'))
const Reports = lazy(() => import('@/pages/Reports'))
const Settings = lazy(() => import('@/pages/Settings'))
const CustomerStatus = lazy(() => import('@/pages/CustomerStatus'))
const Dispatch = lazy(() => import('@/pages/Dispatch'))
const Appointments = lazy(() => import('@/pages/Appointments'))
const Terms = lazy(() => import('@/pages/Terms'))
const Privacy = lazy(() => import('@/pages/Privacy'))
const DPA = lazy(() => import('@/pages/DPA'))
const VsTekmetric = lazy(() => import('@/pages/VsTekmetric'))
const VsShopmonkey = lazy(() => import('@/pages/VsShopmonkey'))
const VsMitchell1 = lazy(() => import('@/pages/VsMitchell1'))
const VsShopWare = lazy(() => import('@/pages/VsShopWare'))
const VsROWriter = lazy(() => import('@/pages/VsROWriter'))

// ── guards ───────────────────────────────────────────────────────────────────

function RequireOwner({ children }) {
  const { session } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  if (session.role === 'tech') return <Navigate to="/tech-board" replace />
  return children
}

function RequireOwnerOnly({ children }) {
  const { session } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  if (session.role === 'tech') return <Navigate to="/tech-board" replace />
  if (session.role === 'advisor') return <Navigate to="/dashboard" replace />
  return children
}

function RequireTech({ children }) {
  const { session } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  if (session.role === 'owner' || session.role === 'advisor') return <Navigate to="/dashboard" replace />
  return children
}

// ── admin shell ──────────────────────────────────────────────────────────────

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuOpen={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/shops" element={<RequireOwnerOnly><AllShops /></RequireOwnerOnly>} />
            <Route path="/shops/:id" element={<ShopDetail />} />
            <Route path="/repair-orders" element={<RepairOrders />} />
            <Route path="/estimates" element={<Estimates />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/inspections" element={<Inspections />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/dispatch" element={<Dispatch />} />
            <Route path="/technicians" element={<RequireOwnerOnly><Technicians /></RequireOwnerOnly>} />
            <Route path="/technicians/:id" element={<RequireOwnerOnly><TechnicianProfile /></RequireOwnerOnly>} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerProfile />} />
            <Route path="/parts" element={<Parts />} />
            <Route path="/reports" element={<RequireOwnerOnly><Reports /></RequireOwnerOnly>} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-4xl font-bold text-text-muted mb-2">404</div>
                  <div className="text-sm text-text-muted">Page not found</div>
                </div>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </div>
  )
}

// ── root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/status/:roId" element={<CustomerStatus />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/dpa" element={<DPA />} />
        <Route path="/compare/tekmetric" element={<VsTekmetric />} />
        <Route path="/compare/shopmonkey" element={<VsShopmonkey />} />
        <Route path="/compare/mitchell1" element={<VsMitchell1 />} />
        <Route path="/compare/shop-ware" element={<VsShopWare />} />
        <Route path="/compare/ro-writer" element={<VsROWriter />} />
        <Route
          path="/tech-board"
          element={
            <RequireTech>
              <TechBoard />
            </RequireTech>
          }
        />
        <Route
          path="/*"
          element={
            <RequireOwner>
              <AppShell />
            </RequireOwner>
          }
        />
      </Routes>
    </Suspense>
  )
}
