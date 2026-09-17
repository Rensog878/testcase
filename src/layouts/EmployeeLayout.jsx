import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { Bell, Menu, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const EMP_NAV = [
  { title: 'Workspace', links: [
    { to: '/employee',        end: true, icon: '\u2592', label: 'Dashboard' },
    { to: '/employee',                 icon: '\u25ab', label: 'Inventory & Stock' },
    { to: '/employee',                 icon: '\u2197', label: 'Orders & Dispatch' },
    { to: '/employee',                 icon: '\u25ce', label: 'Customer CRM' },
    { to: '/employee/tickets',         icon: '\u2610', label: 'Support Tickets', badge: 'new' },
  ]},
  { title: 'Management', links: [
    { to: '/employee',                 icon: '\u2713', label: 'Tasks & Approvals' },
    { to: '/employee',                 icon: '\u25cc', label: 'Reports' },
    { to: '/employee',                 icon: '\ud83d\udc65', label: 'My Profile' },
  ]}
]

export default function EmployeeLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()
  return (
    <div className="app-layout">
      <Sidebar items={EMP_NAV} roleName="Employee" roleEmoji="🏭" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content employee-workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open navigation menu"><Menu size={20} /></button>
            <div>
              <div className="topbar-title">Employee ERP Portal</div>
              <div className="topbar-subtitle">Inventory, Stock & Task Management</div>
            </div>
          </div>
          <div className="topbar-right employee-header-actions">
            <button className="employee-icon-button" title="Search workspace"><Search size={18} /></button>
            <button className="employee-icon-button employee-notification" title="Notifications"><Bell size={18} /><span>3</span></button>
            <LanguageSwitcher />
            <span className="employee-user-chip"><span className="employee-avatar">MK</span><span><strong>{user?.name || 'Muthuvel K'}</strong><small>Operations</small></span></span>
          </div>
        </header>
        <main className="page-content"><Outlet /></main>
      </div>
    </div>
  )
}

