const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

const DAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

const RANGE_DAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

const toValidDate = (value) => {
  const candidate = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(candidate.getTime())) {
    return new Date()
  }
  return candidate
}

const getUtcDayStart = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

const addUtcDays = (date, days) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days))

const toDateKey = (date) => date.toISOString().slice(0, 10)

export const getPeriodKeys = (referenceDate = new Date()) => {
  const safeDate = toValidDate(referenceDate)
  const dayStart = getUtcDayStart(safeDate)
  const weekStart = addUtcDays(dayStart, -6)
  const monthStart = new Date(Date.UTC(dayStart.getUTCFullYear(), dayStart.getUTCMonth(), 1))

  return {
    dayStart,
    weekStart,
    monthStart,
    dailyDate: toDateKey(dayStart),
    weeklyStartDate: toDateKey(weekStart),
    monthlyStartDate: toDateKey(monthStart),
    monthLabel: MONTH_YEAR_FORMATTER.format(monthStart),
  }
}

export const getPeriodBounds = (period, referenceDate = new Date()) => {
  if (period === 'all_time') {
    return {
      startIso: null,
      endIso: null,
      label: 'All time',
      cacheKey: 'all_time',
      dailyDate: null,
      weeklyStartDate: null,
      monthlyStartDate: null,
      monthLabel: null,
    }
  }

  const keys = getPeriodKeys(referenceDate)
  const { dayStart, weekStart, monthStart } = keys

  if (period === 'daily') {
    const dayEnd = addUtcDays(dayStart, 1)
    return {
      ...keys,
      startIso: dayStart.toISOString(),
      endIso: dayEnd.toISOString(),
      label: DAY_FORMATTER.format(dayStart),
      cacheKey: keys.dailyDate,
    }
  }

  if (period === 'weekly') {
    const weekEnd = addUtcDays(dayStart, 1)
    const weekLastDate = addUtcDays(weekEnd, -1)
    return {
      ...keys,
      startIso: weekStart.toISOString(),
      endIso: weekEnd.toISOString(),
      label: `Last 7 days (${RANGE_DAY_FORMATTER.format(weekStart)} - ${RANGE_DAY_FORMATTER.format(weekLastDate)})`,
      cacheKey: `${keys.weeklyStartDate}:${toDateKey(weekLastDate)}`,
    }
  }

  if (period === 'monthly') {
    const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1))
    return {
      ...keys,
      startIso: monthStart.toISOString(),
      endIso: monthEnd.toISOString(),
      label: keys.monthLabel,
      cacheKey: keys.monthlyStartDate,
    }
  }

  return {
    ...keys,
    startIso: null,
    endIso: null,
    label: 'All time',
    cacheKey: 'all_time',
  }
}
