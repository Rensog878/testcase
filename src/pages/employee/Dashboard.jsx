import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { ArrowUpRight, Box, ClipboardList, Download, MoreHorizontal, PackageCheck, Plus, Search, Truck, Users, AlertTriangle } from 'lucide-react'

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState('inventory')
  const [query, setQuery] = useState('')
  const [inventory, setInventory] = useState([])
  const [products, setProducts] = useState([])
  const [tasks, setTasks] = useState([])
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      axios.get('/api/inventory'),
      axios.get('/api/products'),
      axios.get('/api/staff-tasks'),
      axios.get('/api/orders')
    ]).then(([inventoryRes, productsRes, tasksRes, ordersRes]) => {
      if (cancelled) return
      const liveProducts = productsRes.data.data || []
      const liveInventory = inventoryRes.data.data || []
      const liveOrders = ordersRes.data.data || []
      setProducts(liveProducts)
      setInventory(liveInventory)
      setTasks(tasksRes.data.data || [])
      setOrders(liveOrders)
      setCustomers([...new Map(liveOrders.map(order => [order.userId || order.customerPhone, {
        name: order.customerName || 'Customer',
        location: order.address || 'Delivery address saved',
        orders: 1,
        value: Number(order.total || 0),
        stage: order.deliveryStatus || 'Confirmed'
      }])).values()])
    }).catch(() => toast.error('Could not load the employee workspace data'))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const visibleInventory = (inventory.length ? inventory : products.map(product => ({
    sku: product.id,
    name: product.name,
    batch: product.selectedPack || 'Standard',
    expiry: 'Not recorded',
    stock: Number(product.stock || 0),
    min: 20,
    unit: 'units',
    status: Number(product.stock || 0) === 0 ? 'out' : Number(product.stock || 0) < 20 ? 'low' : 'ok'
  }))).filter(item => `${item.name || ''} ${item.sku || ''}`.toLowerCase().includes(query.toLowerCase()))
  const visibleOrders = orders.filter(order => `${order.id} ${order.customerName || ''}`.toLowerCase().includes(query.toLowerCase()))
  const visibleTasks = tasks.filter(task => `${task.title || ''} ${task.assignedTo || ''}`.toLowerCase().includes(query.toLowerCase()))
  const activeOrders = orders.filter(order => !['Delivered', 'Cancelled'].includes(order.deliveryStatus || order.status))
  const stockUnits = visibleInventory.reduce((sum, item) => sum + Number(item.stock || 0), 0)
  const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0)

  return (
    <div className="animate-fade-in employee-dashboard">
      <div className="page-header">
        <div><p className="employee-eyebrow">OPERATIONS WORKSPACE</p><h1>Good morning</h1><p>Live inventory, order, customer, and task data from the Sathyam Bio database.</p></div>
        <div className="employee-page-actions"><button className="btn btn-secondary" onClick={() => window.print()}><Download size={16} /> Export report</button><button className="btn btn-primary" onClick={() => setActiveTab('inventory')}><Plus size={17} /> New stock movement</button></div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="employee-stat"><span className="employee-stat-icon coral"><PackageCheck size={19} /></span><div><strong>₹{revenue.toLocaleString()}</strong><span>Order value</span><em>{orders.length} recorded orders</em></div></div>
        <div className="employee-stat"><span className="employee-stat-icon blue"><Box size={19} /></span><div><strong>{stockUnits}</strong><span>Units in stock</span><em>{visibleInventory.length} products tracked</em></div></div>
        <div className="employee-stat"><span className="employee-stat-icon amber"><Truck size={19} /></span><div><strong>{activeOrders.length}</strong><span>Orders to dispatch</span><em>{orders.length ? 'Live order queue' : 'No active orders'}</em></div></div>
        <div className="employee-stat"><span className="employee-stat-icon green"><Users size={19} /></span><div><strong>{customers.length}</strong><span>Active customers</span><em>From order history</em></div></div>
      </div>

      <div className="employee-overview-grid">
        <div className="card employee-chart-card">
          <div className="card-header"><div><div className="card-title">Revenue overview</div><div className="card-subtitle">Sales performance for the last 7 days</div></div><button className="employee-more" title="More revenue options"><MoreHorizontal size={18} /></button></div>
          <div className="revenue-total">₹{revenue.toLocaleString()} <span>{orders.length ? `${orders.length} orders loaded` : 'No orders yet'}</span></div>
          <div className="employee-live-note"><span className="employee-live-dot" /> Live data from orders and products</div>
          <div className="chart-labels"><span>{loading ? 'Loading...' : `${visibleInventory.length} products`}</span><span>{activeOrders.length} active orders</span></div>
        </div>
        <div className="card attention-card"><div className="card-header"><div><div className="card-title">Needs attention</div><div className="card-subtitle">Low stock and open work</div></div><AlertTriangle size={19} color="#e58a38" /></div><div className="attention-list"><div><strong>{visibleInventory.filter(item => item.status === 'low' || Number(item.stock) === 0).length}</strong><span>low-stock products</span></div><div><strong>{tasks.filter(task => task.status !== 'Done').length}</strong><span>open tasks</span></div><div><strong>{activeOrders.length}</strong><span>orders awaiting action</span></div></div></div>
      </div>

      <div className="employee-section-heading"><div><h2>Operations workspace</h2><p>Manage your daily inventory, orders, customers, and team activity.</p></div><div className="employee-search"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search inventory" /></div></div>
      <div className="tabs employee-tabs">
        {[['inventory', 'Inventory'], ['orders', 'Orders'], ['customers', 'Customers'], ['tasks', 'Tasks']].map(([key, label]) => (
          <button key={key} className={`tab-btn ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>{label}</button>
        ))}
      </div>

      {activeTab === 'inventory' && (
        <div className="card">
          <div className="table-heading"><div><div className="card-title">Inventory health</div><div className="card-subtitle">Track stock levels, batches, and expiry dates</div></div><button className="btn btn-secondary btn-sm"><Plus size={15} /> Add product</button></div><div className="table-wrap">
            <table>
              <thead><tr><th>SKU</th><th>Product</th><th>Batch</th><th>Expiry</th><th>Stock</th><th>Min Stock</th><th>Status</th></tr></thead>
              <tbody>
                {visibleInventory.map(i => (
                  <tr key={i.sku}>
                    <td><code style={{ color: 'var(--brand-400)', fontSize: '0.8rem' }}>{i.sku}</code></td>
                    <td style={{ fontWeight: 600 }}>{i.name}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{i.batch}</td>
                    <td style={{ fontSize: '0.8rem' }}>{i.expiry}</td>
                    <td style={{ fontWeight: 700 }}>{i.stock} {i.unit}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{i.min} {i.unit}</td>
                    <td>
                      <span className={`badge ${i.status === 'ok' ? 'badge-green' : i.status === 'low' ? 'badge-yellow' : 'badge-red'}`}>
                        {i.status === 'ok' ? '✓ OK' : i.status === 'low' ? '⚠ Low' : '✕ Out'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'orders' && <div className="card"><div className="table-heading"><div><div className="card-title">Recent orders</div><div className="card-subtitle">Orders requiring warehouse action</div></div><button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('orders')}>Refresh view <ArrowUpRight size={14} /></button></div><div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Amount</th><th>Status</th><th>Placed</th></tr></thead><tbody>{visibleOrders.map(order => <tr key={order.id}><td><strong>{order.id}</strong></td><td>{order.customerName}</td><td>{Array.isArray(order.items) ? order.items.map(item => `${item.name} x${item.qty || 1}`).join(', ') : '-'}</td><td><strong>₹{Number(order.total || 0).toLocaleString()}</strong></td><td><span className="employee-status ready">{order.deliveryStatus || order.status || 'Confirmed'}</span></td><td>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : '-'}</td></tr>)}</tbody></table></div></div>}

      {activeTab === 'customers' && <div className="card"><div className="table-heading"><div><div className="card-title">Customer relationships</div><div className="card-subtitle">Customers found in live orders</div></div><button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('customers')}>Refresh view</button></div><div className="table-wrap"><table><thead><tr><th>Customer</th><th>Location</th><th>Orders</th><th>Lifetime value</th><th>Segment</th></tr></thead><tbody>{customers.map(customer => <tr key={customer.name}><td><div className="customer-cell"><span>{customer.name.split(' ').map(part => part[0]).join('')}</span><strong>{customer.name}</strong></div></td><td>{customer.location}</td><td>{customer.orders}</td><td><strong>₹{customer.value.toLocaleString()}</strong></td><td><span className="employee-status ready">{customer.stage}</span></td></tr>)}</tbody></table></div></div>}

      {activeTab === 'tasks' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Task</th><th>Assigned To</th><th>Priority</th><th>Due</th><th>Status</th></tr></thead>
              <tbody>
                {visibleTasks.map(t => (
                  <tr key={t.id}>
                    <td>{t.id}</td>
                    <td style={{ fontWeight: 600, maxWidth: 220 }}>{t.title}</td>
                    <td>{t.assignee}</td>
                    <td><span className={`badge ${t.priority === 'High' ? 'badge-red' : 'badge-yellow'}`}>{t.priority}</span></td>
                    <td style={{ fontSize: '0.8rem' }}>{t.due}</td>
                    <td><span className={`badge ${t.status === 'Done' ? 'badge-green' : t.status === 'In Progress' ? 'badge-blue' : 'badge-gray'}`}>{t.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
