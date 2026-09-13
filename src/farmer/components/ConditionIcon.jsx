import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSun, Snowflake, Sun } from 'lucide-react'

const ICONS = {
  clear: Sun,
  partly_cloudy: CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  light_rain: CloudDrizzle,
  rain: CloudRain,
  heavy_rain: CloudRain,
  storm: CloudLightning,
  snow: Snowflake,
  unknown: Cloud,
}

// Decorative: the condition is always written next to it.
export default function ConditionIcon({ condition, size = 24 }) {
  const Icon = ICONS[condition] || Cloud
  return <Icon size={size} aria-hidden="true" />
}
