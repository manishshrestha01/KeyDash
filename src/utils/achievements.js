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

const calculateCurrentStreak = (rows = []) => {
  const dayNumbers = Array.from(
    new Set(
      (rows || [])
        .map((row) => toDayNumber(row?.created_at))
        .filter((day) => Number.isFinite(day))
    )
  ).sort((a, b) => a - b)

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

const getTypingStats = async (userId) => {
  const { data, error } = await supabase
    .from('typing_history')
    .select('wpm, accuracy, created_at, mode')
    .eq('user_id', userId)

  if (error) {
    if (isTableMissingError(error, 'typing_history')) {
      return { testsCount: 0, maxWpm: 0, maxAccuracy: 0, streak: 0, multiplayerCompletions: 0 }
    }
    throw error
  }

  const rows = data || []
  const testsCount = rows.length
  const maxWpm = rows.reduce((max, row) => Math.max(max, toNumber(row?.wpm, 0)), 0)
  const maxAccuracy = rows.reduce((max, row) => Math.max(max, toNumber(row?.accuracy, 0)), 0)
  const streak = calculateCurrentStreak(rows)
  const multiplayerCompletions = rows.filter(
    (row) => String(row?.mode || '').toLowerCase() === 'multiplayer'
  ).length

  return { testsCount, maxWpm, maxAccuracy, streak, multiplayerCompletions }
}

const getAiWins = async (userId) => {
  const { count, error } = await supabase
    .from('ai_battles')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('winner', 'user')

  if (error) {
    if (isTableMissingError(error, 'ai_battles')) return 0
    throw error
  }

  return toNumber(count, 0)
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
    return stats.testsCount >= target
  }
  if (requirementType === 'wpm_single') {
    return stats.maxWpm >= target
  }
  if (requirementType === 'accuracy') {
    return stats.maxAccuracy >= target
  }
  if (requirementType === 'streak') {
    return stats.streak >= target
  }
  if (requirementType === 'win_count') {
    if (category === 'ai') return stats.aiWins >= target
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
  if (!userId) return { unlockedCount: 0, error: null }

  const [achievementsRes, unlockedRes] = await Promise.all([
    supabase
      .from('achievements')
      .select('id, category, requirement_type, requirement_value'),
    supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId),
  ])

  if (achievementsRes.error) {
    if (isTableMissingError(achievementsRes.error, 'achievements')) {
      return { unlockedCount: 0, error: null }
    }
    return { unlockedCount: 0, error: achievementsRes.error }
  }

  if (unlockedRes.error) {
    if (isTableMissingError(unlockedRes.error, 'user_achievements')) {
      return { unlockedCount: 0, error: null }
    }
    return { unlockedCount: 0, error: unlockedRes.error }
  }

  const unlockedIds = new Set((unlockedRes.data || []).map((row) => row.achievement_id))
  const lockedAchievements = (achievementsRes.data || []).filter((row) => !unlockedIds.has(row.id))

  if (lockedAchievements.length === 0) {
    return { unlockedCount: 0, error: null }
  }

  try {
    const [typingStats, aiWins, multiplayerWins] = await Promise.all([
      getTypingStats(userId),
      getAiWins(userId),
      getMultiplayerWins(userId),
    ])

    const stats = {
      ...typingStats,
      aiWins,
      multiplayerWins,
    }

    const toUnlock = lockedAchievements
      .filter((achievement) => evaluateAchievementRequirement(achievement, stats))
      .map((achievement) => ({
        user_id: userId,
        achievement_id: achievement.id,
      }))

    if (toUnlock.length === 0) {
      return { unlockedCount: 0, error: null }
    }

    const { error: insertError } = await supabase
      .from('user_achievements')
      .upsert(toUnlock, { onConflict: 'user_id,achievement_id', ignoreDuplicates: true })

    if (insertError) {
      if (isTableMissingError(insertError, 'user_achievements')) {
        return { unlockedCount: 0, error: null }
      }
      return { unlockedCount: 0, error: insertError }
    }

    return { unlockedCount: toUnlock.length, error: null }
  } catch (error) {
    return { unlockedCount: 0, error }
  }
}
