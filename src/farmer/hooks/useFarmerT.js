import { useMemo } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { formatDay, formatNumber, formatRupees, formatTime, formatWeekday, translate, translateCount } from '../i18n/strings.js'

/** Dashboard text in the site's current language (English where Tamil is not chosen). */
export function useFarmerT() {
  const { lang, setLang } = useLanguage()
  const helpers = useMemo(() => ({
    lang,
    t: (key, params) => translate(lang, key, params),
    tCount: (key, count, params) => translateCount(lang, key, count, params),
    rupees: amount => formatRupees(amount, lang),
    day: timestamp => formatDay(timestamp, lang),
    time: timestamp => formatTime(timestamp, lang),
    weekday: timestamp => formatWeekday(timestamp, lang),
    number: (value, digits) => formatNumber(value, lang, digits),
  }), [lang])
  return { ...helpers, setLang }
}
