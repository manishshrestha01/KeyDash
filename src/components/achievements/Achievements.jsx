import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Award, Lock, Star, Trophy, Zap, Target, Flame, Code, Hash, Users, Bot } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { AchievementIcon } from '../../utils/achievementIcons'

// Category icons mapping
const CATEGORY_ICONS = {
  speed: Zap,
  accuracy: Target,
  streak: Flame,
  coding: Code,
  symbols: Hash,
  multiplayer: Users,
  ai: Bot,
  special: Star,
}

// Rarity colors
const RARITY_COLORS = {
  common: 'from-gray-400 to-gray-500',
  rare: 'from-blue-400 to-blue-500',
  epic: 'from-purple-400 to-purple-500',
  legendary: 'from-yellow-400 to-orange-500',
}

const RARITY_BG = {
  common: 'bg-gray-500/10 border-gray-500/30',
  rare: 'bg-blue-500/10 border-blue-500/30',
  epic: 'bg-purple-500/10 border-purple-500/30',
  legendary: 'bg-yellow-500/10 border-yellow-500/30',
}

const CATEGORY_BATCH_SIZE = 24

const Achievements = () => {
  const { user } = useAuth()
  const [achievements, setAchievements] = useState([])
  const [userAchievements, setUserAchievements] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [visibleByCategory, setVisibleByCategory] = useState({})
  const [stats, setStats] = useState({
    total: 0,
    unlocked: 0,
    points: 0,
  })

  useEffect(() => {
    fetchAchievements()
  }, [user])

  const fetchAchievements = async () => {
    try {
      // Fetch all achievements
      const { data: allAchievements, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .order('category')
        .order('requirement_value')
        .order('name')

      if (achievementsError) throw achievementsError
      setAchievements(allAchievements || [])
      setStats((prev) => ({
        ...prev,
        total: allAchievements?.length || 0,
      }))

      // Fetch user's unlocked achievements
      if (user?.id) {
        const { data: unlocked, error: unlockedError } = await supabase
          .from('user_achievements')
          .select('achievement_id')
          .eq('user_id', user.id)

        if (unlockedError) throw unlockedError
        
        const unlockedIds = new Set((unlocked || []).map(u => u.achievement_id))
        setUserAchievements(unlockedIds)

        // Calculate stats
        const unlockedAchievements = (allAchievements || []).filter(a => unlockedIds.has(a.id))
        const totalPoints = unlockedAchievements.reduce((acc, a) => acc + (a.points || 0), 0)

        setStats({
          total: allAchievements?.length || 0,
          unlocked: unlockedIds.size,
          points: totalPoints,
        })
      } else {
        setUserAchievements(new Set())
        setStats({
          total: allAchievements?.length || 0,
          unlocked: 0,
          points: 0,
        })
      }
    } catch (error) {
      console.error('Error fetching achievements:', error)
    } finally {
      setLoading(false)
    }
  }

  // Group achievements by category
  const groupedAchievements = achievements.reduce((groups, achievement) => {
    const category = achievement.category || 'special'
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(achievement)
    return groups
  }, {})

  // Filter achievements
  const filteredCategories = filter === 'all' 
    ? Object.keys(groupedAchievements)
    : [filter]

  const categories = ['all', 'speed', 'accuracy', 'streak', 'coding', 'symbols', 'multiplayer', 'ai', 'special']

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-400/20 rounded-2xl mb-4">
          <Award className="w-8 h-8 text-yellow-400" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Achievements</h1>
        <p className="text-gray-400">Complete challenges to unlock achievements and earn points</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1a1f2e] rounded-2xl p-5 border border-gray-700/50 text-center"
        >
          <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
          <div className="text-3xl font-bold text-yellow-400">{stats.unlocked}</div>
          <div className="text-gray-400 text-sm">Unlocked</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#1a1f2e] rounded-2xl p-5 border border-gray-700/50 text-center"
        >
          <Award className="w-6 h-6 text-purple-400 mx-auto mb-2" />
          <div className="text-3xl font-bold text-purple-400">{stats.total}</div>
          <div className="text-gray-400 text-sm">Total</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#1a1f2e] rounded-2xl p-5 border border-gray-700/50 text-center"
        >
          <Star className="w-6 h-6 text-green-400 mx-auto mb-2" />
          <div className="text-3xl font-bold text-green-400">{stats.points}</div>
          <div className="text-gray-400 text-sm">Points</div>
        </motion.div>
      </div>

      {/* Progress Bar */}
      <div className="bg-[#1a1f2e] rounded-2xl p-6 border border-gray-700/50 mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-400">Overall Progress</span>
          <span className="text-yellow-400 font-semibold">
            {stats.total > 0 ? Math.round((stats.unlocked / stats.total) * 100) : 0}%
          </span>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400"
            initial={{ width: 0 }}
            animate={{ width: `${stats.total > 0 ? (stats.unlocked / stats.total) * 100 : 0}%` }}
            transition={{ duration: 0.5, delay: 0.3 }}
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {categories.map((category) => {
          const Icon = category === 'all' ? Award : CATEGORY_ICONS[category] || Award
          return (
            <button
              key={category}
              onClick={() => setFilter(category)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                transition-all border capitalize
                ${filter === category
                  ? 'bg-yellow-400 text-black border-yellow-400'
                  : 'bg-transparent text-gray-300 border-gray-600 hover:border-gray-500'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {category}
            </button>
          )
        })}
      </div>

      {/* Achievements Grid */}
      {filteredCategories.map((category) => {
        const categoryAchievements = groupedAchievements[category]
        if (!categoryAchievements || categoryAchievements.length === 0) return null

        const CategoryIcon = CATEGORY_ICONS[category] || Award
        const visibleLimit = visibleByCategory[category] || CATEGORY_BATCH_SIZE
        const visibleAchievements = categoryAchievements.slice(0, visibleLimit)
        const hasMore = categoryAchievements.length > visibleLimit

        return (
          <div key={category} className="mb-10">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 capitalize">
              <CategoryIcon className="w-5 h-5 text-yellow-400" />
              {category} Achievements
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleAchievements.map((achievement, idx) => {
                const isUnlocked = userAchievements.has(achievement.id)
                const rarityColor = RARITY_COLORS[achievement.rarity] || RARITY_COLORS.common
                const rarityBg = RARITY_BG[achievement.rarity] || RARITY_BG.common

                return (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`
                      relative rounded-2xl p-5 border transition-all
                      ${isUnlocked
                        ? rarityBg
                        : 'bg-[#1a1f2e] border-gray-700/50 opacity-60'
                      }
                    `}
                  >
                    {/* Locked Overlay */}
                    {!isUnlocked && (
                      <div className="absolute top-3 right-3">
                        <Lock className="w-4 h-4 text-gray-500" />
                      </div>
                    )}

                    {/* Achievement Icon */}
                    <div className="flex items-center gap-4 mb-3">
                      <div className={`
                        w-12 h-12 rounded-xl flex items-center justify-center
                        ${isUnlocked 
                          ? `bg-gradient-to-br ${rarityColor} text-white` 
                          : 'bg-gray-700 text-gray-500'
                        }
                      `}>
                        <AchievementIcon achievement={achievement} className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className={`font-semibold ${isUnlocked ? '' : 'text-gray-400'}`}>
                          {achievement.name}
                        </h3>
                        <span className={`
                          text-xs px-2 py-0.5 rounded-full capitalize
                          ${isUnlocked
                            ? `bg-gradient-to-r ${rarityColor} text-white`
                            : 'bg-gray-700 text-gray-400'
                          }
                        `}>
                          {achievement.rarity}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className={`text-sm mb-3 ${isUnlocked ? 'text-gray-300' : 'text-gray-500'}`}>
                      {achievement.description}
                    </p>

                    {/* Points */}
                    <div className="flex items-center justify-between text-sm">
                      <span className={isUnlocked ? 'text-yellow-400' : 'text-gray-500'}>
                        +{achievement.points} points
                      </span>
                      {isUnlocked && (
                        <span className="text-green-400 text-xs">✓ Unlocked</span>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {hasMore && (
              <div className="mt-5 flex justify-center">
                <button
                  onClick={() =>
                    setVisibleByCategory((prev) => ({
                      ...prev,
                      [category]: (prev[category] || CATEGORY_BATCH_SIZE) + CATEGORY_BATCH_SIZE,
                    }))
                  }
                  className="px-4 py-2 rounded-full text-sm font-medium border border-gray-600 text-gray-300 hover:border-yellow-400 hover:text-yellow-400 transition-all"
                >
                  Load more ({visibleAchievements.length}/{categoryAchievements.length})
                </button>
              </div>
            )}
          </div>
        )
      })}

      {/* Empty State */}
      {achievements.length === 0 && (
        <div className="text-center py-20">
          <Award className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Achievements Found</h3>
          <p className="text-gray-400">Start typing to unlock achievements!</p>
        </div>
      )}
    </div>
  )
}

export default Achievements
