import React from 'react'
import {
  Award,
  BookOpen,
  Bot,
  CheckCircle,
  Clock,
  Code,
  Crown,
  FileText,
  Flame,
  Hash,
  Medal,
  Play,
  Star,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'

const CATEGORY_ICON_POOLS = {
  speed: [Zap],
  accuracy: [Target],
  streak: [Flame],
  coding: [Code],
  symbols: [Hash],
  multiplayer: [Users],
  ai: [Bot],
  special: [Award],
}

const ICON_NAME_MAP = {
  award: Award,
  book_open: BookOpen,
  bot: Bot,
  check_circle: CheckCircle,
  clock: Clock,
  code: Code,
  crown: Crown,
  file_text: FileText,
  flame: Flame,
  hash: Hash,
  medal: Medal,
  play: Play,
  star: Star,
  target: Target,
  timer: Timer,
  trending_up: TrendingUp,
  trophy: Trophy,
  users: Users,
  zap: Zap,
}

const isIconKey = (value) => /^[a-z0-9_-]+$/i.test(value || '')

const hashString = (input = '') => {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

const getIconByCategory = (achievement = {}) => {
  const categoryKey = String(achievement.category || 'special').toLowerCase()
  const pool = CATEGORY_ICON_POOLS[categoryKey] || CATEGORY_ICON_POOLS.special

  if (!pool || pool.length === 0) {
    return Trophy
  }

  const seed = [
    achievement.id || '',
    achievement.name || '',
    achievement.requirement_type || '',
    String(achievement.requirement_value || ''),
  ].join(':')

  return pool[hashString(seed) % pool.length]
}

const getAchievementIconComponent = (achievement = {}) => {
  const iconValue = String(achievement.icon || '').trim().toLowerCase()
  if (isIconKey(iconValue) && ICON_NAME_MAP[iconValue]) {
    return ICON_NAME_MAP[iconValue]
  }
  return getIconByCategory(achievement)
}

export const AchievementIcon = ({ achievement, className = 'w-5 h-5', strokeWidth = 2 }) => {
  const Icon = getAchievementIconComponent(achievement)
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden="true" />
}
