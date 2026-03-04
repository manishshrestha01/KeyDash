const toText = (value) => String(value ?? '').trim()

const hasHttpScheme = (value) => /^https?:\/\//i.test(value)

const looksLikeHostPath = (value) => /^[a-z0-9.-]+\.[a-z]{2,}\/.+/i.test(value)

const ensureHttps = (value) => {
  const input = toText(value)
  if (!input) return ''
  return hasHttpScheme(input) ? input : `https://${input}`
}

const trimSlashes = (value) => toText(value).replace(/^\/+|\/+$/g, '')

const normalizeUsername = (value) =>
  trimSlashes(value)
    .replace(/^@+/, '')
    .replace(/\s+/g, '')

const buildSocialPathLink = (platform, rawValue) => {
  const input = toText(rawValue)
  if (!input) return ''

  if (hasHttpScheme(input) || looksLikeHostPath(input)) {
    return ensureHttps(input)
  }

  const username = normalizeUsername(input)
  if (!username) return ''

  switch (platform) {
    case 'twitter':
      return `https://x.com/${username}`
    case 'github':
      return `https://github.com/${username}`
    case 'linkedin': {
      if (username.startsWith('in/') || username.startsWith('company/')) {
        return `https://linkedin.com/${username}`
      }
      return `https://linkedin.com/in/${username}`
    }
    case 'instagram':
      return `https://instagram.com/${username}`
    case 'youtube': {
      const handle = username.startsWith('@') ? username : `@${username}`
      return `https://youtube.com/${handle}`
    }
    case 'twitch':
      return `https://twitch.tv/${username}`
    case 'reddit': {
      if (username.startsWith('u/') || username.startsWith('r/')) {
        return `https://reddit.com/${username}`
      }
      return `https://reddit.com/u/${username}`
    }
    case 'snapchat': {
      const snapName = username.replace(/^add\//, '')
      return `https://www.snapchat.com/add/${snapName}`
    }
    default:
      return ''
  }
}

export const buildProfileLink = (platform, rawValue) => {
  const input = toText(rawValue)
  if (!input) return ''

  if (platform === 'website') {
    return ensureHttps(input)
  }

  return buildSocialPathLink(platform, input)
}

export const validateWebsiteInput = (value) => {
  const input = toText(value)
  if (!input) return ''

  try {
    // Accept plain domains by normalizing with https.
    // eslint-disable-next-line no-new
    new URL(ensureHttps(input))
    return ''
  } catch {
    return 'Must be a valid website URL'
  }
}
