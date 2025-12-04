export function parseDate(value: string | Date): Date | null {
  if (value instanceof Date) return value
  if (typeof value === "string") {
    const d = new Date(value)
    if (!isNaN(d.getTime())) return d
  }
  return null
}

/**
 * Format a date as MM/DD/YYYY in US format.
 * Accepts either a Date object or a parsable date string (e.g. "2025-12-04").
 * If parsing fails, falls back to the original string.
 */
export function formatDateUS(value: string | Date): string {
  const date = parseDate(value)
  if (!date) return String(value)

  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  const yyyy = date.getFullYear()

  return `${mm}/${dd}/${yyyy}`
}

/**
 * Format a date as 'MMM DD, YYYY' (e.g., 'Oct 23, 2025') in US style.
 */
export function formatDateUSShort(value: string | Date): string {
  const date = parseDate(value)
  if (!date) return String(value)

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  })
}



