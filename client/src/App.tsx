import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, Box, ChevronDown,
  ChevronRight, CircleHelp, Command, CreditCard, Download, Ellipsis,
  LayoutDashboard, LifeBuoy, Menu, Package, Plus, Search, Settings2, ShoppingBag,
  ShoppingCart, Sparkles, Users, X, LogIn, LogOut,
} from 'lucide-react'
import { loadStoreData, signIn, type ApiCustomer, type ApiOrder, type ApiProduct, type ApiSummary } from './api'

type Section = 'Overview' | 'Orders' | 'Products' | 'Customers'
type Order = { id: string; customer: string; initials: string; email: string; date: string; product: string; amount: string; status: string; color: string }
type ProductRow = { name: string; category: string; sku: string; stock: number; price: string; color: string; icon: string }
type CustomerRow = { name: string; email: string; orders: number; spent: string; initials: string; color: string; lastOrderAt?: string }

const productColors = ['lavender', 'peach', 'mint', 'sky', 'rose']
const productIcons = ['◖', '▱', '◒', '▧', '⌒']
const formatMoney = (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const makeInitials = (name: string) => name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()
const formatDate = (date?: string) => date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—'


const orders: Order[] = [
  { id: '#NS-2849', customer: 'Olivia Rhye', initials: 'OR', email: 'olivia.rhye@gmail.com', date: 'Oct 24, 2025', product: 'Studio Headphones', amount: '$248.00', status: 'Paid', color: 'lavender' },
  { id: '#NS-2848', customer: 'Phoenix Baker', initials: 'PB', email: 'phoenix.baker@icloud.com', date: 'Oct 24, 2025', product: 'Everyday Tote', amount: '$84.00', status: 'Processing', color: 'peach' },
  { id: '#NS-2847', customer: 'Lana Steiner', initials: 'LS', email: 'lana.steiner@gmail.com', date: 'Oct 23, 2025', product: 'Ceramic Pour-over', amount: '$132.00', status: 'Paid', color: 'mint' },
  { id: '#NS-2846', customer: 'Demi Wilkinson', initials: 'DW', email: 'demi.wilkinson@outlook.com', date: 'Oct 23, 2025', product: 'Linen Table Set', amount: '$196.00', status: 'Refunded', color: 'sky' },
  { id: '#NS-2845', customer: 'Candice Wu', initials: 'CW', email: 'candice.wu@gmail.com', date: 'Oct 22, 2025', product: 'Studio Headphones', amount: '$248.00', status: 'Paid', color: 'rose' },
]

const products: ProductRow[] = [
  { name: 'Studio Headphones', category: 'Audio', sku: 'NS-AU-0024', stock: 48, price: '$248.00', color: 'lavender', icon: '◖' },
  { name: 'Everyday Tote', category: 'Accessories', sku: 'NS-AC-0012', stock: 124, price: '$84.00', color: 'peach', icon: '▱' },
  { name: 'Ceramic Pour-over', category: 'Home', sku: 'NS-HM-0008', stock: 7, price: '$132.00', color: 'mint', icon: '◒' },
  { name: 'Linen Table Set', category: 'Home', sku: 'NS-HM-0016', stock: 32, price: '$196.00', color: 'sky', icon: '▧' },
  { name: 'Arc Desk Lamp', category: 'Workspace', sku: 'NS-WS-0003', stock: 19, price: '$189.00', color: 'rose', icon: '⌒' },
]

const customers: CustomerRow[] = [
  { name: 'Olivia Rhye', email: 'olivia.rhye@gmail.com', orders: 12, spent: '$1,840', initials: 'OR', color: 'lavender', lastOrderAt: '2025-10-24' },
  { name: 'Phoenix Baker', email: 'phoenix.baker@icloud.com', orders: 8, spent: '$1,124', initials: 'PB', color: 'peach', lastOrderAt: '2025-10-22' },
  { name: 'Lana Steiner', email: 'lana.steiner@gmail.com', orders: 6, spent: '$986', initials: 'LS', color: 'mint', lastOrderAt: '2025-10-19' },
  { name: 'Demi Wilkinson', email: 'demi.wilkinson@outlook.com', orders: 5, spent: '$740', initials: 'DW', color: 'sky', lastOrderAt: '2025-10-16' },
  { name: 'Candice Wu', email: 'candice.wu@gmail.com', orders: 4, spent: '$612', initials: 'CW', color: 'rose', lastOrderAt: '2025-10-12' },
]

const chartSets: Record<string, number[]> = {
  'Last 7 days': [25, 35, 31, 49, 40, 59, 55, 72, 61, 77, 65, 83, 71, 91],
  'Last 30 days': [21, 33, 28, 44, 37, 53, 46, 65, 57, 71, 61, 79, 68, 88],
  'Last 90 days': [15, 28, 24, 39, 32, 46, 40, 60, 51, 66, 57, 73, 64, 84],
}
const navItems: { label: Section; icon: typeof LayoutDashboard }[] = [
  { label: 'Overview', icon: LayoutDashboard }, { label: 'Orders', icon: ShoppingCart },
  { label: 'Products', icon: Package }, { label: 'Customers', icon: Users },
]

function TrendChart({ values }: { values: number[] }) {
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 700},${195 - value * 1.75}`).join(' ')
  return <svg className="trend-chart" viewBox="0 0 700 210" preserveAspectRatio="none" role="img" aria-label="Revenue trend chart rising through the selected period">
    <defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#7b8e70" stopOpacity=".18" /><stop offset="100%" stopColor="#7b8e70" stopOpacity="0" /></linearGradient></defs>
    {[20, 65, 110, 155, 200].map(y => <line key={y} x1="0" x2="700" y1={y} y2={y} className="chart-grid" />)}
    <polygon points={`0,210 ${points} 700,210`} fill="url(#chart-fill)" />
    <polyline points={points} fill="none" stroke="#6f8466" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    {values.map((value, index) => <circle key={index} cx={(index / (values.length - 1)) * 700} cy={195 - value * 1.75} r="3.5" fill="#6f8466" stroke="#fff" strokeWidth="2" />)}
  </svg>
}

function mapApiOrder(order: ApiOrder, index: number): Order {
  const status = order.status === 'paid' ? 'Paid' : order.status === 'refunded' ? 'Refunded' : order.status === 'shipped' ? 'Shipped' : order.status === 'cancelled' ? 'Cancelled' : 'Processing'
  return { id: `#${order.orderNumber}`, customer: order.customer.name, initials: makeInitials(order.customer.name), email: order.customer.email, date: formatDate(order.createdAt), product: order.items[0]?.name ?? 'Order', amount: formatMoney(order.subtotal), status, color: productColors[index % productColors.length] }
}

function mapApiProduct(product: ApiProduct, index: number): ProductRow {
  return { name: product.name, category: product.category, sku: product.sku, stock: product.inventory, price: formatMoney(product.price), color: productColors[index % productColors.length], icon: productIcons[index % productIcons.length] }
}

function mapApiCustomer(customer: ApiCustomer, index: number): CustomerRow {
  return { name: customer.name, email: customer.email, orders: customer.orderCount, spent: formatMoney(customer.totalSpent), initials: makeInitials(customer.name), color: productColors[index % productColors.length], lastOrderAt: customer.lastOrderAt }
}

function App() {
  const [section, setSection] = useState<Section>('Overview')
  const [period, setPeriod] = useState('Last 30 days')
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [authToken, setAuthToken] = useState(() => sessionStorage.getItem('northstar-token') ?? '')
  const [authName, setAuthName] = useState(() => sessionStorage.getItem('northstar-name') ?? '')
  const [authRole, setAuthRole] = useState(() => sessionStorage.getItem('northstar-role') ?? '')
  const [authOpen, setAuthOpen] = useState(false)
  const [authError, setAuthError] = useState('')
  const [liveError, setLiveError] = useState('')
  const [displayOrders, setDisplayOrders] = useState<Order[]>(orders)
  const [displayProducts, setDisplayProducts] = useState<ProductRow[]>(products)
  const [displayCustomers, setDisplayCustomers] = useState<CustomerRow[]>(customers)
  const [summary, setSummary] = useState<ApiSummary>({ revenue: 48294, orders: 1429, averageOrderValue: 113.4, customers: 847, lowStock: 1, daily: [] })
  useEffect(() => {
    if (!authToken) {
      setDisplayOrders(orders)
      setDisplayProducts(products)
      setDisplayCustomers(customers)
      setSummary({ revenue: 48294, orders: 1429, averageOrderValue: 113.4, customers: 847, lowStock: 1, daily: [] })
      setLiveError('')
      return
    }
    let active = true
    const days = period === 'Last 7 days' ? 7 : period === 'Last 90 days' ? 90 : 30
    loadStoreData(authToken, days).then(([nextSummary, orderPage, productPage, customerPage]) => {
      if (!active) return
      setSummary(nextSummary)
      setDisplayOrders(orderPage.items.map(mapApiOrder))
        setDisplayProducts(productPage.items.map(mapApiProduct))
      setDisplayCustomers(customerPage.items.map(mapApiCustomer))
      setLiveError('')
    }).catch(error => {
      if (active) setLiveError(error instanceof Error ? error.message : 'Store data could not be loaded.')
    })
    return () => { active = false }
  }, [authToken, period])
  const dailyValues = summary.daily.slice(-14).map(entry => entry.revenue)
  const dailyPeak = Math.max(...dailyValues, 1)
  const chartValues = dailyValues.length > 1 ? dailyValues.map(value => 5 + (value / dailyPeak) * 90) : chartSets[period]
  const filteredOrders = useMemo(() => displayOrders.filter(order => `${order.id} ${order.customer} ${order.email} ${order.product}`.toLowerCase().includes(query.toLowerCase())), [displayOrders, query])
  const filteredProducts = useMemo(() => displayProducts.filter(product => `${product.name} ${product.category} ${product.sku}`.toLowerCase().includes(query.toLowerCase())), [displayProducts, query])
  const filteredCustomers = useMemo(() => displayCustomers.filter(customer => `${customer.name} ${customer.email}`.toLowerCase().includes(query.toLowerCase())), [displayCustomers, query])
  const title = section === 'Overview' ? `Good morning, ${authName.split(' ')[0] || 'Alex'}` : section
  const subtitle = section === 'Overview' ? 'Here’s what’s happening with your store today.' : `Manage your store’s ${section.toLowerCase()} in one place.`

  function exportReport() {
    const rows = [['Order', 'Customer', 'Email', 'Date', 'Product', 'Amount', 'Status'], ...displayOrders.map(order => [order.id, order.customer, order.email, order.date, order.product, order.amount, order.status])]
    const csv = rows.map(row => row.map(value => `"${value.replace(/"/g, '""')}"`).join(',')).join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    link.download = 'northstar-orders.csv'
    link.click()
    URL.revokeObjectURL(link.href)
    setNotice('Your report has been exported.')
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setAuthError('')
    try {
      const session = await signIn(String(form.get('email')), String(form.get('password')))
      if (session.user.role !== 'admin' && session.user.role !== 'staff') throw new Error('This dashboard is available to staff and admin accounts.')
      sessionStorage.setItem('northstar-token', session.token)
      sessionStorage.setItem('northstar-name', session.user.name)
      sessionStorage.setItem('northstar-role', session.user.role)
      setAuthToken(session.token)
      setAuthName(session.user.name)
      setAuthRole(session.user.role)
      setAuthOpen(false)
      setNotice('Connected to live store data.')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Sign-in failed.')
    }
  }

  function disconnect() {
    sessionStorage.removeItem('northstar-token')
    sessionStorage.removeItem('northstar-name')
    sessionStorage.removeItem('northstar-role')
    setAuthToken('')
    setAuthName('')
    setAuthRole('')
    setNotice('Disconnected from live store data.')
  }

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><span className="brand-mark"><Sparkles size={19} strokeWidth={2.1} /></span><span>northstar<span className="brand-dot">.</span></span><button className="icon-button sidebar-close" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={18} /></button></div>
      <button className="store-switcher"><span className="store-avatar">N</span><span className="store-copy"><strong>Northstar Studio</strong><small>northstar.store</small></span><ChevronDown size={16} /></button>
      <div className="nav-label">WORKSPACE</div>
      <nav className="main-nav" aria-label="Main navigation">{navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${section === label ? 'active' : ''}`} onClick={() => { setSection(label); setQuery(''); setMenuOpen(false) }}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{label === 'Orders' && <span className="nav-count">{displayOrders.length}</span>}</button>)}</nav>
      <div className="nav-label channels-label">CHANNELS</div>
      <button className="nav-item channel-item" onClick={() => setNotice('Online store is connected.')}><span className="channel-dot channel-green" /><span>Online store</span><ArrowUpRight size={14} className="channel-arrow" /></button>
      <button className="nav-item channel-item" onClick={() => setNotice('Social commerce is connected.')}><span className="channel-dot channel-pink" /><span>Social shop</span><ArrowUpRight size={14} className="channel-arrow" /></button>
      <div className="sidebar-spacer" />
      <div className="sidebar-plan"><div className="plan-heading"><span>Growth plan</span><span>68%</span></div><div className="plan-track"><span /></div><p>6,820 of 10,000 monthly orders</p><button onClick={() => setNotice('You are on the Growth plan.')}>View plan <ArrowRight size={14} /></button></div>
      <div className="sidebar-bottom"><button className="nav-item" onClick={() => setNotice('Help center opened in a new workspace.')}><CircleHelp size={18} /><span>Help center</span></button><button className="nav-item" onClick={() => setNotice('Settings are coming soon.')}><Settings2 size={18} /><span>Settings</span></button><div className="profile-row"><div className="profile-avatar">{makeInitials(authName || 'Alex Morgan')}</div><div className="profile-copy"><strong>{authName || 'Alex Morgan'}</strong><small>{authRole || 'Demo mode'}</small></div><Ellipsis size={19} /></div></div>
    </aside>
    {menuOpen && <button className="scrim" aria-label="Close navigation overlay" onClick={() => setMenuOpen(false)} />}
    <main className="main-area">
      <header className="topbar"><button className="icon-button menu-toggle" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={20} /></button><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={15} /><strong>{section}</strong></div><div className="topbar-actions"><label className="search-box"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search anything..." aria-label="Search" /><kbd>⌘ K</kbd></label><button className="connection-button" onClick={() => authToken ? disconnect() : setAuthOpen(true)} aria-label={authToken ? 'Disconnect live store data' : 'Sign in to live store data'}>{authToken ? <LogOut size={15} /> : <LogIn size={15} />}<span>{authToken ? 'Disconnect' : 'Connect'}</span></button><button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotice('You’re all caught up.')}><Bell size={18} /><i /></button><div className="top-avatar">{makeInitials(authName || 'Alex Morgan')}</div></div></header>
      <div className="page-content">
        <div className="page-heading"><div><div className="eyebrow"><span className="live-dot" /> STORE OVERVIEW <span className={`data-mode ${authToken ? 'data-live' : ''}`}>{authToken ? 'LIVE DATA' : 'DEMO DATA'}</span></div><h1>{title}<span className="wave">✳</span></h1><p>{subtitle}</p></div><div className="heading-actions"><button className="button button-secondary" onClick={exportReport}><Download size={16} /> Export</button><button className="button button-primary" onClick={() => setNotice(section === 'Products' ? 'Product creation form is ready.' : 'New order draft created.')}><Plus size={17} /> {section === 'Products' ? 'Add product' : 'Create order'}</button></div></div>
        {liveError && <div className="live-error" role="status">Live data could not be refreshed: {liveError}</div>}
        {section === 'Overview' ? <>
          <section className="metric-grid" aria-label="Store performance metrics">
            <article className="metric-card"><div className="metric-top"><span>Total revenue</span><span className="metric-icon revenue-icon"><CreditCard size={17} /></span></div><div className="metric-value">{formatMoney(summary.revenue)}</div><div className="metric-bottom"><span className="trend-pill"><ArrowUpRight size={13} /> 12.8%</span><span>vs. previous period</span><svg className="sparkline" viewBox="0 0 76 27" aria-hidden="true"><polyline points="1,21 12,18 21,20 31,12 40,15 49,7 59,11 68,4 75,5" /></svg></div></article>
            <article className="metric-card"><div className="metric-top"><span>Total orders</span><span className="metric-icon orders-icon"><ShoppingBag size={17} /></span></div><div className="metric-value">{summary.orders.toLocaleString('en-US')}</div><div className="metric-bottom"><span className="trend-pill"><ArrowUpRight size={13} /> 8.2%</span><span>vs. previous period</span><svg className="sparkline sparkline-orange" viewBox="0 0 76 27" aria-hidden="true"><polyline points="1,21 10,16 20,19 29,11 38,14 48,9 56,13 67,5 75,8" /></svg></div></article>
            <article className="metric-card"><div className="metric-top"><span>Avg. order value</span><span className="metric-icon aov-icon"><Activity size={17} /></span></div><div className="metric-value">{formatMoney(summary.averageOrderValue)}</div><div className="metric-bottom"><span className="trend-pill"><ArrowUpRight size={13} /> 4.6%</span><span>vs. previous period</span><svg className="sparkline sparkline-blue" viewBox="0 0 76 27" aria-hidden="true"><polyline points="1,20 12,19 21,13 30,16 39,11 48,13 57,6 67,8 75,3" /></svg></div></article>
            <article className="metric-card"><div className="metric-top"><span>Conversion rate</span><span className="metric-icon conversion-icon"><Activity size={17} /></span></div><div className="metric-value">3.24<span className="metric-cents">%</span></div><div className="metric-bottom"><span className="trend-pill trend-down"><ArrowDownRight size={13} /> 0.8%</span><span>vs. previous period</span><svg className="sparkline sparkline-red" viewBox="0 0 76 27" aria-hidden="true"><polyline points="1,5 12,8 21,6 30,12 39,10 48,17 57,13 67,21 75,18" /></svg></div></article>
          </section>
          <section className="analytics-grid"><article className="panel revenue-panel"><div className="panel-heading"><div><h2>Revenue over time</h2><p>Track how your store is performing</p></div><label className="select-wrap"><select value={period} onChange={event => setPeriod(event.target.value)} aria-label="Revenue date range"><option>Last 7 days</option><option>Last 30 days</option><option>Last 90 days</option></select><ChevronDown size={14} /></label></div><div className="revenue-summary"><strong>$48,294</strong><span className="trend-pill"><ArrowUpRight size={13} /> 12.8%</span><span className="summary-caption">compared to $42,816 last period</span></div><div className="chart-wrap"><div className="y-labels"><span>$10k</span><span>$7.5k</span><span>$5k</span><span>$2.5k</span><span>$0</span></div><TrendChart values={chartValues} /></div><div className="x-labels"><span>Oct 01</span><span>Oct 06</span><span>Oct 11</span><span>Oct 16</span><span>Oct 21</span><span>Oct 30</span></div></article><article className="panel channels-panel"><div className="panel-heading"><div><h2>Sales by channel</h2><p>Where your orders come from</p></div><button className="icon-button small-more" aria-label="More channel options" onClick={() => setNotice('Channel report options opened.')}><Ellipsis size={18} /></button></div><div className="donut-wrap"><div className="donut"><div className="donut-center"><strong>$48.3k</strong><span>Total sales</span></div></div></div><div className="channel-legend"><div><span className="legend-color legend-store" /><span>Online store</span><strong>$32,839</strong><small>68%</small></div><div><span className="legend-color legend-social" /><span>Social shop</span><strong>$10,625</strong><small>22%</small></div><div><span className="legend-color legend-market" /><span>Marketplace</span><strong>$4,830</strong><small>10%</small></div></div><button className="text-link" onClick={() => setNotice('Full channel report opened.')}>View channel report <ArrowRight size={15} /></button></article></section>
          <section className="panel orders-panel"><div className="panel-heading orders-heading"><div><div className="title-inline"><h2>Recent orders</h2><span className="soft-count">12 new</span></div><p>Your latest customer orders at a glance</p></div><button className="text-link" onClick={() => setSection('Orders')}>View all orders <ArrowRight size={15} /></button></div><OrderTable rows={filteredOrders.slice(0, 4)} showAll={showAll} onToggle={() => setShowAll(!showAll)} /></section>
          <section className="bottom-grid"><article className="panel activity-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>What’s happening in your store</p></div><button className="icon-button small-more" aria-label="More activity options" onClick={() => setNotice('Activity options opened.')}><Ellipsis size={18} /></button></div><div className="activity-list"><ActivityItem color="activity-green" icon={<ShoppingCart size={15} />} title="New order received" detail="Olivia Rhye placed an order for $248.00" time="2 min ago" /><ActivityItem color="activity-orange" icon={<Box size={15} />} title="Low stock alert" detail="Ceramic Pour-over is running low (7 left)" time="38 min ago" /><ActivityItem color="activity-blue" icon={<Users size={15} />} title="New customer" detail="Jamie Lee joined your store" time="1 hr ago" /></div></article><article className="panel best-panel"><div className="panel-heading"><div><h2>Best sellers</h2><p>Your top products this month</p></div><button className="text-link" onClick={() => setSection('Products')}>All products <ArrowRight size={14} /></button></div><div className="best-list"><BestProduct icon="◖" color="lavender" name="Studio Headphones" sold="342 sold" revenue="$84,816" /><BestProduct icon="▱" color="peach" name="Everyday Tote" sold="286 sold" revenue="$24,024" /><BestProduct icon="◒" color="mint" name="Ceramic Pour-over" sold="194 sold" revenue="$25,608" /></div></article></section>
        </> : <section className="panel directory-panel"><div className="directory-toolbar"><div className="directory-tabs"><button className="tab-active">All {section.toLowerCase()}</button><button onClick={() => setNotice('Filtered view selected.')}>Active</button><button onClick={() => setNotice('Archived view selected.')}>Archived</button></div><button className="button button-secondary filter-button" onClick={() => setNotice('Filters opened.')}><Settings2 size={15} /> Filters</button></div>{section === 'Orders' ? <OrderTable rows={filteredOrders} showAll onToggle={() => setShowAll(!showAll)} /> : section === 'Products' ? <ProductTable rows={filteredProducts} /> : <CustomerTable rows={filteredCustomers} />}</section>}
        <footer className="page-footer"><span>© 2025 Northstar Commerce</span><span><LifeBuoy size={14} /> All systems operational <i className="footer-status" /></span><button onClick={() => setNotice('Keyboard shortcuts: search, navigate, and create.')}>Keyboard shortcuts <Command size={13} /></button></footer>
      </div>
    </main>
    {authOpen && <div className="modal-backdrop" onClick={() => setAuthOpen(false)}><section className="connect-modal" role="dialog" aria-modal="true" aria-labelledby="connect-title" onClick={event => event.stopPropagation()}><div className="modal-top"><span className="modal-icon"><LogIn size={18} /></span><button className="icon-button" aria-label="Close sign-in dialog" onClick={() => setAuthOpen(false)}><X size={18} /></button></div><h2 id="connect-title">Connect your store</h2><p>Sign in with a staff or admin account to load protected store data.</p><form onSubmit={handleSignIn}><label>Email address<input name="email" type="email" autoComplete="username" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label>{authError && <div className="form-error" role="alert">{authError}</div>}<button className="button button-primary modal-submit" type="submit">Sign in</button></form></section></div>}
    {notice && <div className="toast" role="status"><span className="toast-check">✓</span>{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={15} /></button></div>}
  </div>
}

function OrderTable({ rows, showAll }: { rows: Order[]; showAll: boolean; onToggle: () => void }) {
  const visible = showAll ? rows : rows.slice(0, 5)
  return <div className="table-scroll"><table><thead><tr><th><input type="checkbox" aria-label="Select all orders" /></th><th>ORDER</th><th>CUSTOMER</th><th>DATE</th><th>PRODUCT</th><th>AMOUNT</th><th>STATUS</th><th /></tr></thead><tbody>{visible.map(order => <tr key={order.id}><td><input type="checkbox" aria-label={`Select ${order.id}`} /></td><td className="order-id">{order.id}</td><td><div className="customer-cell"><span className={`customer-avatar ${order.color}`}>{order.initials}</span><span><strong>{order.customer}</strong><small>{order.email}</small></span></div></td><td>{order.date}</td><td>{order.product}</td><td className="amount-cell">{order.amount}</td><td><span className={`status ${order.status === 'Paid' ? 'status-paid' : order.status === 'Refunded' || order.status === 'Cancelled' ? 'status-refunded' : 'status-processing'}`}><i />{order.status}</span></td><td><button className="icon-button row-menu" aria-label={`Actions for ${order.id}`}><Ellipsis size={17} /></button></td></tr>)}</tbody></table>{visible.length === 0 && <div className="empty-state">No results found. Try a different search.</div>}</div>
}

function ProductTable({ rows }: { rows: typeof products }) {
  return <div className="table-scroll"><table><thead><tr><th><input type="checkbox" aria-label="Select all products" /></th><th>PRODUCT</th><th>SKU</th><th>CATEGORY</th><th>IN STOCK</th><th>PRICE</th><th>STATUS</th><th /></tr></thead><tbody>{rows.map(product => <tr key={product.sku}><td><input type="checkbox" aria-label={`Select ${product.name}`} /></td><td><div className="product-cell"><span className={`product-thumb ${product.color}`}>{product.icon}</span><strong>{product.name}</strong></div></td><td>{product.sku}</td><td>{product.category}</td><td className={product.stock < 10 ? 'stock-low' : ''}>{product.stock} units</td><td className="amount-cell">{product.price}</td><td><span className={`status ${product.stock < 10 ? 'status-processing' : 'status-paid'}`}><i />{product.stock < 10 ? 'Low stock' : 'Active'}</span></td><td><button className="icon-button row-menu" aria-label={`Actions for ${product.name}`}><Ellipsis size={17} /></button></td></tr>)}</tbody></table>{rows.length === 0 && <div className="empty-state">No products found.</div>}</div>
}

function CustomerTable({ rows }: { rows: typeof customers }) {
  return <div className="table-scroll"><table><thead><tr><th><input type="checkbox" aria-label="Select all customers" /></th><th>CUSTOMER</th><th>ORDERS</th><th>LAST ORDER</th><th>TOTAL SPENT</th><th>SEGMENT</th><th /></tr></thead><tbody>{rows.map((customer, index) => <tr key={customer.email}><td><input type="checkbox" aria-label={`Select ${customer.name}`} /></td><td><div className="customer-cell"><span className={`customer-avatar ${customer.color}`}>{customer.initials}</span><span><strong>{customer.name}</strong><small>{customer.email}</small></span></div></td><td>{customer.orders} orders</td><td>{formatDate(customer.lastOrderAt)}</td><td className="amount-cell">{customer.spent}</td><td><span className="segment-pill">{index === 0 ? 'VIP' : 'Returning'}</span></td><td><button className="icon-button row-menu" aria-label={`Actions for ${customer.name}`}><Ellipsis size={17} /></button></td></tr>)}</tbody></table>{rows.length === 0 && <div className="empty-state">No customers found.</div>}</div>
}

function ActivityItem({ color, icon, title, detail, time }: { color: string; icon: React.ReactNode; title: string; detail: string; time: string }) {
  return <div className="activity-item"><span className={`activity-icon ${color}`}>{icon}</span><div className="activity-copy"><strong>{title}</strong><span>{detail}</span></div><time>{time}</time></div>
}

function BestProduct({ icon, color, name, sold, revenue }: { icon: string; color: string; name: string; sold: string; revenue: string }) {
  return <div className="best-item"><span className={`product-thumb ${color}`}>{icon}</span><div className="best-copy"><strong>{name}</strong><span>{sold}</span></div><strong className="best-revenue">{revenue}</strong></div>
}

export default App
