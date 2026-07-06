// Nepali in-browser input methods (IME) for KeyDash.
//
// KeyDash's Nepali targets are Devanagari (from nepali.json) and comparison is a
// direct Unicode match. To let users type Nepali on a plain QWERTY keyboard, we
// take the raw keystrokes they type and transliterate them to Devanagari using
// the `nepalify` library (ISC, offline, no external API). The typing engine then
// compares that derived Devanagari against the target as usual.
//
// Two layouts are supported, mirroring the government tools:
//  - traditional: fixed positional layout (Preeti/Inscript-style), each key is a char
//  - romanized:   phonetic, e.g. "ahile" -> अहिले
import nepalify from 'nepalify'

// nepalify's default export is an object exposing format(str, { layout }).
// It maps each key to a fixed Devanagari string (the standard Nepali Unicode
// "traditional" / "romanized" layouts), so transliteration is a per-key lookup.
const formatFn = typeof nepalify?.format === 'function' ? nepalify.format : null

// Supported Nepali input methods, surfaced in the mode selector and keyboard guide.
export const INPUT_METHODS = {
  romanized: { key: 'romanized', name: 'Romanized' },
  traditional: { key: 'traditional', name: 'Traditional' },
}

export const DEFAULT_INPUT_METHOD = 'romanized'

const VALID_LAYOUTS = new Set(['romanized', 'traditional'])

/**
 * True when a Nepali in-browser IME should transform keystrokes.
 * English (or Nepali without a chosen method) keeps the plain direct-typing path.
 */
export const isNepaliIme = (language, inputMethod) =>
  language === 'nepali' && VALID_LAYOUTS.has(inputMethod)

/**
 * Transliterate raw keystrokes into NFC-normalized Devanagari for the given layout.
 * Pure function of the whole raw buffer, so native textarea editing (backspace,
 * selection) just works — we simply re-derive on every change.
 * Falls back to the raw string if nepalify is unavailable (e.g. not yet installed).
 */
export const formatNepali = (raw, layout) => {
  if (!raw) return ''
  if (!formatFn || !VALID_LAYOUTS.has(layout)) return raw
  try {
    return formatFn(raw, { layout }).normalize('NFC')
  } catch {
    return raw
  }
}
