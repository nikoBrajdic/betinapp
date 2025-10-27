// Date utilities for Murter, Croatia timezone
// Murter is in Central European Time (CET/CEST) - UTC+1/+2

export const TIMEZONE = 'Europe/Zagreb' // Croatia timezone
export const LOCATION = 'Murter, Croatia'
export const LOCALE = 'hr-HR' // Croatian locale

/**
 * Get a date string in YYYY-MM-DD format using local timezone
 * Avoids timezone conversion issues by using local date components
 */
export function getLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format a date string for display using Croatian locale with numeric months
 * Parses date string as local date to avoid timezone shifts
 */
export function formatDateString(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00') // Force local timezone
  const weekday = date.toLocaleDateString(LOCALE, { weekday: "short" })
  const day = date.getDate()
  const month = date.getMonth() + 1
  return `${weekday}, ${day}.${month}.`
}

/**
 * Format a date string for display with month and day only
 * Used for "Until" dates in multi-day events
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00') // Force local timezone
  const day = date.getDate()
  const month = date.getMonth() + 1
  return `${day}.${month}.`
}

/**
 * Format a date string for display with full date
 * Used in tables and detailed views
 */
export function formatDateFull(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00') // Force local timezone
  const day = date.getDate()
  const month = date.getMonth() + 1
  const year = date.getFullYear()
  return `${day}.${month}.${year}.`
}

/**
 * Format a DateTime string for display
 * Used for timestamps like updated_at
 */
export function formatDateTime(dateTimeStr: string): string {
  const date = new Date(dateTimeStr)
  const day = date.getDate()
  const month = date.getMonth() + 1
  const year = date.getFullYear()
  return `${day}.${month}.${year}.`
}
