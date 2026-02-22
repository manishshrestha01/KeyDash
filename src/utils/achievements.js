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

