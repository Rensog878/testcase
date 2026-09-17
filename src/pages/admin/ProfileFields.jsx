import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from 'lucide-react'
import { CORE_FIELDS, FIELD_TYPES, normalizeProfileFields } from '../../shared/profileFieldRules'

// The questions customers answer when they register (store sign-up and
// /register) and can change later under Edit profile. Built-in fields are
// saved to the account itself and keep their input type; name and mobile
// number cannot be removed. Rules: src/shared/profileFieldRules.js.

const optionsText = field => (field.options || []).join(', ')

export default function ProfileFields() {
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  // Choices are edited as typed ("Red, Black,") and split on save.
  const [choiceText, setChoiceText] = useState({})

  const load = list => {
    setFields(list)
    setChoiceText(Object.fromEntries(list.map(field => [field.id, optionsText(field)])))
  }

  useEffect(() => {
    axios.get('/api/admin/profile-fields')
      .then(({ data }) => load(normalizeProfileFields(data.data)))
      .catch(() => toast.error('Could not load profile form'))
      .finally(() => setLoading(false))
  }, [])

  const update = (index, patch) => setFields(current => current.map((field, position) => position === index ? { ...field, ...patch } : field))
  const add = () => {
    const id = `field-${Date.now().toString(36)}`
    setFields(current => [...current, { id, title: '', type: 'text', required: false, editable: true, options: [] }])
    requestAnimationFrame(() => document.getElementById(`profile-field-title-${id}`)?.focus())
  }
  const remove = index => setFields(current => current.filter((_, position) => position !== index))
  const move = (index, step) => setFields(current => {
    const next = [...current]
    const [field] = next.splice(index, 1)
    next.splice(index + step, 0, field)
    return next
  })

  const save = async () => {
    const withChoices = fields.map(field => field.type === 'select' && !CORE_FIELDS[field.id]
      ? { ...field, options: (choiceText[field.id] || '').split(',').map(option => option.trim()).filter(Boolean) }
      : field)
    const untitled = withChoices.find(field => !field.title.trim())
    if (untitled) {
      toast.error('Every field needs a title.')
      document.getElementById(`profile-field-title-${untitled.id}`)?.focus()
      return
    }
    const noChoices = withChoices.find(field => field.type === 'select' && !CORE_FIELDS[field.id] && !field.options.length)
    if (noChoices) {
      toast.error(`Add the choices for "${noChoices.title}", separated by commas.`)
      document.getElementById(`profile-field-options-${noChoices.id}`)?.focus()
      return
    }

    setSaving(true)
    try {
      const { data } = await axios.put('/api/admin/profile-fields', { fields: withChoices })
      load(data.data)
      toast.success('Profile form saved. Registration and Edit profile now use it.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save profile form')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="profile-fields-page animate-fade-in">
      <div className="page-header">
        <div>
          <p className="eyebrow">CUSTOMER EXPERIENCE</p>
          <h1>Personal information form</h1>
          <p>Choose what customers are asked when they register, and what they can change later on their profile.</p>
        </div>
        <div className="profile-fields-actions">
          <button className="btn btn-secondary" onClick={add} disabled={loading}><Plus size={16} /> Add field</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || loading}><Save size={16} /> {saving ? 'Saving...' : 'Save form'}</button>
        </div>
      </div>
      <div className="card profile-field-list">
        {loading ? <div className="empty-state"><p>Loading form fields...</p></div> : fields.map((field, index) => {
          const core = CORE_FIELDS[field.id]
          return (
            <div className="profile-field-row" key={field.id}>
              <div className="profile-field-move">
                <button type="button" className="icon-action" title="Move up" aria-label={`Move ${field.title || 'field'} up`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={14} /></button>
                <button type="button" className="icon-action" title="Move down" aria-label={`Move ${field.title || 'field'} down`} disabled={index === fields.length - 1} onClick={() => move(index, 1)}><ArrowDown size={14} /></button>
              </div>
              <input id={`profile-field-title-${field.id}`} className="profile-field-title" value={field.title} maxLength={60} onChange={event => update(index, { title: event.target.value })} placeholder="Field title, e.g. Aadhaar number" aria-label="Field title" />
              <select value={field.type} disabled={Boolean(core)} title={core ? 'Built-in field: its input type is fixed' : undefined} aria-label="Input type" onChange={event => update(index, { type: event.target.value })}>
                {FIELD_TYPES.map(type => <option key={type}>{type}</option>)}
              </select>
              <label className="profile-checkbox" title={core?.lockRequired ? 'Always required' : undefined}>
                <input type="checkbox" checked={field.required} disabled={core?.lockRequired !== undefined} onChange={event => update(index, { required: event.target.checked })} /> Required
              </label>
              <label className="profile-checkbox" title={core?.lockEditable === false ? 'The mobile number is verified on WhatsApp and cannot be changed' : undefined}>
                <input type="checkbox" checked={field.editable !== false} disabled={core?.lockEditable !== undefined} onChange={event => update(index, { editable: event.target.checked })} /> Customer can edit
              </label>
              <button type="button" className="icon-action danger" title={core?.fixed ? 'Name and mobile number are always asked' : 'Remove field'} aria-label={`Remove ${field.title || 'field'}`} disabled={core?.fixed} onClick={() => remove(index)}><Trash2 size={16} /></button>
              {field.type === 'select' && !core && (
                <input
                  id={`profile-field-options-${field.id}`}
                  className="profile-field-title profile-field-options"
                  value={choiceText[field.id] ?? ''}
                  onChange={event => setChoiceText(current => ({ ...current, [field.id]: event.target.value }))}
                  placeholder="Choices, separated by commas: Drip, Sprinkler, Flood"
                  aria-label={`Choices for ${field.title || 'this field'}`}
                />
              )}
            </div>
          )
        })}
      </div>
      <div className="card profile-field-guidance">
        <strong>Where this form is used</strong>
        <p>New farmers answer every field here when they register: name and mobile number first, the rest on the next step, in this order. Required fields must be answered. Fields marked "Customer can edit" can be changed later from the profile. Built-in fields (name, email, mobile, village, district, state, crop, farm size) are saved to the customer's account and used by orders and advisories; fields you add appear on the customer's profile and in Users &amp; Credentials.</p>
      </div>
    </div>
  )
}
