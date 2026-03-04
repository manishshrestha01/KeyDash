import { supabase } from '../supabaseClient'

const isMissingTableError = (error) =>
  error?.code === '42P01' || /user_achievements/i.test(error?.message || '')

const isRelationshipError = (error) =>
  error?.code === 'PGRST200' ||
  /relationship between .*user_achievements.*achievements/i.test(error?.message || '')

const normalizeRows = (rows, achievementMap = null) =>
  (rows || []).map((row) => ({
    ...row,
    achievements: achievementMap ? achievementMap.get(row.achievement_id) || null : row.achievements || null,
  }))

const isTableMissingError = (error, tableName) =>
  error?.code === '42P01' ||
  new RegExp(tableName, 'i').test(error?.message || '')

const toNumber = (value, fallback = 0) => {
  const parsed = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(parsed) ? parsed : fallback
}

const toDayNumber = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000)
}

const ACHIEVEMENT_MODE_WHITELIST = new Set([
  'sentence',
  'timed',
  'coding',
  'symbols',
  'multiplayer',
  'ai_battle',
])

const normalizeMode = (value) => String(value || '').trim().toLowerCase()

const getUniqueDayNumbers = (rows = []) =>
  Array.from(
    new Set(
      (rows || [])
        .map((row) => toDayNumber(row?.created_at))
        .filter((day) => Number.isFinite(day))
    )
  ).sort((a, b) => a - b)

const calculateCurrentStreak = (rows = []) => {
  const dayNumbers = getUniqueDayNumbers(rows)

  if (dayNumbers.length === 0) return 0

  const today = toDayNumber(new Date())
  const latest = dayNumbers[dayNumbers.length - 1]

  if (today == null || latest < today - 1) return 0

  let streak = 1
  for (let i = dayNumbers.length - 2; i >= 0; i -= 1) {
    if (dayNumbers[i + 1] - dayNumbers[i] === 1) {
      streak += 1
    } else {
      break
    }
  }
  return streak
}

const calculateLongestStreak = (rows = []) => {
  const dayNumbers = getUniqueDayNumbers(rows)
  if (dayNumbers.length === 0) return 0

  let longest = 1
  let run = 1

  for (let i = 1; i < dayNumbers.length; i += 1) {
    if (dayNumbers[i] - dayNumbers[i - 1] === 1) {
      run += 1
      longest = Math.max(longest, run)
    } else {
      run = 1
    }
  }

  return longest
}

const getAiDifficultyFromAchievement = (achievement = {}) => {
  const haystack = [
    achievement?.name || '',
    achievement?.description || '',
  ]
    .join(' ')
    .toLowerCase()

  if (/\beasy\b/.test(haystack)) return 'easy'
  if (/\bmedium\b/.test(haystack)) return 'medium'
  if (/\bhard\b/.test(haystack)) return 'hard'
  if (/\bpro\b/.test(haystack)) return 'pro'
  return null
}

const getTypingStats = async (userId) => {
  const { data, error } = await supabase
    .from('typing_history')
    .select('wpm, accuracy, created_at, mode')
    .eq('user_id', userId)

  if (error) {
    if (isTableMissingError(error, 'typing_history')) {
      return {
        testsCount: 0,
        maxWpm: 0,
        maxAccuracy: 0,
        streak: 0,
        maxStreak: 0,
        sentenceTestsCount: 0,
        timedTestsCount: 0,
        codingTestsCount: 0,
        symbolsTestsCount: 0,
        aiBattleTestsCount: 0,
        multiplayerTestsCount: 0,
        perfectAccuracyCount: 0,
        multiplayerCompletions: 0,
      }
    }
    throw error
  }

  const rows = data || []
  const eligibleRows = rows.filter((row) => ACHIEVEMENT_MODE_WHITELIST.has(normalizeMode(row?.mode)))
  const testsCount = eligibleRows.length
  const maxWpm = eligibleRows.reduce((max, row) => Math.max(max, toNumber(row?.wpm, 0)), 0)
  const maxAccuracy = eligibleRows.reduce((max, row) => Math.max(max, toNumber(row?.accuracy, 0)), 0)
  const currentStreak = calculateCurrentStreak(eligibleRows)
  const maxStreak = calculateLongestStreak(eligibleRows)
  const multiplayerCompletions = rows.filter(
    (row) => normalizeMode(row?.mode) === 'multiplayer'
  ).length

  const sentenceTestsCount = eligibleRows.filter((row) => normalizeMode(row?.mode) === 'sentence').length
  const timedTestsCount = eligibleRows.filter((row) => normalizeMode(row?.mode) === 'timed').length
  const codingTestsCount = eligibleRows.filter((row) => normalizeMode(row?.mode) === 'coding').length
  const symbolsTestsCount = eligibleRows.filter((row) => normalizeMode(row?.mode) === 'symbols').length
  const aiBattleTestsCount = eligibleRows.filter((row) => normalizeMode(row?.mode) === 'ai_battle').length
  const multiplayerTestsCount = eligibleRows.filter((row) => normalizeMode(row?.mode) === 'multiplayer').length
  const perfectAccuracyCount = eligibleRows.filter((row) => toNumber(row?.accuracy, 0) >= 100).length

  return {
    testsCount,
    maxWpm,
    maxAccuracy,
    streak: Math.max(currentStreak, maxStreak),
    maxStreak,
    sentenceTestsCount,
    timedTestsCount,
    codingTestsCount,
    symbolsTestsCount,
    aiBattleTestsCount,
    multiplayerTestsCount,
    perfectAccuracyCount,
    multiplayerCompletions,
  }
}

const getAiWins = async (userId) => {
  const { data, error } = await supabase
    .from('ai_battles')
    .select('difficulty')
    .eq('user_id', userId)
    .eq('winner', 'user')

  if (error) {
    if (isTableMissingError(error, 'ai_battles')) {
      return {
        total: 0,
        byDifficulty: { easy: 0, medium: 0, hard: 0, pro: 0 },
      }
    }
    throw error
  }

  const byDifficulty = { easy: 0, medium: 0, hard: 0, pro: 0 }
  ;(data || []).forEach((row) => {
    const difficulty = normalizeMode(row?.difficulty)
    if (Object.prototype.hasOwnProperty.call(byDifficulty, difficulty)) {
      byDifficulty[difficulty] += 1
    }
  })

  const total = Object.values(byDifficulty).reduce((sum, count) => sum + (toNumber(count, 0) || 0), 0)
  return { total, byDifficulty }
}

const getMultiplayerWins = async (userId) => {
  const userRowsRes = await supabase
    .from('multiplayer_participants')
    .select('room_id, user_id, wpm, finished_at')
    .eq('user_id', userId)
    .not('finished_at', 'is', null)

  if (userRowsRes.error) {
    if (isTableMissingError(userRowsRes.error, 'multiplayer_participants')) return 0
    throw userRowsRes.error
  }

  const userRows = userRowsRes.data || []
  const roomIds = [...new Set(userRows.map((row) => row.room_id).filter(Boolean))]
  if (roomIds.length === 0) return 0

  const roomRowsRes = await supabase
    .from('multiplayer_participants')
    .select('room_id, user_id, wpm, finished_at')
    .in('room_id', roomIds)
    .not('finished_at', 'is', null)

  if (roomRowsRes.error) {
    if (isTableMissingError(roomRowsRes.error, 'multiplayer_participants')) return 0
    throw roomRowsRes.error
  }

  const byRoom = new Map()
  ;(roomRowsRes.data || []).forEach((row) => {
    if (!row?.room_id) return
    if (!byRoom.has(row.room_id)) byRoom.set(row.room_id, [])
    byRoom.get(row.room_id).push(row)
  })

  let wins = 0
  byRoom.forEach((rows) => {
    if (!rows || rows.length < 2) return
    const maxWpm = rows.reduce((max, row) => Math.max(max, toNumber(row?.wpm, 0)), 0)
    if (maxWpm <= 0) return
    const me = rows.find((row) => row.user_id === userId)
    if (!me) return
    if (toNumber(me.wpm, 0) >= maxWpm) wins += 1
  })

  return wins
}

const evaluateAchievementRequirement = (achievement, stats) => {
  const requirementType = String(achievement?.requirement_type || '').toLowerCase()
  const category = String(achievement?.category || '').toLowerCase()
  const target = toNumber(achievement?.requirement_value, 0)

  if (!target || target < 0) return false

  if (requirementType === 'tests_count') {
    if (category === 'accuracy') return (stats.perfectAccuracyCount || 0) >= target
    if (category === 'coding') return (stats.codingTestsCount || 0) >= target
    if (category === 'symbols') return (stats.symbolsTestsCount || 0) >= target
    if (category === 'sentence') return (stats.sentenceTestsCount || 0) >= target
    if (category === 'timed') return (stats.timedTestsCount || 0) >= target
    if (category === 'ai') return (stats.aiBattleTestsCount || 0) >= target
    if (category === 'multiplayer') return (stats.multiplayerTestsCount || 0) >= target
    return stats.testsCount >= target
  }
  if (requirementType === 'wpm_single') {
    return stats.maxWpm >= target
  }
  if (requirementType === 'accuracy') {
    return stats.maxAccuracy >= target
  }
  if (requirementType === 'streak') {
    return (stats.maxStreak ?? stats.streak ?? 0) >= target
  }
  if (requirementType === 'win_count') {
    if (category === 'ai') {
      const difficulty = getAiDifficultyFromAchievement(achievement)
      if (difficulty) {
        return toNumber(stats.aiWinsByDifficulty?.[difficulty], 0) >= target
      }
      return stats.aiWins >= target
    }
    if (category === 'multiplayer') return stats.multiplayerWins >= target
    return stats.aiWins + stats.multiplayerWins >= target
  }

  return false
}

export const fetchUserAchievements = async ({ userId, limit = 12 } = {}) => {
  if (!userId) return { data: [], error: null }

  const joinedRes = await supabase
    .from('user_achievements')
    .select('id, user_id, achievement_id, unlocked_at, achievements(*)')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false })
    .limit(limit)

  if (!joinedRes.error) {
    return { data: normalizeRows(joinedRes.data), error: null }
  }

  if (isMissingTableError(joinedRes.error)) {
    return { data: [], error: null }
  }

  if (!isRelationshipError(joinedRes.error)) {
    return { data: [], error: joinedRes.error }
  }

  // Fallback path for projects where PostgREST relationship metadata is stale.
  const baseRes = await supabase
    .from('user_achievements')
    .select('id, user_id, achievement_id, unlocked_at')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false })
    .limit(limit)

  if (baseRes.error) {
    if (isMissingTableError(baseRes.error)) {
      return { data: [], error: null }
    }
    return { data: [], error: baseRes.error }
  }

  const baseRows = baseRes.data || []
  const achievementIds = [...new Set(baseRows.map((row) => row.achievement_id).filter(Boolean))]

  if (achievementIds.length === 0) {
    return { data: normalizeRows(baseRows, new Map()), error: null }
  }

  const achievementsRes = await supabase
    .from('achievements')
    .select('*')
    .in('id', achievementIds)

  if (achievementsRes.error) {
    return { data: normalizeRows(baseRows, new Map()), error: achievementsRes.error }
  }

  const achievementMap = new Map((achievementsRes.data || []).map((row) => [row.id, row]))
  return { data: normalizeRows(baseRows, achievementMap), error: null }
}

export const syncUserAchievements = async ({ userId } = {}) => {
  if (!userId) return { unlockedCount: 0, removedCount: 0, error: null }

  const [achievementsRes, unlockedRes] = await Promise.all([
    supabase
      .from('achievements')
      .select('id, name, description, category, requirement_type, requirement_value'),
    supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId),
  ])

  if (achievementsRes.error) {
    if (isTableMissingError(achievementsRes.error, 'achievements')) {
      return { unlockedCount: 0, removedCount: 0, error: null }
    }
    return { unlockedCount: 0, removedCount: 0, error: achievementsRes.error }
  }

  if (unlockedRes.error) {
    if (isTableMissingError(unlockedRes.error, 'user_achievements')) {
      return { unlockedCount: 0, removedCount: 0, error: null }
    }
    return { unlockedCount: 0, removedCount: 0, error: unlockedRes.error }
  }

  const allAchievements = achievementsRes.data || []
  const unlockedIds = new Set((unlockedRes.data || []).map((row) => row.achievement_id))

  try {
    const [typingStats, aiWinStats, multiplayerWins] = await Promise.all([
      getTypingStats(userId),
      getAiWins(userId),
      getMultiplayerWins(userId),
    ])

    const stats = {
      ...typingStats,
      aiWins: toNumber(aiWinStats?.total, 0),
      aiWinsByDifficulty: aiWinStats?.byDifficulty || { easy: 0, medium: 0, hard: 0, pro: 0 },
      multiplayerWins,
    }

    const eligibleAchievements = allAchievements
      .filter((achievement) => evaluateAchievementRequirement(achievement, stats))
    const eligibleAchievementIds = new Set(eligibleAchievements.map((achievement) => achievement.id))
    const staleUnlockedIds = [...unlockedIds].filter((achievementId) => !eligibleAchievementIds.has(achievementId))
    let removedCount = 0

    if (staleUnlockedIds.length > 0) {
      const { error: removeError } = await supabase
        .from('user_achievements')
        .delete()
        .eq('user_id', userId)
        .in('achievement_id', staleUnlockedIds)

      if (removeError) {
        if (isTableMissingError(removeError, 'user_achievements')) {
          return { unlockedCount: 0, removedCount: 0, error: null }
        }
        return { unlockedCount: 0, removedCount: 0, error: removeError }
      }

      removedCount = staleUnlockedIds.length
    }

    const toUnlock = eligibleAchievements
      .filter((achievement) => !unlockedIds.has(achievement.id))
      .map((achievement) => ({
        user_id: userId,
        achievement_id: achievement.id,
      }))

    if (toUnlock.length === 0) {
      return { unlockedCount: 0, removedCount, error: null }
    }

    const { error: insertError } = await supabase
      .from('user_achievements')
      .upsert(toUnlock, { onConflict: 'user_id,achievement_id', ignoreDuplicates: true })

    if (insertError) {
      if (isTableMissingError(insertError, 'user_achievements')) {
        return { unlockedCount: 0, removedCount, error: null }
      }
      return { unlockedCount: 0, removedCount, error: insertError }
    }

    return { unlockedCount: toUnlock.length, removedCount, error: null }
  } catch (error) {
    return { unlockedCount: 0, removedCount: 0, error }
  }
}
