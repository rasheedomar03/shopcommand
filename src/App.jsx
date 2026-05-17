import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { useAuth } from '@/contexts/AuthContext'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import AllShops from '@/pages/AllShops'
import ShopDetail from '@/pages/ShopDetail'
import RepairOrders from '@/pages/RepairOrders'
import Technicians from '@/pages/Technicians'
import Customers from '@/pages/Customers'
import CustomerProfile from '@/pages/CustomerProfile'
import TechnicianProfile from '@/pages/TechnicianProfile'
import TechBoard from '@/pages/TechBoard'
import Parts from '@/pages/Parts'
import Estimates from '@/pages/Estimates'
import Invoices from '@/pages/Invoices'
import Messages from '@/pages/Messages'
import Inspections from '@/pages/Inspections'
import Payments from '@/pages/Payments'
import Reports from '@/pages/Reports'
import Settings from '@/pages/Settings'
import CustomerStatus from '@/pages/CustomerStatus'
import Dispatch from '@/pages/Dispatch'
import Appointments from '@/pages/Appointments'
import Terms from '@/pages/Terms'
import Privacy from '@/pages/Privacy'
import DPA from '@/pages/DPA'
import VsTekmetric from '@/pages/VsTekmetric'
import VsShopmonkey from '@/pages/VsShopmonkey'
import VsMitchell1 from '@/pages/VsMitchell1'
import VsShopWare from '@/pages/VsShopWare'
import VsROWriter from '@/pages/VsROWriter'

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
    <>
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
    </>
  )
}
