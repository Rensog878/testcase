import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'
import { toast } from 'sonner'
import {
  User, Phone, MapPin, Shield, Banknote,
  Save, Camera, AlertCircle, CheckCircle2, ChevronDown, ChevronUp,
  Briefcase, HeartPulse, GraduationCap
} from 'lucide-react'

function Section({ icon: Icon, title, color, children, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false)
  return (
    <div className="profile-section-card">
      <button
        className="profile-section-header"
        onClick={() => setOpen(o => !o)}
        type="button"
        style={{ '--section-color': color || '#5e63ff' }}
      >
        <span className="profile-section-icon"><Icon size={18} /></span>
        <span className="profile-section-title">{title}</span>
        <span className="profile-section-chevron">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
      {open && <div className="profile-section-body">{children}</div>}
    </div>
  )
}

function Field({ label, name, value, onChange, type, placeholder, required, half, options, textarea }) {
  return (
    <div className={`profile-field${half ? ' half' : ''}`}>
      <label className="profile-label">
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {options ? (
        <select className="profile-input" name={name} value={value} onChange={onChange}>
          <option value="">Select...</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : textarea ? (
        <textarea className="profile-input profile-textarea" name={name} value={value}
          onChange={onChange} placeholder={placeholder} rows={3} />
      ) : (
        <input className="profile-input" type={type || 'text'} name={name} value={value}
          onChange={onChange} placeholder={placeholder} required={required} />
      )}
    </div>
  )
}

const EMPTY = {
  fullName: '', dateOfBirth: '', gender: '', bloodGroup: '', fatherName: '',
  motherName: '', maritalStatus: '', nationality: 'Indian',
  personalEmail: '', personalPhone: '', alternatePhone: '',
  currentAddress: '', permanentAddress: '', city: '', state: '', pincode: '',
  emergencyName: '', emergencyRelation: '', emergencyPhone: '',
  designation: '', department: '', joiningDate: '', employeeCode: '',
  aadharNumber: '', panNumber: '',
  bankName: '', bankAccountNumber: '', ifscCode: '', bankBranch: '', upiId: '',
  qualification: '', institution: '', yearOfPassing: '',
  bio: '', skills: '', languages: '',
  profilePhoto: '',
}

export default function EmployeeProfile() {
  const { user } = useAuth()
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const fileRef = useRef()

  useEffect(() => {
    let cancelled = false
    axios.get('/api/staff-profile')
      .then(res => {
        if (cancelled) return
        const data = res.data?.data || {}
        setForm(prev => ({ ...prev, ...data }))
        if (data.updatedAt) setLastSaved(data.updatedAt)
      })
      .catch(() => toast.error('Could not load your profile. Please refresh.'))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleChange = e => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handlePhotoChange = e => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Photo must be smaller than 2 MB'); return }
    const reader = new FileReader()
    reader.onload = ev => setForm(prev => ({ ...prev, profilePhoto: ev.target.result }))
    reader.readAsDataURL(file)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.fullName.trim()) { toast.error('Full name is required'); return }
    setSaving(true)
    try {
      const res = await axios.put('/api/staff-profile', form)
      setLastSaved(res.data?.data?.updatedAt || new Date().toISOString())
      toast.success('Profile saved successfully!')
    } catch {
      toast.error('Could not save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const initials = (user?.name || form.fullName || 'ME')
    .split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading your profile...
      </div>
    )
  }

  return (
    <div className="animate-fade-in employee-profile-page">
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <p className="employee-eyebrow">MY ACCOUNT</p>
          <h1>My Profile</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Keep your personal information up to date. Visible only to you and your admin.
          </p>
        </div>
        {lastSaved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#16a34a', fontSize: '0.8rem', fontWeight: 600, background: '#f0fdf4', padding: '8px 14px', borderRadius: 8, border: '1px solid #bbf7d0' }}>
            <CheckCircle2 size={14} />
            Last saved {new Date(lastSaved).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="profile-identity-bar">
          <div className="profile-avatar-wrap">
            {form.profilePhoto
              ? <img src={form.profilePhoto} alt="Profile" className="profile-avatar-img" />
              : <div className="profile-avatar-initials">{initials}</div>
            }
            <button type="button" className="profile-avatar-btn" onClick={() => fileRef.current?.click()} title="Change photo">
              <Camera size={14} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
          </div>
          <div className="profile-identity-info">
            <div className="profile-identity-name">{user?.name || form.fullName || 'Your Name'}</div>
            <div className="profile-identity-meta">
              {user?.role && <span className="badge badge-blue" style={{ textTransform: 'capitalize' }}>{user.role}</span>}
              {user?.storeName && <span className="profile-identity-store">🏪 {user.storeName}</span>}
              {form.designation && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>· {form.designation}</span>}
            </div>
            {form.bio && <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 480 }}>{form.bio}</p>}
          </div>
        </div>

        <div className="profile-sections-list">
          <Section icon={User} title="Personal Information" defaultOpen color="#5e63ff">
            <div className="profile-fields-grid">
              <Field label="Full Name" name="fullName" value={form.fullName} onChange={handleChange} placeholder="As per Aadhaar" required />
              <Field label="Date of Birth" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} type="date" half />
              <Field label="Gender" name="gender" value={form.gender} onChange={handleChange} half options={['Male','Female','Other','Prefer not to say']} />
              <Field label="Blood Group" name="bloodGroup" value={form.bloodGroup} onChange={handleChange} half options={['A+','A-','B+','B-','AB+','AB-','O+','O-']} />
              <Field label="Marital Status" name="maritalStatus" value={form.maritalStatus} onChange={handleChange} half options={['Single','Married','Divorced','Widowed']} />
              <Field label="Father's Name" name="fatherName" value={form.fatherName} onChange={handleChange} placeholder="Father's full name" half />
              <Field label="Mother's Name" name="motherName" value={form.motherName} onChange={handleChange} placeholder="Mother's full name" half />
              <Field label="Nationality" name="nationality" value={form.nationality} onChange={handleChange} placeholder="Indian" half />
              <Field label="Bio / About Yourself" name="bio" value={form.bio} onChange={handleChange} placeholder="A short description..." textarea />
            </div>
          </Section>

          <Section icon={Phone} title="Contact Information" color="#0ea5e9">
            <div className="profile-fields-grid">
              <Field label="Personal Email" name="personalEmail" value={form.personalEmail} onChange={handleChange} type="email" placeholder="your@email.com" half />
              <Field label="Personal Phone" name="personalPhone" value={form.personalPhone} onChange={handleChange} type="tel" placeholder="+91 XXXXX XXXXX" half />
              <Field label="Alternate Phone" name="alternatePhone" value={form.alternatePhone} onChange={handleChange} type="tel" placeholder="Optional" half />
            </div>
          </Section>

          <Section icon={MapPin} title="Address Details" color="#f59e0b">
            <div className="profile-fields-grid">
              <Field label="Current Address" name="currentAddress" value={form.currentAddress} onChange={handleChange} placeholder="Door no, Street, Area" textarea />
              <Field label="Permanent Address" name="permanentAddress" value={form.permanentAddress} onChange={handleChange} placeholder="If different from current" textarea />
              <Field label="City" name="city" value={form.city} onChange={handleChange} placeholder="City" half />
              <Field label="State" name="state" value={form.state} onChange={handleChange} placeholder="State" half />
              <Field label="PIN Code" name="pincode" value={form.pincode} onChange={handleChange} placeholder="6-digit PIN" half />
            </div>
          </Section>

          <Section icon={HeartPulse} title="Emergency Contact" color="#ef4444">
            <div className="profile-fields-grid">
              <Field label="Contact Name" name="emergencyName" value={form.emergencyName} onChange={handleChange} placeholder="Full name" half />
              <Field label="Relationship" name="emergencyRelation" value={form.emergencyRelation} onChange={handleChange} placeholder="e.g. Spouse, Parent" half />
              <Field label="Phone Number" name="emergencyPhone" value={form.emergencyPhone} onChange={handleChange} type="tel" placeholder="+91 XXXXX XXXXX" half />
            </div>
          </Section>

          <Section icon={Briefcase} title="Employment Details" color="#8b5cf6">
            <div className="profile-fields-grid">
              <Field label="Employee Code" name="employeeCode" value={form.employeeCode} onChange={handleChange} placeholder="e.g. SAM-EMP-001" half />
              <Field label="Designation" name="designation" value={form.designation} onChange={handleChange} placeholder="Job title" half />
              <Field label="Department" name="department" value={form.department} onChange={handleChange} placeholder="Department" half />
              <Field label="Date of Joining" name="joiningDate" value={form.joiningDate} onChange={handleChange} type="date" half />
            </div>
          </Section>

          <Section icon={GraduationCap} title="Education" color="#10b981">
            <div className="profile-fields-grid">
              <Field label="Highest Qualification" name="qualification" value={form.qualification} onChange={handleChange} placeholder="e.g. B.Sc. Agriculture" half />
              <Field label="Institution / University" name="institution" value={form.institution} onChange={handleChange} placeholder="College / University name" half />
              <Field label="Year of Passing" name="yearOfPassing" value={form.yearOfPassing} onChange={handleChange} placeholder="e.g. 2019" half />
              <Field label="Skills" name="skills" value={form.skills} onChange={handleChange} placeholder="Comma-separated skills" half />
              <Field label="Languages Known" name="languages" value={form.languages} onChange={handleChange} placeholder="e.g. Tamil, English, Hindi" half />
            </div>
          </Section>

          <Section icon={Shield} title="KYC Documents" color="#f97316">
            <div style={{ background: '#fef9f0', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 8, fontSize: '0.82rem', color: '#92400e' }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              Your KYC details are encrypted and only visible to authorized administrators.
            </div>
            <div className="profile-fields-grid">
              <Field label="Aadhaar Number" name="aadharNumber" value={form.aadharNumber} onChange={handleChange} placeholder="XXXX XXXX XXXX" half />
              <Field label="PAN Number" name="panNumber" value={form.panNumber} onChange={handleChange} placeholder="ABCDE1234F" half />
            </div>
          </Section>

          <Section icon={Banknote} title="Bank & Payment Details" color="#0f766e">
            <div className="profile-fields-grid">
              <Field label="Bank Name" name="bankName" value={form.bankName} onChange={handleChange} placeholder="Name of your bank" half />
              <Field label="Account Number" name="bankAccountNumber" value={form.bankAccountNumber} onChange={handleChange} placeholder="Bank account number" half />
              <Field label="IFSC Code" name="ifscCode" value={form.ifscCode} onChange={handleChange} placeholder="e.g. SBIN0001234" half />
              <Field label="Branch Name" name="bankBranch" value={form.bankBranch} onChange={handleChange} placeholder="Branch name / city" half />
              <Field label="UPI ID" name="upiId" value={form.upiId} onChange={handleChange} placeholder="yourname@upi" half />
            </div>
          </Section>
        </div>

        <div className="profile-save-bar">
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: 160 }}>
            {saving ? 'Saving...' : <><Save size={16} style={{ marginRight: 6 }} />Save Profile</>}
          </button>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Changes are only saved when you click "Save Profile".
          </span>
        </div>
      </form>
    </div>
  )
}
