// ─── Transaction types ────────────────────────────────────────────────────────
export interface SheetTransactionItem {
  product_id: string
  product_name: string
  sku: string
  quantity: number
  unit_price: number
  subtotal: number
}

export interface SheetTransaction {
  transaction_id: string
  date: string
  subtotal: number
  discount_pct: number
  discount_amount: number
  tax_amount: number
  total: number
  payment_method: string
  items_count: number
  cashier: string
  items: SheetTransactionItem[]
}

// ─── Customer types ───────────────────────────────────────────────────────────
export interface SheetCustomer {
  id: string
  name: string
  email?: string
  phone?: string
  notes?: string
  total_purchases?: number
  created_at: string
}

// ─── Product types ────────────────────────────────────────────────────────────
export interface SheetProduct {
  id: string
  name: string
  sku: string
  category: string
  price: number
  cost?: number
  stock: number
  min_stock?: number
  description?: string
  emoji?: string
  barcode?: string
  unit?: string
  tax_rate?: number
  is_active: boolean
  image_url?: string
  recipe?: string
  created_at: string
  updated_at: string
}

// ─── Inventory log types ──────────────────────────────────────────────────────
export interface SheetInventoryLog {
  product_id: string
  product_name: string
  change_type: 'initial_stock' | 'sale' | 'adjustment' | 'restock'
  quantity_before: number
  quantity_after: number
  note?: string
}

/**
 * Per-store script URL override.
 * Set by the dashboard layout once the authenticated user is known.
 * Falls back to the env var if not set.
 */
let _scriptUrlOverride = ''

/**
 * Called by the dashboard layout after login to point all sheet writes
 * at the authenticated store's Apps Script deployment.
 * Pass an empty string to revert to the env var.
 */
export function setScriptUrl(url: string): void {
  _scriptUrlOverride = url
}

/**
 * Shared fetch helper — sends a POST directly from the browser to the
 * Google Apps Script Web App using mode:'no-cors'.
 *
 * The response is opaque (unreadable) but the script executes and writes
 * to the sheet. Google's 302 redirect is handled correctly by the browser.
 */
async function postToSheets(payload: Record<string, unknown>): Promise<void> {
  const url = _scriptUrlOverride || process.env.NEXT_PUBLIC_GOOGLE_SHEETS_SCRIPT_URL

  if (!url) {
    console.warn('[sheets] No Google Apps Script URL configured — skipping')
    return
  }

  await fetch(`${url}?t=${Date.now()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, // required for no-cors POST
    body: JSON.stringify(payload),
    mode: 'no-cors', // browser handles Google's redirect; response is opaque but script runs
  })
}

// ─── Transactions ─────────────────────────────────────────────────────────────
export async function saveTransactionToSheets(payload: SheetTransaction): Promise<void> {
  await postToSheets({ action: 'saveTransaction', ...payload })
}

// ─── Customers ────────────────────────────────────────────────────────────────
export async function saveCustomerToSheets(customer: SheetCustomer): Promise<void> {
  await postToSheets({ action: 'saveCustomer', ...customer })
}

// ─── Products ─────────────────────────────────────────────────────────────────
export async function saveProductToSheets(
  action: 'saveProduct' | 'updateProduct',
  product: SheetProduct
): Promise<void> {
  await postToSheets({ action, ...product })
}

// ─── Image upload ─────────────────────────────────────────────────────────────
/**
 * Uploads a product image via the Next.js proxy route → Google Apps Script → Google Drive.
 * Returns the public sharing URL of the uploaded image.
 */
export async function uploadProductImage(file: File): Promise<string> {
  const scriptUrl = _scriptUrlOverride || process.env.NEXT_PUBLIC_GOOGLE_SHEETS_SCRIPT_URL
  if (!scriptUrl) throw new Error('No Google Apps Script URL configured')

  const formData = new FormData()
  formData.append('file', file)
  formData.append('scriptUrl', scriptUrl)

  const res = await fetch('/api/upload-image', { method: 'POST', body: formData })
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
  const data = await res.json()
  if (!data.url) throw new Error(data.error ?? 'No URL returned from upload')
  return data.url as string
}

// ─── Ingredients ──────────────────────────────────────────────────────────
export interface SheetIngredient {
  id: string
  name: string
  unit: string
  stock: number
  min_stock: number
  cost_per_unit: number
  created_at: string
  updated_at: string
}

export interface SheetIngredientLog {
  ingredient_id: string
  ingredient_name: string
  change_type: 'initial_stock' | 'sale' | 'adjustment' | 'restock'
  quantity_before: number
  quantity_after: number
  note?: string
}

export async function saveIngredientToSheets(
  action: 'saveIngredient' | 'updateIngredient',
  ingredient: SheetIngredient
): Promise<void> {
  await postToSheets({ action, ...ingredient })
}

export async function logIngredientUsage(log: SheetIngredientLog): Promise<void> {
  await postToSheets({
    action: 'logIngredientUsage',
    id: `ing_${Date.now()}`,
    timestamp: new Date().toISOString(),
    quantity_change: log.quantity_after - log.quantity_before,
    ...log,
  })
}

// ─── Ingredient Usage Analytics (sale events) ─────────────────────────────────
// Separate from the stock-change log above — this is one row per ingredient
// per sold item, structured for the ingredient_usage analytics sheet.
export interface SheetIngredientUsageEntry {
  id: string
  timestamp: string
  transaction_id: string
  product_id: string
  product_name: string
  ingredient_id: string
  ingredient_name: string
  quantity_used: number
  unit: string
}

export async function logSaleIngredientUsage(entry: SheetIngredientUsageEntry): Promise<void> {
  await postToSheets({ action: 'saveIngredientUsage', ...entry })
}

// ─── Read from Sheets (via Next.js proxy) ─────────────────────────────────────
/**
 * Fetches rows from a GAS sheet via the /api/sheets proxy route.
 * Returns an empty array if unavailable (GAS not configured, network error, etc.)
 */
export async function fetchFromSheetsProxy(action: 'getProducts' | 'getIngredients' | 'getIngredientUsage' | 'getTransactions'): Promise<Record<string, unknown>[]> {
  try {
    // Pass the active GAS URL to the server proxy so it works even when only
    // NEXT_PUBLIC_GOOGLE_SHEETS_SCRIPT_URL is configured (no server-side env var).
    const activeUrl = _scriptUrlOverride || process.env.NEXT_PUBLIC_GOOGLE_SHEETS_SCRIPT_URL || ''
    const params = new URLSearchParams({ action })
    if (activeUrl) params.set('scriptUrl', activeUrl)
    const res = await fetch(`/api/sheets?${params}`)
    if (!res.ok) return []
    const data: unknown = await res.json()
    return Array.isArray(data) ? (data as Record<string, unknown>[]) : []
  } catch {
    return []
  }
}

// ─── Store reset ──────────────────────────────────────────────────────────────
/**
 * Clears rows 2+ (keeping headers) from all five data sheets:
 * products, transactions, transaction_items, inventory_logs, customers.
 * Only affects the currently configured store's spreadsheet.
 */
export async function clearStoreData(): Promise<void> {
  await postToSheets({ action: 'clearStoreData' })
}

// ─── Inventory logs ───────────────────────────────────────────────────────────
export async function logInventoryChange(log: SheetInventoryLog): Promise<void> {
  await postToSheets({
    action: 'logInventory',
    id: `inv_${Date.now()}`,
    timestamp: new Date().toISOString(),
    quantity_change: log.quantity_after - log.quantity_before,
    ...log,
  })
}
