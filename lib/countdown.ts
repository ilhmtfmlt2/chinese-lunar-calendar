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

/** 公历目标日（含每年重复顺延） */
function resolveSolar(item: Countdown, from: Date) {
  const base = new Date(item.year, item.month - 1, item.day)
  if (!item.repeat || daysBetween(from, base) >= 0) return { target: base, recurred: false }

  let year = from.getFullYear()
  let next = new Date(year, item.month - 1, item.day)
  if (daysBetween(from, next) < 0) next = new Date(++year, item.month - 1, item.day)
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

export function sortResolved(list: ResolvedCountdown[]) {
  return [...list].sort((a, b) => {
    const aFuture = a.days >= 0
    const bFuture = b.days >= 0
    if (aFuture !== bFuture) return aFuture ? -1 : 1
    return aFuture ? a.days - b.days : b.days - a.days
  })
}
