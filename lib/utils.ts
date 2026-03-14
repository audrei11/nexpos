import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'PHP'): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  }).format(d)
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d)
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} ${formatTime(date)}`
}

export function generateOrderId(): string {
  const prefix = 'ORD'
  const num = Math.floor(Math.random() * 90000) + 10000
  return `${prefix}-${num}`
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return function (...args: Parameters<T>) {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Convert a quantity from one unit to another (recipe unit → stock unit).
 * e.g. 200 g → 0.2 kg so cost calculation is correct.
 */
export function convertToStockUnit(qty: number, fromUnit: string | undefined, toUnit: string): number {
  const from = (fromUnit ?? toUnit).trim()
  const to   = toUnit.trim()
  if (from === to) return qty
  if (from === 'g'  && to === 'kg') return qty / 1000
  if (from === 'kg' && to === 'g')  return qty * 1000
  if (from === 'ml' && to === 'L')  return qty / 1000
  if (from === 'L'  && to === 'ml') return qty * 1000
  return qty
}

export function guessIngredientEmoji(name: string): string {
  const n = name.toLowerCase()
  if (/milk|cream|dairy/.test(n))                        return '🥛'
  if (/coffee|espresso|bean/.test(n))                    return '☕'
  if (/matcha|green tea/.test(n))                        return '🍵'
  if (/tea|leaves/.test(n))                              return '🫖'
  if (/chocolate|cocoa|choco/.test(n))                   return '🍫'
  if (/strawberry/.test(n))                              return '🍓'
  if (/caramel/.test(n))                                 return '🍮'
  if (/vanilla/.test(n))                                 return '🍦'
  if (/almond/.test(n))                                  return '🌰'
  if (/fructose|syrup|sugar|honey/.test(n))              return '🍯'
  if (/salt/.test(n))                                    return '🧂'
  if (/pepper|chili/.test(n))                            return '🌶️'
  if (/soy sauce|soy/.test(n))                           return '🍶'
  if (/ketchup|tomato sauce/.test(n))                    return '🍅'
  if (/mayo|mayonnaise/.test(n))                         return '🫙'
  if (/sauce|gravy|oil|vinegar/.test(n))                 return '🫙'
  if (/flour|powder|mix|baking/.test(n))                 return '🌾'
  if (/butter/.test(n))                                  return '🧈'
  if (/egg/.test(n))                                     return '🥚'
  if (/bread/.test(n))                                   return '🍞'
  if (/cheese/.test(n))                                  return '🧀'
  if (/ham|bacon|meat|beef|pork/.test(n))                return '🥩'
  if (/chicken/.test(n))                                 return '🍗'
  if (/fish|tuna|salmon/.test(n))                        return '🐟'
  if (/rice/.test(n))                                    return '🍚'
  if (/sausage/.test(n))                                 return '🌭'
  if (/lettuce|cabbage/.test(n))                         return '🥬'
  if (/tomato/.test(n))                                  return '🍅'
  if (/cucumber/.test(n))                                return '🥒'
  if (/onion/.test(n))                                   return '🧅'
  if (/garlic/.test(n))                                  return '🧄'
  if (/carrot/.test(n))                                  return '🥕'
  if (/potato/.test(n))                                  return '🥔'
  if (/corn/.test(n))                                    return '🌽'
  if (/mushroom/.test(n))                                return '🍄'
  if (/water/.test(n))                                   return '💧'
  if (/ice/.test(n))                                     return '🧊'
  if (/juice|orange|lemon/.test(n))                      return '🍊'
  if (/whip|foam/.test(n))                               return '🍦'
  if (/cookie|biscuit|crumb/.test(n))                    return '🍪'
  return '🧪'
}
