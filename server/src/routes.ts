import { Router } from 'express'
import type { RequestHandler } from 'express'
import { randomBytes, randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import Stripe from 'stripe'
import nodemailer from 'nodemailer'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { authenticate, allowRoles, type AuthRequest } from './auth.js'
import { Order, Product, User } from './models.js'

export const api = Router()
const registerSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().email().max(254), password: z.string().min(10).max(128) })
const productSchema = z.object({ name: z.string().trim().min(1).max(160), description: z.string().max(4000).optional(), sku: z.string().trim().min(2).max(64), category: z.string().trim().min(1).max(80), price: z.number().positive(), inventory: z.number().int().nonnegative(), imageUrl: z.string().url().optional() })
const productUpdateSchema = productSchema.partial().refine(input => Object.keys(input).length > 0)
const stripe = () => process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

export const stripeWebhook: RequestHandler = async (req, res) => {
  const client = stripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const signature = req.header('stripe-signature')
  if (!client || !secret || !signature || !Buffer.isBuffer(req.body)) return res.status(400).json({ error: 'Invalid webhook configuration or payload.' })
  let event: Stripe.Event
  try { event = client.webhooks.constructEvent(req.body, signature, secret) }
  catch { return res.status(400).json({ error: 'Invalid webhook signature.' }) }
  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session
      const orderId = session.metadata?.orderId
      const paymentSucceeded = event.type === 'checkout.session.async_payment_succeeded' || session.payment_status === 'paid'
      if (orderId && paymentSucceeded) await Order.findOneAndUpdate({ _id: orderId, status: 'pending' }, { status: 'paid', paidAt: new Date(), stripeSessionId: session.id })
    } else if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as Stripe.Checkout.Session
      const orderId = session.metadata?.orderId
      if (orderId) await Order.findOneAndUpdate({ _id: orderId, status: 'pending' }, { status: 'cancelled' })
    }
  } catch (error) {
    console.error('Stripe webhook processing failed:', error)
    return res.status(500).json({ error: 'Webhook processing failed.' })
  }
  res.json({ received: true })
}

api.post('/auth/register', async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body)
    const secret = process.env.JWT_SECRET
    if (!secret) return res.status(503).json({ error: 'Authentication is not configured.' })
    const user = await User.create({ name: input.name, email: input.email, passwordHash: await bcrypt.hash(input.password, 12), role: 'customer' })
    const token = jwt.sign({ role: user.role }, secret, { subject: user.id, expiresIn: '8h' })
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
  } catch (error) { next(error) }
})

api.post('/auth/login', async (req, res, next) => {
  try {
    const input = z.object({ email: z.string().email(), password: z.string().min(1).max(128) }).parse(req.body)
    const user = await User.findOne({ email: input.email.toLowerCase() }).select('+passwordHash')
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) return res.status(401).json({ error: 'Email or password is incorrect.' })
    const secret = process.env.JWT_SECRET
    if (!secret) return res.status(503).json({ error: 'Authentication is not configured.' })
    const token = jwt.sign({ role: user.role }, secret, { subject: user.id, expiresIn: '8h' })
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
  } catch (error) { next(error) }
})

api.get('/products', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 24))
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : ''
    const filter = { active: true, ...(search ? { $text: { $search: search } } : {}) }
    const [items, total] = await Promise.all([Product.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), Product.countDocuments(filter)])
    res.json({ items, page, limit, total, pages: Math.ceil(total / limit) })
  } catch (error) { next(error) }
})

api.post('/products', authenticate, allowRoles('staff', 'admin'), async (req, res, next) => {
  try { res.status(201).json(await Product.create(productSchema.parse(req.body))) }
  catch (error) { next(error) }
})

api.patch('/products/:id', authenticate, allowRoles('staff', 'admin'), async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, productUpdateSchema.parse(req.body), { new: true, runValidators: true })
    if (!product) return res.status(404).json({ error: 'Product not found.' })
    res.json(product)
  } catch (error) { next(error) }
})

api.delete('/products/:id', authenticate, allowRoles('staff', 'admin'), async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { active: false }, { new: true })
    if (!product) return res.status(404).json({ error: 'Product not found.' })
    res.json({ archived: true, id: product.id })
  } catch (error) { next(error) }
})

api.get('/orders', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25))
    const filter = req.user?.role === 'customer' ? { customer: req.user.id } : {}
    const [items, total] = await Promise.all([Order.find(filter).populate('customer', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), Order.countDocuments(filter)])
    res.json({ items, page, limit, total, pages: Math.ceil(total / limit) })
  } catch (error) { next(error) }
})

api.patch('/orders/:id/status', authenticate, allowRoles('staff', 'admin'), async (req, res, next) => {
  try {
    const { status } = z.object({ status: z.enum(['processing', 'shipped', 'cancelled']) }).parse(req.body)
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ error: 'Order not found.' })
    const transitions: Record<string, string[]> = { pending: ['cancelled'], paid: ['processing'], processing: ['shipped', 'cancelled'] }
    if (!transitions[order.status]?.includes(status)) return res.status(409).json({ error: `Cannot move an order from ${order.status} to ${status}.` })
    order.status = status
    await order.save()
    res.json(order)
  } catch (error) { next(error) }
})

api.get('/customers', authenticate, allowRoles('staff', 'admin'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25))
    const filter = { role: 'customer' }
    const [items, total] = await Promise.all([User.aggregate([
      { $match: filter },
      { $lookup: { from: Order.collection.name, localField: '_id', foreignField: 'customer', as: 'customerOrders' } },
      { $addFields: { orderCount: { $size: '$customerOrders' }, totalSpent: { $sum: '$customerOrders.subtotal' }, lastOrderAt: { $max: '$customerOrders.createdAt' } } },
      { $project: { name: 1, email: 1, createdAt: 1, orderCount: 1, totalSpent: 1, lastOrderAt: 1 } },
      { $sort: { createdAt: -1 } }, { $skip: (page - 1) * limit }, { $limit: limit },
    ]), User.countDocuments(filter)])
    res.json({ items, page, limit, total, pages: Math.ceil(total / limit) })
  } catch (error) { next(error) }
})

api.get('/analytics/summary', authenticate, allowRoles('staff', 'admin'), async (req, res, next) => {
  try {
    const requestedDays = Number(req.query.days)
    const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const [summary] = await Order.aggregate([{ $match: { status: { $in: ['paid', 'processing', 'shipped'] }, createdAt: { $gte: since } } }, { $group: { _id: null, revenue: { $sum: '$subtotal' }, orders: { $sum: 1 }, averageOrderValue: { $avg: '$subtotal' } } }])
    const [customers, lowStock, daily] = await Promise.all([User.countDocuments({ role: 'customer' }), Product.countDocuments({ active: true, inventory: { $lte: 10 } }), Order.aggregate([{ $match: { status: { $in: ['paid', 'processing', 'shipped'] }, createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$subtotal' }, orders: { $sum: 1 } } }, { $sort: { _id: 1 } }])])
    res.json({ revenue: summary?.revenue ?? 0, orders: summary?.orders ?? 0, averageOrderValue: summary?.averageOrderValue ?? 0, customers, lowStock, daily: daily.map(entry => ({ date: entry._id, revenue: entry.revenue, orders: entry.orders })) })
  } catch (error) { next(error) }
})

api.post('/payments/checkout', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const input = z.object({ items: z.array(z.object({ productId: z.string().regex(/^[a-f\d]{24}$/i), quantity: z.number().int().min(1).max(100) })).min(1).max(50), successUrl: z.string().url(), cancelUrl: z.string().url() }).parse(req.body)
    const client = stripe()
    if (!client) return res.status(503).json({ error: 'Payments are not configured.' })
    const quantities = new Map<string, number>()
    for (const item of input.items) {
      const productId = item.productId.toLowerCase()
      quantities.set(productId, (quantities.get(productId) ?? 0) + item.quantity)
    }
    const cartItems = Array.from(quantities, ([productId, quantity]) => ({ productId, quantity }))
    const products = await Product.find({ _id: { $in: cartItems.map(item => item.productId) }, active: true })
    if (products.length !== cartItems.length) return res.status(400).json({ error: 'One or more products are unavailable.' })
    const byId = new Map(products.map(product => [product.id, product]))
    for (const item of cartItems) {
      const product = byId.get(item.productId)
      if (!product || product.inventory < item.quantity) return res.status(409).json({ error: 'Insufficient inventory for an item.' })
    }
    const user = await User.findById(req.user?.id).select('email')
    if (!user) return res.status(401).json({ error: 'User account is unavailable.' })
    const orderNumber = `NS-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`
    const order = await Order.create({
      orderNumber,
      customer: user.id,
      items: cartItems.map(item => { const product = byId.get(item.productId)!; return { product: product._id, name: product.name, quantity: item.quantity, unitPrice: product.price } }),
      subtotal: cartItems.reduce((sum, item) => sum + byId.get(item.productId)!.price * item.quantity, 0),
      status: 'pending',
    })
    const lineItems = cartItems.map(item => { const product = byId.get(item.productId)!; return { price_data: { currency: 'usd', product_data: { name: product.name }, unit_amount: Math.round(product.price * 100) }, quantity: item.quantity } })
    try {
      const session = await client.checkout.sessions.create({ mode: 'payment', line_items: lineItems, success_url: input.successUrl, cancel_url: input.cancelUrl, customer_email: user.email, client_reference_id: req.user?.id, metadata: { orderId: order.id } })
      await Order.updateOne({ _id: order.id }, { stripeSessionId: session.id })
      res.status(201).json({ checkoutUrl: session.url, orderNumber })
    } catch (error) {
      await Order.deleteOne({ _id: order.id, status: 'pending' })
      throw error
    }
  } catch (error) { next(error) }
})

api.post('/uploads/presign', authenticate, allowRoles('staff', 'admin'), async (req, res, next) => {
  try {
    const input = z.object({ fileName: z.string().trim().min(1).max(180), contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/avif']) }).parse(req.body)
    const { AWS_REGION, AWS_S3_BUCKET, ASSETS_BASE_URL } = process.env
    if (!AWS_REGION || !AWS_S3_BUCKET) return res.status(503).json({ error: 'Image storage is not configured.' })
    const client = new S3Client({ region: AWS_REGION })
    const key = `products/${randomUUID()}`
    const command = new PutObjectCommand({ Bucket: AWS_S3_BUCKET, Key: key, ContentType: input.contentType })
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 })
    const publicUrl = ASSETS_BASE_URL ? `${ASSETS_BASE_URL.replace(/\/+$/, '')}/${key}` : null
    res.json({ uploadUrl, key, publicUrl, expiresIn: 300 })
  } catch (error) { next(error) }
})

api.post('/notifications/order', authenticate, allowRoles('staff', 'admin'), async (req, res, next) => {
  try {
    const input = z.object({ to: z.string().email(), orderNumber: z.string().min(1).max(64), status: z.enum(['confirmed', 'shipped', 'refunded']) }).parse(req.body)
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM } = process.env
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) return res.status(503).json({ error: 'Email notifications are not configured.' })
    const transport = nodemailer.createTransport({ host: SMTP_HOST, port: Number(SMTP_PORT ?? 587), secure: Number(SMTP_PORT) === 465, auth: { user: SMTP_USER, pass: SMTP_PASSWORD } })
    await transport.sendMail({ from: EMAIL_FROM ?? SMTP_USER, to: input.to, subject: `Order ${input.orderNumber} ${input.status}`, text: `Your order ${input.orderNumber} has been ${input.status}.` })
    res.status(202).json({ sent: true })
  } catch (error) { next(error) }
})

api.use((error: unknown, _req: AuthRequest, res: import('express').Response, _next: import('express').NextFunction) => {
  if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request.', details: error.flatten() })
  if (error instanceof Error && 'code' in error && error.code === 11000) return res.status(409).json({ error: 'A record with that value already exists.' })
  res.status(500).json({ error: 'Request could not be completed.' })
})
