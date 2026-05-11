import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import Landing from '@/pages/Landing'
import Dashboard from '@/pages/Dashboard'
import AllShops from '@/pages/AllShops'
import ShopDetail from '@/pages/ShopDetail'
import RepairOrders from '@/pages/RepairOrders'
import Technicians from '@/pages/Technicians'
import Customers from '@/pages/Customers'
import CustomerProfile from '@/pages/CustomerProfile'
import Parts from '@/pages/Parts'
import Reports from '@/pages/Reports'
import Settings from '@/pages/Settings'

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
            <Route path="/shops" element={<AllShops />} />
            <Route path="/shops/:id" element={<ShopDetail />} />
            <Route path="/repair-orders" element={<RepairOrders />} />
            <Route path="/technicians" element={<Technicians />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerProfile />} />
            <Route path="/parts" element={<Parts />} />
            <Route path="/reports" element={<Reports />} />
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/*" element={<AppShell />} />
    </Routes>
  )
}
