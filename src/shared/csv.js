// CSV files for the staff "Export" buttons (Analytics, Enquiries, Work Log).
// Every cell is quoted, so commas, quotes and line breaks inside a name or
// message stay in their column. A text cell that starts like a formula
// (= + - @) gets a leading ' so Excel shows it instead of running it.

export function csvCell(value) {
  if (value === null || value === undefined) return '""'
  if (typeof value === 'number') return Number.isFinite(value) ? `"${value}"` : '""'
  let text = String(value)
  if (/^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export const toCsv = rows => rows.map(row => row.map(csvCell).join(',')).join('\r\n')

// Saves rows (the first being the headers) as a UTF-8 file Excel opens with
// Tamil and the rupee sign intact.
export function downloadCsv(filename, rows) {
  const blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
