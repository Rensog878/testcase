import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'sonner'

const AuthContext = createContext(null)

export const useAuth = () => {
const ctx = useContext(AuthContext)
if (!ctx) throw new Error('useAuth must be used within AuthProvider')
return ctx
}

// Role → Default Route mapping
// Farmers have no separate portal - the storefront homepage is their home.
export const ROLE_HOME = {
farmer: '/',
admin: '/admin',
employee: '/employee',
delivery: '/delivery',
billing: '/billing',
}

// Mock employees for admin view
export const MOCK_EMPLOYEES = [
{ _id: 'u3', name: 'Muthuvel K (QC)', mobile: '9234567890', email: 'employee@demo.com', department: 'Quality Control', joinDate: '2023-01-15', lastLogin: '2024-09-02 14:30:00', status: 'active' },
{ _id: 'u6', name: 'Priya Sharma', mobile: '9567890123', email: 'priya@demo.com', department: 'Operations', joinDate: '2023-06-20', lastLogin: '2024-09-02 13:45:00', status: 'active' },
{ _id: 'u7', name: 'Arun Kumar', mobile: '9678901234', email: 'arun@demo.com', department: 'Warehouse', joinDate: '2023-04-10', lastLogin: '2024-09-01 10:15:00', status: 'active' },
]

// Get all employees (admin only)
export const getEmployeeList = () => {
return MOCK_EMPLOYEES
}

// Get employee details
export const getEmployeeDetails = (employeeId) => {
return MOCK_EMPLOYEES.find(e => e._id === employeeId)
}

const TOKEN_KEY = 'sathya_token'
const USER_KEY = 'sathya_user'

const readStoredUser = () => {
try {
const cached = localStorage.getItem(USER_KEY)
return cached ? JSON.parse(cached) : null
} catch {
return null
}
}

// Attach the current token to every API call at the moment it is sent. Setting
// a default header from an effect was too late: pages fire their first
// requests before the provider's effects have run.
axios.interceptors.request.use(config => {
const token = localStorage.getItem(TOKEN_KEY)
if (token) config.headers.Authorization = `Bearer ${token}`
return config
})

export function AuthProvider({ children }) {
const [user, setUser] = useState(readStoredUser)
const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
// While a stored session is being confirmed with the server, protected pages wait.
const [loading, setLoading] = useState(() => !!localStorage.getItem(TOKEN_KEY))

const saveSession = (nextToken, nextUser) => {
localStorage.setItem(TOKEN_KEY, nextToken)
localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
setToken(nextToken)
setUser(nextUser)
}

const clearSession = () => {
localStorage.removeItem(TOKEN_KEY)
localStorage.removeItem(USER_KEY)
setToken(null)
setUser(null)
}

// A stored session may have expired, been revoked, or come from before tokens
// were signed; the server is the only judge of that.
useEffect(() => {
if (!token) {
setLoading(false)
return
}
let cancelled = false
axios.get('/api/auth/me')
.then(({ data }) => {
if (cancelled) return
localStorage.setItem(USER_KEY, JSON.stringify(data.data))
setUser(data.data)
})
.catch(err => {
if (!cancelled && err.response?.status === 401) clearSession()
})
.finally(() => {
if (!cancelled) setLoading(false)
})
return () => { cancelled = true }
}, [])

// Any API call rejected for a missing or stale session signs the user out, so
// protected pages send them back to login instead of showing empty data.
useEffect(() => {
const interceptor = axios.interceptors.response.use(
response => response,
err => {
const url = err.config?.url || ''
if (err.response?.status === 401 && !url.startsWith('/api/auth/')) clearSession()
return Promise.reject(err)
}
)
return () => axios.interceptors.response.eject(interceptor)
}, [])

const login = async (identifier, password) => {
try {
const { data } = await axios.post('/api/auth/login', { identifier: identifier.trim(), password })
saveSession(data.token, data.user)
return data.user
} catch (err) {
throw new Error(err.response?.data?.message || 'Could not reach the server. Please try again.')
}
}

// Send a WhatsApp OTP for registration (does not create the account)
const sendRegistrationOtp = async (name, phone) => {
const { data } = await axios.post('/api/auth/send-otp', { name, phone })
return data
}

// Verify a WhatsApp OTP for registration (does not create the account)
const verifyRegistrationOtp = async (phone, otp) => {
const { data } = await axios.post('/api/auth/verify-otp', { phone, otp })
return data
}

const register = async (payload) => {
try {
const { data } = await axios.post('/api/auth/register', payload)
saveSession(data.token, data.user)
return data.user
} catch (err) {
throw new Error(err.response?.data?.message || 'Could not reach the server. Please try again.')
}
}

const logout = (showToast = true) => {
clearSession()
if (showToast) toast.success('Logged out successfully')
}

return (
<AuthContext.Provider value={{ user, token, login, register, sendRegistrationOtp, verifyRegistrationOtp, logout, loading, isAuth: !!user }}>
{children}
</AuthContext.Provider>
)
}
