// Currency formatting utility
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || 'EUR'
export const CURRENCY_SYMBOL = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '€'

export function formatCurrency(amount: number): string {
  const formatter = new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  
  return formatter.format(amount)
}

export function formatCurrencySymbol(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toFixed(2)}`
}

// For backwards compatibility, you can also use this simpler version
export function formatMoney(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toFixed(2)}`
}
