import { CircleCheck, Info, OctagonAlert, TriangleAlert } from 'lucide-react'
import { useFarmerT } from '../hooks/useFarmerT.js'

// Icon, words and colour together: status is never shown by colour alone.
const ICONS = { critical: OctagonAlert, warning: TriangleAlert, info: Info, ok: CircleCheck }

export default function StatusBadge({ severity, label }) {
  const { t } = useFarmerT()
  const Icon = ICONS[severity] || Info
  return (
    <span className={`fd-badge fd-badge--${severity}`}>
      <Icon size={18} aria-hidden="true" />
      <span>{label || t(`severity.${severity}`)}</span>
    </span>
  )
}
