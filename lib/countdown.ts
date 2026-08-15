import {
  dateKey,
  daysBetween,
  getLunar,
  lunarMonthDays,
  lunarToSolar,
  toChineseDayName,
} from '@/lib/lunar'

export type CalendarType = 'solar' | 'lunar'

/** 重复频率：不重复 / 按天 / 按周 / 按月 / 按年 */
export type RepeatFreq = 'none' | 'day' | 'week' | 'month' | 'year'

/**
 * 重复规则采用「锚点 + 间隔」：锚点来自开始日期，
 * 间隔为每 N 个周期一次（每 1 周 = 每周，每 6 周 = 每 6 周）。
 */
export type Repeat = {
  freq: RepeatFreq
  /** 每 N 个周期一次，1~99 */
  interval: number
  /** 仅 freq='week' 有效：在周几重复（0=周日）；留空则用开始日期的星期 */
  weekdays?: number[]
}

export const NO_REPEAT: Repeat = { freq: 'none', interval: 1 }

export const REPEAT_OPTIONS: { key: RepeatFreq; label: string; unit: string }[] = [
  { key: 'none', label: '不重复', unit: '' },
  { key: 'day', label: '按天', unit: '天' },
  { key: 'week', label: '按周', unit: '周' },
  { key: 'month', label: '按月', unit: '个月' },
  { key: 'year', label: '按年', unit: '年' },
]

export const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export const DEFAULT_CATEGORIES = ['生活', '工作', '纪念日', '节日', '其他']

export type Countdown = {
  id: string
  title: string
  calendar: CalendarType
  /** 开始日期：公历为公历年月日，农历为农历年月日 */
  year: number
  month: number
  day: number
  /** 当天时刻 HH:mm；不填按整天处理（当天不算已过） */
  time?: string
  /** 重复规则 */
  repeat: Repeat
  /** 分类名，可为预设或自定义 */
  category: string
  /** 置顶：排在列表最前，并优先显示在首页 */
  pinned?: boolean
  /** 该条目专属的显示单位；不填则跟随设置里的默认单位 */
  unit?: CountdownUnit
  /** 该条目是否把起止两天都算进去；不填则跟随默认 */
  inclusive?: boolean
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

const LUNAR_MONTH_LABELS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊']
const MAX_LUNAR_YEAR = 2100

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

/** 解析 HH:mm，非法值按 00:00 处理 */
function parseTime(time?: string) {
  const [h, m] = (time ?? '').split(':').map(Number)
  return {
    hour: Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 0,
    minute: Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0,
  }
}

/** 把「某一天」和条目时刻合成精确目标时间 */
function withTime(date: Date, time?: string) {
  const { hour, minute } = parseTime(time)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0, 0)
}

/**
 * 判定这一次是否还没到：
 * 设了时刻就按时刻比，未设时刻按整天算（当天 23:59 之前都算「还没到」），
 * 这样生日当天仍是「就是今天」，而「每天 08:00」过了点会顺延到明天。
 */
function stillAhead(day: Date, time: string | undefined, now: Date) {
  if (time) return withTime(day, time).getTime() >= now.getTime()
  return daysBetween(startOfDay(now), day) >= 0
}

/** 开始日期换算成公历那一天 */
function baseDay(item: Countdown) {
  if (item.calendar === 'lunar') {
    const day = Math.min(item.day, lunarMonthDays(item.year, item.month))
    return lunarToSolar(item.year, item.month, day)
  }
  return clampToMonth(item.year, item.month - 1, item.day)
}

/**
 * 按重复规则生成候选日期（从不早于开始日期，且尽量从「今天附近」起算）。
 * - 天：开始日 + k·N 天
 * - 周：开始日所在周（周日为首）+ k·N 周，落在选中的星期上
 * - 月 / 年：锚定开始日期的「几号」或「月日」，公历按公历推、农历按农历推
 */
function* occurrences(item: Countdown, base: Date, from: Date): Generator<Date> {
  const n = Math.min(99, Math.max(1, Math.floor(item.repeat.interval || 1)))
  const behind = daysBetween(base, from)

  switch (item.repeat.freq) {
    case 'day': {
      const start = behind > 0 ? Math.floor(behind / n) : 0
      for (let k = start; k < start + 400; k++) yield addDays(base, k * n)
      return
    }
    case 'week': {
      const picked = item.repeat.weekdays?.length
        ? [...new Set(item.repeat.weekdays)].sort((a, b) => a - b)
        : [base.getDay()]
      const blockStart = addDays(base, -base.getDay())
      const offset = daysBetween(blockStart, from)
      const start = offset > 0 ? Math.floor(offset / (n * 7)) : 0
      for (let k = start; k < start + 400; k++) {
        for (const weekday of picked) {
          const candidate = addDays(blockStart, k * n * 7 + weekday)
          if (daysBetween(base, candidate) >= 0) yield candidate
        }
      }
      return
    }
    case 'month': {
      if (item.calendar === 'lunar') {
        const fromLunar = getLunar(from)
        const baseIndex = item.year * 12 + (item.month - 1)
        const fromIndex = fromLunar.year * 12 + (fromLunar.month - 1)
        const start = fromIndex > baseIndex ? Math.floor((fromIndex - baseIndex) / n) : 0
        for (let k = start; k < start + 400; k++) {
          const index = baseIndex + k * n
          const year = Math.floor(index / 12)
          const month = (index % 12) + 1
          if (year > MAX_LUNAR_YEAR) return
          yield lunarToSolar(year, month, Math.min(item.day, lunarMonthDays(year, month)))
        }
        return
      }
      const baseIndex = item.year * 12 + (item.month - 1)
      const fromIndex = from.getFullYear() * 12 + from.getMonth()
      const start = fromIndex > baseIndex ? Math.floor((fromIndex - baseIndex) / n) : 0
      for (let k = start; k < start + 400; k++) {
        const index = baseIndex + k * n
        yield clampToMonth(Math.floor(index / 12), index % 12, item.day)
      }
      return
    }
    case 'year': {
      if (item.calendar === 'lunar') {
        const fromYear = getLunar(from).year
        const start = fromYear > item.year ? Math.floor((fromYear - item.year) / n) : 0
        for (let k = start; k < start + 200; k++) {
          const year = item.year + k * n
          if (year > MAX_LUNAR_YEAR) return
          yield lunarToSolar(year, item.month, Math.min(item.day, lunarMonthDays(year, item.month)))
        }
        return
      }
      const fromYear = from.getFullYear()
      const start = fromYear > item.year ? Math.floor((fromYear - item.year) / n) : 0
      for (let k = start; k < start + 200; k++) {
        yield clampToMonth(item.year + k * n, item.month - 1, item.day)
      }
      return
    }
    default:
      yield base
  }
}

export function resolveCountdown(item: Countdown, now = new Date()): ResolvedCountdown {
  const from = startOfDay(now)
  const base = baseDay(item)
  let target = withTime(base, item.time)
  let recurred = false

  if (item.repeat.freq !== 'none') {
    let last = target
    for (const day of occurrences(item, base, from)) {
      last = withTime(day, item.time)
      if (stillAhead(day, item.time, now)) break
    }
    target = last
    recurred = daysBetween(base, target) !== 0
  }

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

/** 重复规则的中文描述，例如「每 2 周 · 周三」「每年 七月初七」 */
export function describeRepeat(item: Countdown) {
  const { freq, interval } = item.repeat
  const n = Math.min(99, Math.max(1, Math.floor(interval || 1)))
  const lunar = item.calendar === 'lunar'
  const dayName = lunar ? toChineseDayName(item.day) : `${item.day} 日`
  const monthName = lunar ? `${LUNAR_MONTH_LABELS[item.month - 1]}月` : `${item.month} 月`

  switch (freq) {
    case 'day':
      return n === 1 ? '每天' : `每 ${n} 天`
    case 'week': {
      const picked = item.repeat.weekdays?.length
        ? [...new Set(item.repeat.weekdays)].sort((a, b) => a - b)
        : [baseDay(item).getDay()]
      const names = picked.map((w) => WEEKDAY_NAMES[w]).join('、')
      return n === 1 ? `每${names}` : `每 ${n} 周 · ${names}`
    }
    case 'month':
      return n === 1 ? `每月 ${dayName}` : `每 ${n} 个月 · ${dayName}`
    case 'year':
      return n === 1 ? `每年 ${monthName}${dayName}` : `每 ${n} 年 · ${monthName}${dayName}`
    default:
      return '不重复'
  }
}

/** 开始日期的描述，例如「农历 2026 年 冬月初七」 */
export function describeStart(item: Countdown) {
  if (item.calendar === 'lunar') {
    return `农历 ${item.year} 年 ${LUNAR_MONTH_LABELS[item.month - 1]}月${toChineseDayName(item.day)}`
  }
  const m = String(item.month).padStart(2, '0')
  const d = String(item.day).padStart(2, '0')
  return `公历 ${item.year}-${m}-${d}`
}

/** 摘要里的一行说明：开始日期 + 重复 + 时刻 */
export function describeSource(item: Countdown) {
  const parts = [describeStart(item)]
  if (item.repeat.freq !== 'none') parts.push(describeRepeat(item))
  if (item.time) parts.push(item.time)
  return parts.join(' · ')
}

/* ------------------------------------------------------------------ *
 * 显示单位：天 / 天时分秒 / 小时 / 分钟 / 秒 / 周 / 月
 * ------------------------------------------------------------------ */

export type CountdownUnit = 'day' | 'compound' | 'hour' | 'minute' | 'second' | 'week' | 'month'

/** 列表排序：正序（近的在前）/ 倒序（远的在前） */
export type SortOrder = 'asc' | 'desc'

export type CountdownSettings = {
  /** 默认显示单位，条目未单独设置时使用 */
  unit: CountdownUnit
  /** 时 / 分 / 秒 类单位是否精确到当前时刻（关闭则从今天 00:00 起算） */
  precise: boolean
  /** 默认是否包含起止日期，条目未单独设置时使用 */
  inclusive: boolean
  /** 列表排序方向 */
  sortOrder: SortOrder
}

export const DEFAULT_SETTINGS: CountdownSettings = {
  unit: 'day',
  precise: true,
  inclusive: false,
  sortOrder: 'asc',
}

/** 条目自带的单位 / 起止口径优先于全局默认 */
export function resolveSettings(item: Countdown, settings: CountdownSettings): CountdownSettings {
  return {
    unit: item.unit ?? settings.unit,
    precise: settings.precise,
    inclusive: item.inclusive ?? settings.inclusive,
    sortOrder: settings.sortOrder,
  }
}

export const UNIT_OPTIONS: { key: CountdownUnit; label: string; hint: string }[] = [
  { key: 'day', label: '天', hint: '默认，只看还有多少天' },
  { key: 'compound', label: '天 时 分 秒', hint: '实时倒数，每秒刷新' },
  { key: 'hour', label: '小时', hint: '换算为小时，余数显示分钟' },
  { key: 'minute', label: '分钟', hint: '换算为分钟，余数显示秒' },
  { key: 'second', label: '秒', hint: '换算为秒，每秒刷新' },
  { key: 'week', label: '周', hint: '换算为周，余数显示天' },
  { key: 'month', label: '月', hint: '按自然月换算，余数显示天' },
]

export function unitLabel(unit: CountdownUnit) {
  return UNIT_OPTIONS.find((option) => option.key === unit)?.label ?? '天'
}

/** 天 / 周 / 月按自然日计算，与当前时刻无关，也只有这些单位支持「包含起止日期」 */
export function isCalendarUnit(unit: CountdownUnit) {
  return unit === 'day' || unit === 'week' || unit === 'month'
}

export function supportsInclusive(unit: CountdownUnit) {
  return isCalendarUnit(unit)
}

/** 该单位是否需要逐秒刷新；小时只显示余分钟，不需要每秒重绘 */
export function needsSecondTick(settings: CountdownSettings, hasExplicitTime = false) {
  return (
    settings.unit === 'compound' ||
    settings.unit === 'second' ||
    ((settings.precise || hasExplicitTime) && settings.unit === 'minute')
  )
}

/** 任一条目使用会显示秒数的单位时才逐秒刷新 */
export function needsSecondTickForAny(items: Countdown[], settings: CountdownSettings) {
  return items.some((item) =>
    needsSecondTick(resolveSettings(item, settings), Boolean(item.time)),
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
  const s = resolveSettings(item.item, settings)
  const calendarUnit = isCalendarUnit(s.unit)
  // 天 / 周 / 月按自然日算；明确设置了时刻的条目必须精确计算，不能被全局开关降级成 00:00
  const precise =
    s.unit === 'compound' || (!calendarUnit && (s.precise || Boolean(item.item.time)))
  const fromTime = precise ? now.getTime() : startOfDay(now).getTime()
  const diff = item.target.getTime() - fromTime
  const abs = Math.abs(diff)
  const passed = calendarUnit ? item.days < 0 : diff < 0
  const isToday = item.days === 0

  const seconds = Math.floor(abs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  // 只对自然日单位应用起止口径；时间单位必须保持真实毫秒差
  const bonus = calendarUnit && s.inclusive ? 1 : 0
  const days = calendarUnit ? Math.abs(item.days) + bonus : Math.floor(hours / 24)

  const prefix = passed ? '已过' : '还有'
  const done = (value: string, unit: string, extra?: string): CountdownDisplay => ({
    passed,
    isToday,
    value,
    unit,
    extra,
    text: `${prefix} ${value} ${unit}${extra ? ` ${extra}` : ''}`,
  })

  switch (s.unit) {
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
      const from = startOfDay(now)
      const earlier = item.days >= 0 ? from : item.target
      let later = item.days >= 0 ? item.target : from
      // 含起止日期时把区间尾端多算一天
      if (bonus) later = new Date(later.getFullYear(), later.getMonth(), later.getDate() + bonus)
      const { months, days: rest } = monthsBetween(earlier, later)
      return done(NUM.format(months), '个月', rest > 0 ? `余 ${rest} 天` : undefined)
    }
    default: {
      const display = done(NUM.format(days), '天', s.inclusive ? '含起止' : undefined)
      if (isToday && !s.inclusive) return { ...display, text: '就是今天' }
      return display
    }
  }
}

/**
 * 排序：置顶恒在最前，其余未到的排在已过去的之前；
 * 正序按「离现在最近」升序，倒序整体反过来。
 */
export function sortResolved(list: ResolvedCountdown[], order: SortOrder = 'asc') {
  const byDistance = [...list].sort((a, b) => {
    const aFuture = a.days >= 0
    const bFuture = b.days >= 0
    if (aFuture !== bFuture) return aFuture ? -1 : 1
    return aFuture ? a.days - b.days : b.days - a.days
  })
  const ordered = order === 'desc' ? byDistance.reverse() : byDistance
  return ordered.sort((a, b) => Number(Boolean(b.item.pinned)) - Number(Boolean(a.item.pinned)))
}
