import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { Menu } from 'lucide-react'

const BILL_NAV = [{ title: 'BILLING', links: [
  { to: '/billing', end: true, icon: '🧾', label: 'Create invoice' },
  { to: '/billing/history', icon: '🗂️', label: 'Invoice history' },
] }]

export default function BillingLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  return (
    <div className="app-layout">
      <Sidebar items={BILL_NAV} roleName="Billing" roleEmoji="🧾" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open navigation menu"><Menu size={20} /></button>
            <div>
              <div className="topbar-title">Dashboard</div>
              <div className="topbar-subtitle">GST Invoice Generation — GSTIN: 33AABCS1234F1Z8</div>
            </div>
          </div>
          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <LanguageSwitcher />
            <span className="badge badge-teal topbar-role">BILLING</span>
          </div>
        </header>
        <main className="page-content"><Outlet /></main>
      </div>
    </div>
  )
}

