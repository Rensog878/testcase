import { useLayoutEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { CheckoutProvider } from './hooks/useCheckout'
import { STAFF_HOME } from './hooks/checkoutRules'
import PrivateRoute from './components/PrivateRoute'

// Auth Pages
import Login    from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ProductDetail from './pages/ProductDetail'
import IngredientDetail from './pages/IngredientDetail'
import Navigation from './components/home/Navigation'
import Footer from './components/home/Footer'
import MobileBottomNav from './components/home/MobileBottomNav'
import StoreTopChrome from './components/home/StoreTopChrome'
import PageTranslator from './components/PageTranslator'
import Storefront from './storefront/Storefront'
import StorePopups from './storefront/StorePopups'
import StoreSection from './pages/StoreSection'
import Categories from './pages/Categories'
import AllProducts from './pages/AllProducts'
import Wishlist from './pages/Wishlist'
import OrderStatus from './pages/OrderStatus'
import Checkout from './pages/Checkout'
import Blog from './pages/Blog'
import BlogDetail from './pages/BlogDetail'

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
import AdminBlogs from './pages/admin/Blogs'
import AdminVideos from './pages/admin/Videos'

// Employee Pages
import EmployeeLayout    from './layouts/EmployeeLayout'
import EmployeeDashboard from './pages/employee/Dashboard'

// Delivery Pages
import DeliveryLayout    from './layouts/DeliveryLayout'
import DeliveryDashboard from './pages/delivery/Dashboard'

// Billing Pages
import BillingLayout    from './layouts/BillingLayout'
import BillingDashboard from './pages/billing/Dashboard'
import InvoiceHistory from './pages/billing/InvoiceHistory'

// Tickets & Chat (shared between admin/employee)
import Tickets     from './pages/shared/Tickets'
import ChatRecords from './pages/shared/ChatRecords'

function PublicPageShell({ children }) {
  return <><Navigation /><main className="public-page-shell">{children}</main><Footer /></>
}

// Staff are taken to their portal; everyone else gets the storefront.
function HomePage() {
  const { user } = useAuth()
  const redirectPath = user && STAFF_HOME[user.role]
  return redirectPath ? <Navigate to={redirectPath} replace /> : <Storefront />
}

// The store pages: storefront, shop, blog, product, basket and orders.
const STORE_PAGES = /^\/(?:$|products|shop|categories|crops|brands|blog|product\/|wishlist|orders|checkout|cart)/

const useStorePage = () => STORE_PAGES.test(useLocation().pathname)

// On store pages the top header (ticker + header row) and the phone bottom bar
// are drawn once here, outside the routes, so they stay mounted - same
// elements, same place - while the pages change between them.
function StoreTop() {
  return useStorePage() ? <StoreTopChrome /> : null
}

function StoreBottom() {
  const { pathname } = useLocation()
  // A new page starts at the top; a link to a section scrolls there instead.
  useLayoutEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0)
  }, [pathname])
  return STORE_PAGES.test(pathname) ? <MobileBottomNav /> : null
}

// Store pages in the chosen language; staff portals in English.
function StoreTranslation() {
  return <PageTranslator enabled={useStorePage()} />
}

export default function App() {
  const storePage = useStorePage()
  // Every store page adds to the same basket and opens the same floating
  // checkout and sign-in card, drawn once here over whichever page is open.
  return (
    <CheckoutProvider enabled={storePage}>
      <StoreTop />
      <Routes>
        {/* Public Home - the storefront */}
        <Route path="/"        element={<HomePage />} />
        {/* Old links: the floating checkout, over the store home page */}
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/cart"    element={<Navigate to="/checkout" replace />} />
        <Route path="/login"   element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/product/:id" element={<PublicPageShell><ProductDetail /></PublicPageShell>} />
        <Route path="/product/:id/ingredients" element={<PublicPageShell><IngredientDetail /></PublicPageShell>} />
        <Route path="/wishlist" element={<PublicPageShell><Wishlist /></PublicPageShell>} />
        <Route path="/orders" element={<PublicPageShell><OrderStatus /></PublicPageShell>} />
        <Route path="/order-status" element={<Navigate to="/orders" replace />} />
        <Route path="/products" element={<AllProducts />} />
        <Route path="/shop" element={<Navigate to="/products" replace />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/crops" element={<PublicPageShell><StoreSection type="crops" /></PublicPageShell>} />
        <Route path="/brands" element={<PublicPageShell><StoreSection type="brands" /></PublicPageShell>} />
        <Route path="/blog" element={<PublicPageShell><Blog /></PublicPageShell>} />
        <Route path="/blog/:id" element={<PublicPageShell><BlogDetail /></PublicPageShell>} />

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
          <Route path="blogs"      element={<AdminBlogs />} />
          <Route path="videos"     element={<AdminVideos />} />
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
          <Route path="history" element={<InvoiceHistory />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {storePage && <StorePopups />}
      <StoreBottom />
      <StoreTranslation />
    </CheckoutProvider>
  )
}
