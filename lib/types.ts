// ─── Ingredient ──────────────────────────────────────────────────────────
export interface Ingredient {
  id: string
  name: string
  unit: string        // g, ml, pcs, etc.
  stock: number
  minStock: number
  costPerUnit: number
  createdAt: string
  updatedAt: string
}

// ─── Recipe ───────────────────────────────────────────────────────────────
export interface RecipeItem {
  ingredientId: string
  quantityRequired: number  // per 1 unit of product sold
}

// ─── Product ────────────────────────────────────────────────────────────
export interface Product {
  id: string
  name: string
  description?: string
  price: number
  cost?: number
  sku: string
  barcode?: string
  category: string
  categoryColor?: string
  emoji?: string
  imageUrl?: string
  stock: number
  minStock?: number
  unit?: string
  taxRate?: number
  isActive: boolean
  recipe?: RecipeItem[]   // ingredient recipe (café mode)
  createdAt: string
  updatedAt: string
}

// ─── Cart ────────────────────────────────────────────────────────────────
export interface CartItem {
  product: Product
  quantity: number
  discount?: number  // per-item discount %
  note?: string
}

export interface Cart {
  items: CartItem[]
  discountType: 'percent' | 'fixed'
  discountValue: number
  taxRate: number
  customerId?: string
  note?: string
}

// ─── Order ───────────────────────────────────────────────────────────────
export type OrderStatus = 'pending' | 'completed' | 'refunded' | 'cancelled'
export type PaymentMethod = 'cash' | 'card' | 'mobile' | 'credit'

export interface OrderItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
}

export interface Order {
  id: string
  orderNumber: string
  items: OrderItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  amountTendered?: number
  change?: number
  paymentMethod: PaymentMethod
  status: OrderStatus
  cashierId?: string
  cashierName?: string
  customerId?: string
  customerName?: string
  note?: string
  createdAt: string
  updatedAt: string
}

// ─── Category ────────────────────────────────────────────────────────────
export interface Category {
  id: string
  name: string
  emoji: string
  color: string
  productCount?: number
}

// ─── Customer ────────────────────────────────────────────────────────────
export interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  notes?: string
  totalPurchases?: number
  lastPurchase?: string
  createdAt: string
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────
export interface DashboardStats {
  todayRevenue: number
  todayRevenueChange: number
  todayOrders: number
  todayOrdersChange: number
  totalProducts: number
  lowStockCount: number
  activeCustomers: number
  avgOrderValue: number
  avgOrderChange: number
}

export interface RevenueDataPoint {
  date: string
  revenue: number
  orders: number
}

// ─── User / Auth ─────────────────────────────────────────────────────────
export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'cashier'
  avatar?: string
  businessId: string
}

export interface Business {
  id: string
  name: string
  logo?: string
  currency: string
  taxRate: number
  address?: string
  phone?: string
  email?: string
}
