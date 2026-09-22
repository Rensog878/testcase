import { useLanguage } from '../../context/LanguageContext'
import { fillInput, speechLang, spokenDigits, useVoiceInput, voiceSupported } from '../voice'

// The mic at the right end of an input: tap, speak, and the words go into the
// field with id `htmlFor` (see voice.js). mode: 'text' (Tamil or English, with
// the site), 'latin' (always English: addresses) or 'digits' (mobile, PIN).
// A textarea gets the words added; an input gets them in place of what was there.
// Its container needs the .has-voice class (room on the right; storefront.css 7n).
export default function VoiceButton({ htmlFor, mode = 'text', disabled }) {
  const { lang } = useLanguage()
  const { listening, toggle } = useVoiceInput({
    lang: speechLang(mode, lang),
    onResult: heard => {
      const el = document.getElementById(htmlFor)
      if (!el) return
      if (mode === 'digits') {
        const digits = spokenDigits(heard)
        if (digits) fillInput(el, digits)
        return
      }
      const text = el.tagName === 'TEXTAREA' && el.value.trim() ? `${el.value.trimEnd()} ${heard}` : heard
      fillInput(el, text)
    },
  })
  if (!voiceSupported) return null
  return (
    <button
      type="button"
      className={`sb-voice-btn${listening ? ' is-listening' : ''}`}
      onClick={toggle}
      disabled={disabled}
      aria-pressed={listening}
      aria-label={listening ? 'Stop voice typing' : 'Speak to type'}
      title={listening ? 'Listening... tap to stop' : 'Speak to type'}
    >
      <i className={`fa-solid ${listening ? 'fa-stop' : 'fa-microphone'}`} aria-hidden="true"></i>
    </button>
  )
}
