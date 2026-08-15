import {
  dateKey,
  daysBetween,
  getLunar,
  lunarMonthDays,
  lunarToSolar,
  toChineseDayName,
} from '@/lib/lunar'

export type CalendarType = 'solar' | 'lunar'

export type Countdown = {
  id: string
  title: string
  calendar: CalendarType
  /** 公历目标：YYYY-MM-DD；农历目标：录入时的农历年月日 */
  year: number
  month: number
  day: number
  /** 每年重复（生日、纪念日） */
  repeat: boolean
}

export type ResolvedCountdown = {
  item: Countdown
  /** 换算后的公历目标日 */
  target: Date
  /** 距今天数，负数表示已过去 */
  days: number
  /** 公历日期文本 */
  solarText: string
  /** 农历日期文本 */
  lunarText: string
  /** 是否因重复而顺延到了下一次 */
  recurred: boolean
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** 该年该月实际存在的日（2 月 29 日在平年取 2 月 28 日） */
function clampToMonth(year: number, month0: number, day: number) {
  const lastDay = new Date(year, month0 + 1, 0).getDate()
  return new Date(year, month0, Math.min(day, lastDay))
}

/** 公历目标日（含每年重复顺延） */
function resolveSolar(item: Countdown, from: Date) {
  const base = clampToMonth(item.year, item.month - 1, item.day)
  if (!item.repeat || daysBetween(from, base) >= 0) return { target: base, recurred: false }

  let year = from.getFullYear()
  let next = clampToMonth(year, item.month - 1, item.day)
  if (daysBetween(from, next) < 0) next = clampToMonth(++year, item.month - 1, item.day)
  return { target: next, recurred: true }
}

/** 农历目标日（含每年重复顺延；农历月日在该年不存在时取当月最后一天） */
function resolveLunar(item: Countdown, from: Date) {
  const base = lunarToSolar(item.year, item.month, item.day)
  if (!item.repeat || daysBetween(from, base) >= 0) return { target: base, recurred: false }

  const fromLunarYear = getLunar(from).year
  for (let y = fromLunarYear; y <= fromLunarYear + 2; y++) {
    const day = Math.min(item.day, lunarMonthDays(y, item.month))
    const candidate = lunarToSolar(y, item.month, day)
    if (daysBetween(from, candidate) >= 0) return { target: candidate, recurred: true }
  }
  return { target: base, recurred: false }
}

export function resolveCountdown(item: Countdown, now = new Date()): ResolvedCountdown {
  const from = startOfDay(now)
  const { target, recurred } = item.calendar === 'lunar' ? resolveLunar(item, from) : resolveSolar(item, from)
  const lunar = getLunar(target)

  return {
    item,
    target,
    days: daysBetween(from, target),
    solarText: dateKey(target),
    lunarText: `${lunar.ganzhi}年 ${lunar.monthName}${lunar.dayName}`,
    recurred,
  }
}

/** 录入时的目标描述，例如「农历 七月初七 · 每年」 */
export function describeSource(item: Countdown) {
  if (item.calendar === 'lunar') {
    const monthName = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'][
      item.month - 1
    ]
    const base = `农历 ${monthName}月${toChineseDayName(item.day)}`
    return item.repeat ? `${base} · 每年` : `农历 ${item.year} 年 ${monthName}月${toChineseDayName(item.day)}`
  }
  const base = `公历 ${item.month} 月 ${item.day} 日`
  return item.repeat ? `${base} · 每年` : `公历 ${item.year}-${String(item.month).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`
}

/* ------------------------------------------------------------------ *
 * 显示单位：天 / 天时分秒 / 小时 / 分钟 / 秒 / 周 / 月
 * ------------------------------------------------------------------ */

export type CountdownUnit = 'day' | 'compound' | 'hour' | 'minute' | 'second' | 'week' | 'month'

export type CountdownSettings = {
  unit: CountdownUnit
  /** 精确到当前时刻（否则按自然日 00:00 计算） */
  precise: boolean
}

export const DEFAULT_SETTINGS: CountdownSettings = { unit: 'day', precise: false }

export const UNIT_OPTIONS: { key: CountdownUnit; label: string; hint: string }[] = [
  { key: 'day', label: '天', hint: '默认，只看还有多少天' },
  { key: 'compound', label: '天 时 分 秒', hint: '实时倒数，每秒刷新' },
  { key: 'hour', label: '小时', hint: '换算为小时，余数显示分钟' },
  { key: 'minute', label: '分钟', hint: '换算为分钟，余数显示秒' },
  { key: 'second', label: '秒', hint: '换算为秒，每秒刷新' },
  { key: 'week', label: '周', hint: '换算为周，余数显示天' },
  { key: 'month', label: '月', hint: '按自然月换算，余数显示天' },
]

/** 该单位是否需要逐秒刷新 */
export function needsSecondTick(settings: CountdownSettings) {
  return (
    settings.unit === 'compound' ||
    settings.unit === 'second' ||
    (settings.precise && (settings.unit === 'minute' || settings.unit === 'hour'))
  )
}

export type CountdownDisplay = {
  passed: boolean
  isToday: boolean
  /** 主数值（已按千分位分组） */
  value: string
  /** 主单位文本 */
  unit: string
  /** 补充信息，如「余 3 天」或「12:04:31」 */
  extra?: string
  /** 单行紧凑文本，用于列表与日详情 */
  text: string
}

const NUM = new Intl.NumberFormat('zh-CN')
const pad = (n: number) => String(n).padStart(2, '0')

/** 自然月差值（同时给出余下天数） */
function monthsBetween(from: Date, to: Date) {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
  if (to.getDate() < from.getDate()) months--
  const anchor = new Date(from.getFullYear(), from.getMonth() + months, from.getDate())
  return { months, days: daysBetween(anchor, to) }
}

export function formatCountdown(
  item: ResolvedCountdown,
  settings: CountdownSettings = DEFAULT_SETTINGS,
  now = new Date(),
): CountdownDisplay {
  // 复合单位必须走精确时刻，否则时分秒恒为 0
  const precise = settings.precise || settings.unit === 'compound'
  const fromTime = precise ? now.getTime() : startOfDay(now).getTime()
  const diff = item.target.getTime() - fromTime
  const abs = Math.abs(diff)
  const passed = precise ? diff < 0 : item.days < 0
  const isToday = item.days === 0

  const seconds = Math.floor(abs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = precise ? Math.floor(hours / 24) : Math.abs(item.days)

  const prefix = passed ? '已过' : '还有'
  const done = (value: string, unit: string, extra?: string): CountdownDisplay => ({
    passed,
    isToday,
    value,
    unit,
    extra,
    text: `${prefix} ${value} ${unit}${extra ? ` ${extra}` : ''}`,
  })

  switch (settings.unit) {
    case 'compound':
      return done(
        NUM.format(days),
        '天',
        `${pad(hours % 24)}:${pad(minutes % 60)}:${pad(seconds % 60)}`,
      )
    case 'hour':
      return done(NUM.format(hours), '小时', precise ? `余 ${minutes % 60} 分` : undefined)
    case 'minute':
      return done(NUM.format(minutes), '分钟', precise ? `余 ${seconds % 60} 秒` : undefined)
    case 'second':
      return done(NUM.format(seconds), '秒')
    case 'week': {
      const weeks = Math.floor(days / 7)
      const rest = days % 7
      return done(NUM.format(weeks), '周', rest > 0 ? `余 ${rest} 天` : undefined)
    }
    case 'month': {
      const earlier = diff >= 0 ? startOfDay(now) : item.target
      const later = diff >= 0 ? item.target : startOfDay(now)
      const { months, days: rest } = monthsBetween(earlier, later)
      return done(NUM.format(months), '个月', rest > 0 ? `余 ${rest} 天` : undefined)
    }
    default: {
      const display = done(NUM.format(days), '天')
      if (!precise && isToday) return { ...display, text: '就是今天' }
      return display
    }
  }
}

export function sortResolved(list: ResolvedCountdown[]) {
  return [...list].sort((a, b) => {
    const aFuture = a.days >= 0
    const bFuture = b.days >= 0
    if (aFuture !== bFuture) return aFuture ? -1 : 1
    return aFuture ? a.days - b.days : b.days - a.days
  })
}
