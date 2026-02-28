import englishData from '../../assets/english/english.json'
import timedData from '../../assets/english/timed.json'

export const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

const RACE_META_PREFIX = '[[KDMP:'
const RACE_META_SUFFIX = ']]'
const SENTENCE_RANGES = {
  easy: [0, 100],
  medium: [101, 300],
  hard: [301, 600],
  extreme: [601, 9999],
}
const TIMED_OPTIONS = [15, 30, 60, 120]

const clampTimedDuration = (value) => {
  const n = Number.parseInt(value, 10)
  if (TIMED_OPTIONS.includes(n)) return n
  return 60
}

const normalizeRaceConfig = (cfg = {}) => {
  const mode = ['sentence', 'timed', 'custom'].includes(cfg?.mode) ? cfg.mode : 'sentence'
  const sentenceDifficulty = ['easy', 'medium', 'hard', 'extreme'].includes(cfg?.sentenceDifficulty)
    ? cfg.sentenceDifficulty
    : 'medium'
  const timedDuration = clampTimedDuration(cfg?.timedDuration)

  return { mode, sentenceDifficulty, timedDuration }
}

export const generateSentenceRaceText = (difficulty = 'medium') => {
  const [min, max] = SENTENCE_RANGES[difficulty] || SENTENCE_RANGES.medium
  const quotes = englishData?.quotes || englishData?.sentences || []
  const filtered = quotes.filter((q) => {
    const text = (q?.text || q || '').toString()
    return text.length >= min && text.length <= max
  })
  if (filtered.length === 0) return 'Practice makes perfect.'
  const picked = filtered[Math.floor(Math.random() * filtered.length)]
  return (picked?.text || picked || '').toString()
}

export const generateTimedRaceText = (wordCount = 100) => {
  const words = timedData?.words || []
  if (!words.length) return 'typing practice'

  const selected = []
  for (let i = 0; i < wordCount; i += 1) {
    const idx = Math.floor(Math.random() * words.length)
    selected.push(words[idx])
  }

  return selected.join(' ')
}

export const encodeRaceText = (text, config = {}) => {
  const normalized = normalizeRaceConfig(config)
  const safeText = (text || '').toString().trim()
  return `${RACE_META_PREFIX}${JSON.stringify(normalized)}${RACE_META_SUFFIX}\n${safeText}`
}

export const decodeRaceText = (storedRaceText = '') => {
  const raw = (storedRaceText || '').toString()
  const fallbackConfig = normalizeRaceConfig()

  if (!raw.startsWith(RACE_META_PREFIX)) {
    return {
      ...fallbackConfig,
      text: raw,
      hasMeta: false,
    }
  }

  const suffixIndex = raw.indexOf(RACE_META_SUFFIX)
  if (suffixIndex < 0) {
    return {
      ...fallbackConfig,
      text: raw,
      hasMeta: false,
    }
  }

  const jsonPart = raw.slice(RACE_META_PREFIX.length, suffixIndex)
  const textPartRaw = raw.slice(suffixIndex + RACE_META_SUFFIX.length)
  const text = textPartRaw.startsWith('\n') ? textPartRaw.slice(1) : textPartRaw

  try {
    const parsed = JSON.parse(jsonPart)
    const normalized = normalizeRaceConfig(parsed)
    return {
      ...normalized,
      text,
      hasMeta: true,
    }
  } catch {
    return {
      ...fallbackConfig,
      text: text || raw,
      hasMeta: false,
    }
  }
}

export const buildRaceFromSettings = ({
  mode = 'sentence',
  sentenceDifficulty = 'medium',
  timedDuration = 60,
  customText = '',
} = {}) => {
  const normalized = normalizeRaceConfig({ mode, sentenceDifficulty, timedDuration })

  let text = ''
  if (normalized.mode === 'timed') {
    text = generateTimedRaceText(100)
  } else if (normalized.mode === 'custom') {
    text = (customText || '').toString().trim()
  } else {
    text = generateSentenceRaceText(normalized.sentenceDifficulty)
  }

  return encodeRaceText(text, normalized)
}

// Backward-compatible helper used by existing callers.
export const generateRaceText = (options = {}) => {
  if (typeof options === 'string') {
    return encodeRaceText(generateSentenceRaceText(options), { mode: 'sentence', sentenceDifficulty: options })
  }
  return buildRaceFromSettings(options)
}
