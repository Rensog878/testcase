// A password problem, shown right under its box instead of as a pop-up. Give
// the input aria-describedby={`${id}-error`} and aria-invalid while `message`
// is set, and passwordBoxStyle for the red outline.
export default function PasswordError({ id, message }) {
  if (!message) return null
  return (
    <small id={`${id}-error`} role="alert" style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginTop: 6, color: '#dc2626', fontSize: '0.78rem', fontWeight: 600, lineHeight: 1.35 }}>
      <span aria-hidden="true">⚠</span>
      <span>{message}</span>
    </small>
  )
}

// The error outline, layered on a field's own style.
export const passwordBoxStyle = (style, message) => (message ? { ...style, borderColor: '#dc2626', boxShadow: '0 0 0 3px rgba(220, 38, 38, 0.12)' } : style)

// The message for the password box from an API error, when the server says it
// belongs there ({ field: 'password' }); otherwise null.
export const passwordErrorFrom = err => (err?.response?.data?.field === 'password' ? err.response.data.message : null)
