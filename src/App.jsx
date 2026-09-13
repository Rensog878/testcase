import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'

// Auth Pages
import Login    from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ProductDetail from './pages/ProductDetail'
import IngredientDetail from './pages/IngredientDetail'
import Navigation from './components/home/Navigation'
import Footer from './components/home/Footer'
import StoreSection from './pages/StoreSection'
import Categories from './pages/Categories'
import Wishlist from './pages/Wishlist'
import OrderStatus from './pages/OrderStatus'

// Admin Pages
import AdminLayout    from './layouts/AdminLayout'
import AdminDashboard from './pages/admin/Dashboard'
import AdminCMS       from './pages/admin/CMS'
import AdminProducts  from './pages/admin/Products'
import AdminOrders    from './pages/admin/Orders'
import AdminSubscribers from './pages/admin/Subscribers'
import AdminAnalytics from './pages/admin/Analytics'
import AdminUsers     from './pages/admin/Users'
import AdminProfileFields from './pages/admin/ProfileFields'
import Employees from './pages/admin/Employees'
import SupportTickets from './pages/admin/SupportTickets'

// Employee Pages
import EmployeeLayout    from './layouts/EmployeeLayout'
import EmployeeDashboard from './pages/employee/Dashboard'

// Delivery Pages
import DeliveryLayout    from './layouts/DeliveryLayout'
import DeliveryDashboard from './pages/delivery/Dashboard'

// Billing Pages
import BillingLayout    from './layouts/BillingLayout'
import BillingDashboard from './pages/billing/Dashboard'

// Tickets & Chat (shared between admin/employee)
import Tickets     from './pages/shared/Tickets'
import ChatRecords from './pages/shared/ChatRecords'

function PublicPageShell({ children }) {
  return <><Navigation /><main className="public-page-shell">{children}</main><Footer /></>
}

// The public home is the standalone storefront page. It is loaded as the page
// itself, not in an iframe: an iframe sized 100vh is taller than a phone screen
// while the browser toolbar shows, which hid the storefront's fixed bottom
// navigation. index.html redirects before the bundle loads; this covers
// in-app navigation to "/" (Back to store, after registering, unknown routes).
function StorefrontRedirect() {
  useEffect(() => {
    window.location.replace(`/storefront.html${window.location.search}${window.location.hash}`)
  }, [])
  return null
}

export default function App() {
  const { user } = useAuth()

  const HomePage = () => {
    // If user is logged in as admin/staff, redirect them to their portal
    if (user) {
      const roleMap = { admin: '/admin', employee: '/employee', delivery: '/delivery', billing: '/billing' }
      const redirectPath = roleMap[user.role]
      if (redirectPath) {
        return <Navigate to={redirectPath} replace />
      }
    }
    // Public visitors and farmers get the storefront
    return <StorefrontRedirect />
  }

  return (
    <Routes>
      {/* Public Home - Vanilla HTML Page */}
      <Route path="/"        element={<HomePage />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/product/:id" element={<PublicPageShell><ProductDetail /></PublicPageShell>} />
      <Route path="/product/:id/ingredients" element={<PublicPageShell><IngredientDetail /></PublicPageShell>} />
      <Route path="/wishlist" element={<PublicPageShell><Wishlist /></PublicPageShell>} />
      <Route path="/orders" element={<PublicPageShell><OrderStatus /></PublicPageShell>} />
      <Route path="/products" element={<PublicPageShell><StoreSection type="products" /></PublicPageShell>} />
      <Route path="/categories" element={<Categories />} />
      <Route path="/crops" element={<PublicPageShell><StoreSection type="crops" /></PublicPageShell>} />
      <Route path="/brands" element={<PublicPageShell><StoreSection type="brands" /></PublicPageShell>} />
      <Route path="/soil-analyzer" element={<PublicPageShell><StoreSection type="soil" /></PublicPageShell>} />
      <Route path="/whatsapp-ai" element={<PublicPageShell><StoreSection type="n8n" /></PublicPageShell>} />
      <Route path="/support" element={<PublicPageShell><StoreSection type="support" /></PublicPageShell>} />
      <Route path="/agronomists" element={<PublicPageShell><StoreSection type="agronomists" /></PublicPageShell>} />

      {/* Admin Routes — signed-out visitors get the admin sign-in here */}
      <Route path="/admin" element={<PrivateRoute allowedRoles={['admin']} signIn={<Login />}><AdminLayout /></PrivateRoute>}>
        <Route index             element={<AdminDashboard />} />
        <Route path="cms"        element={<AdminCMS />} />
        <Route path="users"      element={<AdminUsers />} />
        <Route path="profile-fields" element={<AdminProfileFields />} />
        <Route path="products"   element={<AdminProducts />} />
        <Route path="orders"     element={<AdminOrders />} />
        <Route path="subscribers" element={<AdminSubscribers />} />
        <Route path="analytics"  element={<AdminAnalytics />} />
        <Route path="employees"  element={<Employees />} />
        <Route path="support-tickets" element={<SupportTickets />} />
        <Route path="tickets"    element={<Tickets />} />
        <Route path="chat"       element={<ChatRecords />} />
      </Route>

      {/* Employee Routes */}
      <Route path="/employee" element={<PrivateRoute allowedRoles={['employee']}><EmployeeLayout /></PrivateRoute>}>
        <Route index element={<EmployeeDashboard />} />
        <Route path="tickets" element={<Tickets />} />
      </Route>

      {/* Delivery Routes */}
      <Route path="/delivery" element={<PrivateRoute allowedRoles={['delivery']}><DeliveryLayout /></PrivateRoute>}>
        <Route index element={<DeliveryDashboard />} />
      </Route>

      {/* Billing Routes */}
      <Route path="/billing" element={<PrivateRoute allowedRoles={['billing']}><BillingLayout /></PrivateRoute>}>
        <Route index element={<BillingDashboard />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
