import mongoose, { Schema } from 'mongoose'

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['customer', 'staff', 'admin'], default: 'customer' },
}, { timestamps: true })

const productSchema = new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
  category: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  inventory: { type: Number, required: true, min: 0, default: 0 },
  imageUrl: { type: String, default: '' },
  active: { type: Boolean, default: true },
}, { timestamps: true })
productSchema.index({ name: 'text', description: 'text', category: 'text' })

const orderSchema = new Schema({
  orderNumber: { type: String, required: true, unique: true },
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: [{ product: { type: Schema.Types.ObjectId, ref: 'Product', required: true }, name: { type: String, required: true }, quantity: { type: Number, min: 1, required: true }, unitPrice: { type: Number, min: 0, required: true } }],
  subtotal: { type: Number, min: 0, required: true },
  currency: { type: String, default: 'usd' },
  status: { type: String, enum: ['pending', 'processing', 'paid', 'shipped', 'refunded', 'cancelled'], default: 'pending', index: true },
  stripeSessionId: { type: String, default: '' },
  paidAt: { type: Date },
}, { timestamps: true })
orderSchema.index({ createdAt: -1 })

export const User = mongoose.model('User', userSchema)
export const Product = mongoose.model('Product', productSchema)
export const Order = mongoose.model('Order', orderSchema)
