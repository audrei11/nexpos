'use client'
export const dynamic = 'force-dynamic'


import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Search, Plus, Minus, Trash2, X, CreditCard, Banknote,
  QrCode, ShoppingBag, User, Tag, ChevronDown, Receipt,
  CheckCircle2, RefreshCw, Zap, ScanLine
} from 'lucide-react'
import { cn, formatCurrency, generateOrderId } from '@/lib/utils'
import { CATEGORIES } from '@/lib/mock-data'
import type { CartItem, Product, PaymentMethod, IngredientUsageEntry } from '@/lib/types'
import { saveTransactionToSheets, saveProductToSheets, logInventoryChange, saveIngredientToSheets, logIngredientUsage, logSaleIngredientUsage } from '@/lib/sheets'
import { useProducts } from '@/lib/products-context'
import { useTransactions } from '@/lib/transactions-context'
import { useIngredients } from '@/lib/ingredients-context'
import { useIngredientUsage } from '@/lib/ingredient-usage-context'
import toast from 'react-hot-toast'

// ─── Payment Modal ────────────────────────────────────────────────────────
function PaymentModal({
  total,
  onClose,
  onConfirm,
}: {
  total: number
  onClose: () => void
  onConfirm: (method: PaymentMethod, tendered?: number) => void
}) {
  const [method, setMethod] = useState<PaymentMethod>('card')
  const [cashInput, setCashInput] = useState('')
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)

  const cashTendered = parseFloat(cashInput) || 0
  const change = Math.max(0, cashTendered - total)

  const numpadPress = (val: string) => {
    if (val === 'C') { setCashInput(''); return }
    if (val === '⌫') { setCashInput(p => p.slice(0, -1)); return }
    if (val === '.' && cashInput.includes('.')) return
    if (cashInput.length >= 8) return
    setCashInput(p => p + val)
  }

  const handleConfirm = async () => {
    setProcessing(true)
    await new Promise(r => setTimeout(r, 900))
    setProcessing(false)
    setSuccess(true)
    await new Promise(r => setTimeout(r, 800))
    onConfirm(method, method === 'cash' ? cashTendered : undefined)
  }

  const NUMPAD = ['1','2','3','4','5','6','7','8','9','.','0','⌫']

  if (success) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col items-center gap-4 text-center animate-scale-in">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.5)]">
          <CheckCircle2 className="h-10 w-10 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">Payment Complete</p>
          <p className="text-surface-400 mt-1">{formatCurrency(total)} received</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-[440px] mx-4 bg-white rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.3)] animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-xl font-bold text-surface-900">Checkout</h2>
            <p className="text-sm text-surface-500 mt-0.5">Select payment method</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-100 text-surface-500 transition-all hover:bg-surface-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Amount */}
        <div className="mx-6 mb-4 rounded-2xl bg-surface-50 p-4 text-center border border-surface-100">
          <p className="text-sm text-surface-500 font-medium">Total Amount</p>
          <p className="text-4xl font-black text-surface-900 mt-1 num-display">{formatCurrency(total)}</p>
        </div>

        {/* Payment method tabs */}
        <div className="mx-6 mb-4 grid grid-cols-3 gap-2 p-1 bg-surface-100 rounded-2xl">
          {(
            [
              { id: 'card',   label: 'Card',   icon: CreditCard },
              { id: 'cash',   label: 'Cash',   icon: Banknote },
              { id: 'mobile', label: 'QR Pay', icon: QrCode },
            ] as { id: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[]
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMethod(id)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl py-3 text-xs font-semibold transition-all duration-200',
                method === id
                  ? 'bg-brand-gradient text-white shadow-brand'
                  : 'text-surface-500 hover:text-surface-700'
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>

        {/* Card method */}
        {method === 'card' && (
          <div className="mx-6 mb-6 animate-fade-in">
            <div className="flex items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 py-8">
              <CreditCard className="h-8 w-8 text-brand-400" />
              <div>
                <p className="text-sm font-semibold text-surface-700">Tap, insert, or swipe</p>
                <p className="text-xs text-surface-500 mt-0.5">Card terminal ready</p>
              </div>
            </div>
          </div>
        )}

        {/* Cash method */}
        {method === 'cash' && (
          <div className="mx-6 mb-4 animate-fade-in">
            {/* Tendered + Change display */}
            <div className="flex gap-3 mb-3">
              <div className="flex-1 rounded-xl border border-surface-200 bg-surface-50 p-3 text-center">
                <p className="text-xs text-surface-500 font-medium">Cash Tendered</p>
                <p className="text-xl font-bold text-surface-900 num-display mt-0.5">
                  {cashInput ? `₱${cashInput}` : <span className="text-surface-300">₱0.00</span>}
                </p>
              </div>
              <div className={cn(
                'flex-1 rounded-xl border p-3 text-center transition-all',
                change > 0 ? 'border-emerald-200 bg-emerald-50' : 'border-surface-200 bg-surface-50'
              )}>
                <p className="text-xs text-surface-500 font-medium">Change</p>
                <p className={cn(
                  'text-xl font-bold num-display mt-0.5',
                  change > 0 ? 'text-emerald-600' : 'text-surface-300'
                )}>
                  {change > 0 ? formatCurrency(change) : '₱0.00'}
                </p>
              </div>
            </div>

            {/* Quick denomination buttons */}
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              {[50, 100, 200, 500].map(bill => (
                <button
                  key={bill}
                  onClick={() => setCashInput(String(bill))}
                  className={cn(
                    'h-9 rounded-xl border text-xs font-bold transition-all active:scale-95',
                    cashTendered === bill
                      ? 'border-brand-300 bg-brand-50 text-brand-700'
                      : 'border-surface-200 bg-white text-surface-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700'
                  )}
                >
                  ₱{bill}
                </button>
              ))}
              <button
                onClick={() => setCashInput('1000')}
                className={cn(
                  'h-9 rounded-xl border text-xs font-bold transition-all active:scale-95',
                  cashTendered === 1000
                    ? 'border-brand-300 bg-brand-50 text-brand-700'
                    : 'border-surface-200 bg-white text-surface-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700'
                )}
              >
                ₱1,000
              </button>
              <button
                onClick={() => setCashInput('5000')}
                className={cn(
                  'h-9 rounded-xl border text-xs font-bold transition-all active:scale-95',
                  cashTendered === 5000
                    ? 'border-brand-300 bg-brand-50 text-brand-700'
                    : 'border-surface-200 bg-white text-surface-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700'
                )}
              >
                ₱5,000
              </button>
              <button
                onClick={() => setCashInput(total.toFixed(2))}
                className={cn(
                  'col-span-2 h-9 rounded-xl border text-xs font-bold transition-all active:scale-95',
                  cashTendered === total
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                )}
              >
                Exact ({formatCurrency(total)})
              </button>
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2">
              {NUMPAD.map((k) => (
                <button
                  key={k}
                  onClick={() => numpadPress(k)}
                  className={cn(
                    'flex h-12 items-center justify-center rounded-xl text-lg font-semibold transition-all duration-100 active:scale-95',
                    k === '⌫'
                      ? 'bg-rose-50 text-rose-500 hover:bg-rose-100'
                      : k === 'C'
                      ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                      : 'bg-surface-100 text-surface-700 hover:bg-surface-200'
                  )}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* QR method */}
        {method === 'mobile' && (
          <div className="mx-6 mb-6 animate-fade-in">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-surface-200 bg-surface-50 py-6">
              <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-surface-800 to-surface-900 flex items-center justify-center">
                <QrCode className="h-14 w-14 text-white opacity-80" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-surface-700">Scan QR to pay</p>
                <p className="text-xs text-surface-500 mt-0.5">Waiting for payment confirmation...</p>
              </div>
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Confirm button */}
        <div className="px-6 pb-6">
          <button
            onClick={handleConfirm}
            disabled={processing || (method === 'cash' && Math.round(cashTendered * 100) < Math.round(total * 100))}
            className={cn(
              'w-full h-14 rounded-2xl text-base font-bold text-white transition-all duration-200',
              'bg-brand-gradient shadow-brand hover:shadow-brand-lg hover:brightness-110',
              'disabled:opacity-50 disabled:pointer-events-none',
              'active:scale-[0.98]'
            )}
          >
            {processing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Processing...
              </span>
            ) : method === 'cash' && change > 0 ? (
              <span className="flex flex-col items-center leading-tight">
                <span className="text-base font-bold">Confirm {formatCurrency(total)}</span>
                <span className="text-xs font-semibold opacity-80">Change: {formatCurrency(change)}</span>
              </span>
            ) : (
              `Confirm ${formatCurrency(total)}`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Product Card (restaurant menu style) ────────────────────────────────
function ProductCard({
  product,
  onAdd,
  qty,
}: {
  product: Product
  onAdd: (product: Product) => void
  qty: number
}) {
  const outOfStock = product.stock === 0
  const lowStock = product.stock > 0 && product.stock <= (product.minStock ?? 5)

  return (
    <button
      onClick={() => !outOfStock && onAdd(product)}
      disabled={outOfStock}
      className={cn(
        'group relative flex flex-col bg-white rounded-2xl border overflow-hidden text-left',
        'shadow-card transition-all duration-200',
        outOfStock
          ? 'opacity-60 cursor-not-allowed border-surface-100'
          : 'cursor-pointer border-surface-100 hover:border-brand-200 hover:shadow-card-md hover:-translate-y-0.5 active:scale-[0.97]',
        qty > 0 && !outOfStock && 'border-brand-300 ring-2 ring-brand-100'
      )}
    >
      {/* Qty badge */}
      {qty > 0 && (
        <span className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-brand-gradient text-[11px] font-bold text-white shadow-brand animate-scale-in">
          {qty}
        </span>
      )}

      {/* Image area */}
      <div className="relative aspect-square w-full overflow-hidden bg-surface-50">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={e => {
              e.currentTarget.style.display = 'none'
              const div = document.createElement('div')
              div.className = 'h-full w-full flex items-center justify-center text-4xl'
              div.textContent = product.emoji ?? '📦'
              e.currentTarget.parentElement?.appendChild(div)
            }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-4xl select-none transition-transform duration-300 group-hover:scale-110">
            {product.emoji ?? '📦'}
          </div>
        )}

        {/* Stock badge overlay */}
        <span className={cn(
          'absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm',
          outOfStock
            ? 'bg-rose-500 text-white'
            : lowStock
            ? 'bg-amber-400 text-white'
            : 'bg-emerald-500 text-white'
        )}>
          {outOfStock ? 'Out of Stock' : lowStock ? 'Low Stock' : 'In Stock'}
        </span>

        {/* Add to cart hover overlay */}
        {!outOfStock && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand-600 shadow-lg opacity-0 scale-50 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100">
              <Plus className="h-5 w-5" />
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-bold text-surface-900 leading-tight line-clamp-2">
          {product.name}
        </p>
        <p className="mt-1.5 text-base font-extrabold text-brand-600 num-display">
          {formatCurrency(product.price)}
        </p>
      </div>
    </button>
  )
}

// ─── Cart Item Row ────────────────────────────────────────────────────────
function CartItemRow({
  item,
  onInc,
  onDec,
  onRemove,
}: {
  item: CartItem
  onInc: () => void
  onDec: () => void
  onRemove: () => void
}) {
  return (
    <div className="group flex items-center gap-3 py-3 border-b border-surface-100 last:border-0 animate-slide-up">
      {/* Image / Emoji */}
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-surface-50 overflow-hidden text-lg">
        {item.product.imageUrl ? (
          <img
            src={item.product.imageUrl}
            alt={item.product.name}
            className="h-full w-full object-cover"
            onError={e => {
              e.currentTarget.style.display = 'none'
              const span = document.createElement('span')
              span.textContent = item.product.emoji ?? '📦'
              e.currentTarget.parentElement?.appendChild(span)
            }}
          />
        ) : (
          item.product.emoji
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-surface-900 truncate">{item.product.name}</p>
        <p className="text-xs text-surface-500 num-display">{formatCurrency(item.product.price)} each</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={onDec}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-100 text-surface-600 transition-all hover:bg-surface-200 active:scale-90"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="w-6 text-center text-sm font-bold text-surface-900 num-display">{item.quantity}</span>
        <button
          onClick={onInc}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white transition-all hover:bg-brand-700 active:scale-90"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {/* Line total */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0 min-w-[52px]">
        <span className="text-sm font-bold text-surface-900 num-display">
          {formatCurrency(item.product.price * item.quantity)}
        </span>
        <button
          onClick={onRemove}
          className="flex h-5 w-5 items-center justify-center rounded text-surface-300 opacity-0 group-hover:opacity-100 transition-all hover:text-rose-500 hover:bg-rose-50"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

// ─── Main POS Page ────────────────────────────────────────────────────────
export default function POSPage() {
  const { products, setProducts } = useProducts()
  const { addTransaction } = useTransactions()
  const { ingredients, setIngredients } = useIngredients()
  const { addUsageEntries } = useIngredientUsage()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [discountValue, setDiscountValue] = useState(0)
  const [showDiscount, setShowDiscount] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  useEffect(() => { setOrderNumber(generateOrderId()) }, [])
  const [completedOrders, setCompletedOrders] = useState(0)
  const TAX_RATE = 0.08

  // Filtered products — uses `products` state so stock updates reflect live
  const filteredProducts = useMemo(() => {
    let list = products.filter(p => p.isActive)
    if (selectedCategory !== 'all') {
      list = list.filter(p => p.category === selectedCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      )
    }
    return list
  }, [products, selectedCategory, searchQuery])

  // Cart quantities map
  const cartQtyMap = useMemo(() => {
    const map: Record<string, number> = {}
    cart.forEach(item => { map[item.product.id] = item.quantity })
    return map
  }, [cart])

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const discountAmount = (subtotal * discountValue) / 100
  const taxable = subtotal - discountAmount
  const taxAmount = taxable * TAX_RATE
  const total = taxable + taxAmount

  const addToCart = useCallback((product: Product) => {
    // Check low-stock ingredient warning on first add only
    const alreadyInCart = cart.some(i => i.product.id === product.id)
    if (!alreadyInCart && product.recipe?.length) {
      const lowWarnings = product.recipe
        .map(ri => ingredients.find(i => i.id === ri.ingredientId))
        .filter((ing): ing is NonNullable<typeof ing> =>
          !!ing && ing.minStock > 0 && ing.stock > 0 && ing.stock <= ing.minStock
        )
      if (lowWarnings.length > 0) {
        toast(`⚠ Low stock: ${lowWarnings.map(i => i.name).join(', ')}`, {
          duration: 4000,
          style: { background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', fontWeight: 600 },
          icon: '⚠️',
        })
      }
    }

    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      const currentQty = existing?.quantity ?? 0
      // Never exceed available stock
      if (currentQty >= product.stock) return prev
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }, [cart, ingredients])

  const incQty = useCallback((productId: string) => {
    const available = products.find(p => p.id === productId)?.stock ?? 0
    setCart(prev => {
      const item = prev.find(i => i.product.id === productId)
      if (item && item.quantity >= available) {
        toast.error('No more stock available', { duration: 2000 })
        return prev
      }
      return prev.map(i =>
        i.product.id === productId ? { ...i, quantity: i.quantity + 1 } : i
      )
    })
  }, [products])

  const decQty = useCallback((productId: string) => {
    setCart(prev => {
      const item = prev.find(i => i.product.id === productId)
      if (!item) return prev
      if (item.quantity <= 1) return prev.filter(i => i.product.id !== productId)
      return prev.map(i => i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i)
    })
  }, [])

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId))
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  // ── Unit conversion helper ─────────────────────────────────────────────
  // Converts a recipe quantity (in `fromUnit`) to the ingredient's stock unit (`toUnit`).
  // Only g↔kg and ml↔L are supported; anything else is returned as-is.
  const convertToStockUnit = (qty: number, fromUnit: string | undefined, toUnit: string): number => {
    const from = (fromUnit ?? toUnit).trim()
    const to   = toUnit.trim()
    if (from === to) return qty
    if (from === 'g'  && to === 'kg') return qty / 1000
    if (from === 'kg' && to === 'g')  return qty * 1000
    if (from === 'ml' && to === 'L')  return qty / 1000
    if (from === 'L'  && to === 'ml') return qty * 1000
    return qty  // incompatible units — assume same scale (best effort)
  }

  const handlePaymentConfirm = useCallback((method: PaymentMethod) => {
    // 0. Validate stock — prevent sale if any item exceeds available stock
    const overStock = cart.filter(item => {
      const current = products.find(p => p.id === item.product.id)
      return !current || item.quantity > current.stock
    })
    if (overStock.length > 0) {
      setPaymentOpen(false)
      toast.error(
        `Insufficient stock for: ${overStock.map(i => i.product.name).join(', ')}`,
        { duration: 5000 }
      )
      return
    }

    // Check ingredient availability for recipe-based products
    for (const cartItem of cart) {
      const recipe = cartItem.product.recipe ?? []
      for (const recipeItem of recipe) {
        const ingredient = ingredients.find(i => i.id === recipeItem.ingredientId)
        if (!ingredient) continue
        const neededInStockUnit = convertToStockUnit(
          recipeItem.quantityRequired * cartItem.quantity,
          recipeItem.unit,
          ingredient.unit
        )
        if (ingredient.stock < neededInStockUnit) {
          setPaymentOpen(false)
          toast.error(`Insufficient ${ingredient.name} for ${cartItem.product.name}`, { duration: 5000 })
          return
        }
      }
    }

    const txId = generateOrderId()
    const now  = new Date().toISOString()

    // 1. Deduct stock in local state
    setProducts(prev => prev.map(p => {
      const sold = cart.find(i => i.product.id === p.id)
      if (!sold) return p
      return { ...p, stock: Math.max(0, p.stock - sold.quantity), updatedAt: now }
    }))

    // 2. Deduct ingredient stock for recipe-based products
    // Quantities are converted from recipe unit → ingredient stock unit before deducting.
    const ingredientUpdates: Record<string, number> = {}
    cart.forEach(cartItem => {
      (cartItem.product.recipe ?? []).forEach(ri => {
        const ingredient = ingredients.find(i => i.id === ri.ingredientId)
        const deductAmt = convertToStockUnit(
          ri.quantityRequired * cartItem.quantity,
          ri.unit,
          ingredient?.unit ?? ri.unit ?? ''
        )
        ingredientUpdates[ri.ingredientId] =
          (ingredientUpdates[ri.ingredientId] ?? 0) + deductAmt
      })
    })
    if (Object.keys(ingredientUpdates).length > 0) {
      setIngredients(prev => prev.map(ing => {
        const used = ingredientUpdates[ing.id]
        if (!used) return ing
        const newStock = Math.max(0, ing.stock - used)
        saveIngredientToSheets('updateIngredient', {
          id: ing.id, name: ing.name, unit: ing.unit,
          stock: newStock, min_stock: ing.minStock,
          cost_per_unit: ing.costPerUnit,
          created_at: ing.createdAt, updated_at: now,
        }).catch(console.error)
        logIngredientUsage({
          ingredient_id: ing.id, ingredient_name: ing.name,
          change_type: 'sale',
          quantity_before: ing.stock, quantity_after: newStock,
          note: `Sale ${txId}`,
        }).catch(console.error)
        return { ...ing, stock: newStock, updatedAt: now }
      }))
    }

    // 2b. Record ingredient usage analytics
    // Load nexpos_recipes as fallback — recipes may be stored there even when
    // the product object in the cart doesn't have the recipe field embedded.
    let recipesLookup: Record<string, Array<{ ingredientId: string; quantityRequired: number; unit?: string }>> = {}
    try {
      const raw = localStorage.getItem('nexpos_recipes')
      if (raw) recipesLookup = JSON.parse(raw)
    } catch {}

    const ingUsageEntries: IngredientUsageEntry[] = []
    cart.forEach(cartItem => {
      // Prefer recipe embedded on the product; fall back to nexpos_recipes lookup
      const recipe = (cartItem.product.recipe && cartItem.product.recipe.length > 0)
        ? cartItem.product.recipe
        : (recipesLookup[cartItem.product.id] ?? [])

      recipe.forEach(ri => {
        const ingredient = ingredients.find(i => i.id === ri.ingredientId)
        if (!ingredient) return
        // Log in recipe unit (e.g. 10 g) — more meaningful for analytics than stock unit (kg)
        const recipeUnit = ri.unit ?? ingredient.unit
        ingUsageEntries.push({
          id: `usage_${txId}_${ri.ingredientId}_${cartItem.product.id}`,
          ingredient_id: ri.ingredientId,
          ingredient_name: ingredient.name,
          quantity_used: ri.quantityRequired * cartItem.quantity,
          unit: recipeUnit,
          transaction_id: txId,
          product_id: cartItem.product.id,
          product_name: cartItem.product.name,
          timestamp: now,
        })
      })

      console.log(
        `[NEXPOS] ${cartItem.product.name} → recipe on product:`, cartItem.product.recipe?.length ?? 0,
        '| recipe from lookup:', recipesLookup[cartItem.product.id]?.length ?? 0,
        '| entries built:', ingUsageEntries.length
      )
    })
    console.log('[NEXPOS] USAGE ENTRIES TOTAL:', ingUsageEntries.length, ingUsageEntries)
    if (ingUsageEntries.length > 0) {
      addUsageEntries(ingUsageEntries)
      // Also persist each entry to the ingredient_usage Sheets tab for cross-device durability
      ingUsageEntries.forEach(entry => {
        logSaleIngredientUsage({
          id:              entry.id,
          timestamp:       entry.timestamp,
          transaction_id:  entry.transaction_id,
          product_id:      entry.product_id,
          product_name:    entry.product_name,
          ingredient_id:   entry.ingredient_id,
          ingredient_name: entry.ingredient_name,
          quantity_used:   entry.quantity_used,
          unit:            entry.unit,
        }).catch(console.error)
      })
    }

    // 3. Sync each sold product's new stock to Sheets + log inventory
    cart.forEach(item => {
      const current = products.find(p => p.id === item.product.id)
      if (!current) return
      const newStock = Math.max(0, current.stock - item.quantity)
      const updated  = { ...current, stock: newStock, updatedAt: now }

      saveProductToSheets('updateProduct', {
        id: updated.id, name: updated.name, sku: updated.sku,
        category: updated.category, price: updated.price, cost: updated.cost,
        stock: newStock, min_stock: updated.minStock,
        description: updated.description, emoji: updated.emoji,
        barcode: updated.barcode, unit: updated.unit,
        tax_rate: updated.taxRate, is_active: updated.isActive !== false,
        image_url: updated.imageUrl?.startsWith('data:') ? undefined : updated.imageUrl,
        created_at: updated.createdAt, updated_at: now,
      }).catch(console.error)

      logInventoryChange({
        product_id: current.id,
        product_name: current.name,
        change_type: 'sale',
        quantity_before: current.stock,
        quantity_after: newStock,
        note: `Sale ${txId}`,
      }).catch(console.error)
    })

    // 4. Save transaction to Sheets
    saveTransactionToSheets({
      transaction_id: txId,
      date: now,
      subtotal,
      discount_pct: discountValue,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      total,
      payment_method: method,
      items_count: cart.reduce((s, i) => s + i.quantity, 0),
      cashier: 'Alex Chen',
      items: cart.map(i => ({
        product_id: i.product.id,
        product_name: i.product.name,
        sku: i.product.sku,
        quantity: i.quantity,
        unit_price: i.product.price,
        subtotal: i.product.price * i.quantity,
      })),
    }).catch(() => {
      toast.error('Could not save to Google Sheets', { duration: 4000 })
    })

    // 5. Add to shared transactions context (feeds Reports page live)
    addTransaction({
      id: txId,
      orderNumber: txId,
      items: cart.map(i => ({
        productId: i.product.id,
        productName: i.product.name,
        quantity: i.quantity,
        unitPrice: i.product.price,
        discount: 0,
        total: i.product.price * i.quantity,
      })),
      subtotal,
      tax: taxAmount,
      discount: discountAmount,
      total,
      paymentMethod: method,
      status: 'completed',
      cashierName: 'Alex Chen',
      createdAt: now,
      updatedAt: now,
    })

    setPaymentOpen(false)
    clearCart()
    setDiscountValue(0)
    setOrderNumber(generateOrderId())
    setCompletedOrders(n => n + 1)
    toast.success('Order completed successfully!')
  }, [clearCart, cart, products, ingredients, setIngredients, subtotal, discountValue, discountAmount, taxAmount, total, addTransaction, addUsageEntries])

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">
      {/* ─── Left: Product Browser ─────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* POS Top Bar */}
        <div className="flex items-center justify-between gap-4 px-5 py-3 bg-white border-b border-surface-100">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient shadow-brand">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-surface-900">POS Terminal</p>
              <p className="text-[11px] text-surface-500">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                {' · '}
                {completedOrders} orders today
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search products or scan barcode..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-9 rounded-xl border border-surface-200 bg-surface-50 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button className="flex h-9 items-center gap-2 rounded-xl border border-surface-200 bg-white px-3 text-sm text-surface-600 transition-all hover:border-brand-300 hover:text-brand-600">
              <ScanLine className="h-4 w-4" />
              <span className="text-xs font-medium">Scan</span>
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto px-5 py-3 bg-white border-b border-surface-100 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200 flex-shrink-0',
                selectedCategory === cat.id
                  ? 'bg-brand-gradient text-white shadow-brand'
                  : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              )}
            >
              <span>{cat.emoji}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-surface-400">
              <ShoppingBag className="h-12 w-12 opacity-30" />
              <p className="text-sm font-medium">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={addToCart}
                  qty={cartQtyMap[product.id] ?? 0}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Right: Cart Panel ──────────────────────────────────────────── */}
      <div className="flex w-[360px] flex-shrink-0 flex-col border-l border-surface-200 bg-white shadow-[-4px_0_20px_rgba(0,0,0,0.04)]">

        {/* Cart Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
              <Receipt className="h-4 w-4 text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-surface-900">{orderNumber}</p>
              <p className="text-xs text-surface-500">{totalItems} item{totalItems !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-200 text-surface-500 hover:bg-surface-50 transition-all">
              <User className="h-3.5 w-3.5" />
            </button>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-5">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-100">
                <ShoppingBag className="h-8 w-8 text-surface-300" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-surface-500">Cart is empty</p>
                <p className="text-xs text-surface-400 mt-1">Tap a product to add it</p>
              </div>
            </div>
          ) : (
            <div className="py-1">
              {cart.map(item => (
                <CartItemRow
                  key={item.product.id}
                  item={item}
                  onInc={() => incQty(item.product.id)}
                  onDec={() => decQty(item.product.id)}
                  onRemove={() => removeFromCart(item.product.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Order Summary */}
        {cart.length > 0 && (
          <div className="border-t border-surface-100 px-5 pt-4 pb-5">
            {/* Subtotal */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-surface-500">Subtotal</span>
                <span className="font-semibold text-surface-700 num-display">{formatCurrency(subtotal)}</span>
              </div>

              {/* Discount */}
              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={() => setShowDiscount(!showDiscount)}
                  className="flex items-center gap-1 text-surface-500 hover:text-brand-600 transition-colors"
                >
                  <Tag className="h-3.5 w-3.5" />
                  <span>Discount</span>
                  {discountValue > 0 && (
                    <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600">
                      {discountValue}%
                    </span>
                  )}
                  <ChevronDown className={cn(
                    'h-3 w-3 transition-transform',
                    showDiscount && 'rotate-180'
                  )} />
                </button>
                {discountAmount > 0 ? (
                  <span className="font-semibold text-emerald-600 num-display">-{formatCurrency(discountAmount)}</span>
                ) : (
                  <span className="text-surface-400">—</span>
                )}
              </div>

              {showDiscount && (
                <div className="flex items-center gap-2 py-1 animate-slide-up">
                  {[0, 5, 10, 15, 20].map(pct => (
                    <button
                      key={pct}
                      onClick={() => setDiscountValue(pct)}
                      className={cn(
                        'flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all',
                        discountValue === pct
                          ? 'bg-brand-gradient text-white shadow-brand'
                          : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                      )}
                    >
                      {pct === 0 ? 'None' : `${pct}%`}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-surface-500">Tax (8%)</span>
                <span className="font-semibold text-surface-700 num-display">{formatCurrency(taxAmount)}</span>
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between rounded-2xl bg-surface-50 px-4 py-3 mb-4 border border-surface-100">
              <span className="text-base font-bold text-surface-900">Total</span>
              <span className="text-xl font-black text-surface-900 num-display">{formatCurrency(total)}</span>
            </div>

            {/* Payment Methods */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(
                [
                  { id: 'cash',   label: 'Cash',   icon: Banknote,   color: 'emerald' },
                  { id: 'card',   label: 'Card',   icon: CreditCard, color: 'brand' },
                  { id: 'mobile', label: 'QR Pay', icon: QrCode,     color: 'violet' },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setPaymentOpen(true)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl border py-2.5 text-[11px] font-semibold transition-all duration-200',
                    'bg-surface-50 border-surface-200 text-surface-600',
                    'hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 active:scale-95'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Charge Button */}
            <button
              onClick={() => setPaymentOpen(true)}
              className="w-full h-14 rounded-2xl bg-brand-gradient text-white text-base font-bold shadow-brand hover:shadow-brand-lg hover:brightness-110 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Zap className="h-5 w-5" />
              Charge {formatCurrency(total)}
            </button>

            {/* New Order button */}
            <button
              onClick={clearCart}
              className="mt-2 w-full h-9 rounded-xl border border-surface-200 bg-white text-sm text-surface-500 font-medium transition-all hover:bg-surface-50 hover:text-surface-700 flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              New Order
            </button>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {paymentOpen && (
        <PaymentModal
          total={total}
          onClose={() => setPaymentOpen(false)}
          onConfirm={handlePaymentConfirm}
        />
      )}
    </div>
  )
}
