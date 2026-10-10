const apiBase = '/api'

export type ApiSession = {
  token: string
  user: { id: string; name: string; email: string; role: 'customer' | 'staff' | 'admin' }
}

export type ApiPage<T> = { items: T[]; page: number; limit: number; total: number; pages: number }
export type ApiOrder = {
  orderNumber: string
  customer: { name: string; email: string }
  items: { name: string; quantity: number }[]
  subtotal: number
  status: string
  createdAt: string
}
export type ApiProduct = { name: string; sku: string; category: string; price: number; inventory: number }
export type ApiCustomer = { name: string; email: string; orderCount: number; totalSpent: number; lastOrderAt?: string }
export type ApiSummary = { revenue: number; orders: number; averageOrderValue: number; customers: number; lowStock: number; daily: { date: string; revenue: number; orders: number }[] }

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const body = await response.json().catch(() => ({})) as { error?: string }
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status}).`)
  return body as T
}

export function signIn(email: string, password: string) {
  return request<ApiSession>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
}

export function loadStoreData(token: string, days: number) {
  return Promise.all([
    request<ApiSummary>(`/analytics/summary?days=${days}`, {}, token),
    request<ApiPage<ApiOrder>>('/orders?limit=100', {}, token),
    request<ApiPage<ApiProduct>>('/products?limit=100', {}, token),
    request<ApiPage<ApiCustomer>>('/customers?limit=100', {}, token),
  ])
}
