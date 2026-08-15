// 农历 / 节气 / 节日 计算（1900 - 2100）

const lunarInfo = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
  0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
  0x0d520,
]

const solarTermInfo = [
  0, 21208, 42467, 63836, 85337, 107014, 128867, 150921, 173149, 195551, 218072, 240693, 263343,
  285989, 308563, 331033, 353350, 375494, 397447, 419210, 440795, 462224, 483532, 504758,
]

export const SOLAR_TERMS = [
  '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
  '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
  '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
  '寒露', '霜降', '立冬', '小雪', '大雪', '冬至',
]

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const ANIMALS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']
const LUNAR_MONTHS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊']
const CHINESE_NUM = ['日', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

/** 农历年总天数 */
function lunarYearDays(year: number) {
  let sum = 348
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += lunarInfo[year - 1900] & i ? 1 : 0
  }
  return sum + leapDays(year)
}

/** 闰月天数（0 表示无闰月） */
function leapDays(year: number) {
  if (leapMonth(year)) return lunarInfo[year - 1900] & 0x10000 ? 30 : 29
  return 0
}

/** 闰哪个月（1-12，0 为不闰） */
function leapMonth(year: number) {
  return lunarInfo[year - 1900] & 0xf
}

/** 农历某月天数 */
function monthDays(year: number, month: number) {
  return lunarInfo[year - 1900] & (0x10000 >> month) ? 30 : 29
}

function toChineseDay(day: number) {
  if (day === 10) return '初十'
  if (day === 20) return '二十'
  if (day === 30) return '三十'
  const prefix = ['初', '十', '廿', '三'][Math.floor(day / 10)]
  return prefix + CHINESE_NUM[day % 10]
}

/** 某年第 n 个节气所在的公历日 */
function solarTermDay(year: number, n: number) {
  const ms =
    31556925974.7 * (year - 1900) + solarTermInfo[n] * 60000 + Date.UTC(1900, 0, 6, 2, 5)
  return new Date(ms).getUTCDate()
}

const SOLAR_FESTIVALS: Record<string, string> = {
  '1-1': '元旦',
  '2-14': '情人节',
  '3-8': '妇女节',
  '3-12': '植树节',
  '4-1': '愚人节',
  '5-1': '劳动节',
  '5-4': '青年节',
  '6-1': '儿童节',
  '7-1': '建党节',
  '8-1': '建军节',
  '9-3': '抗战胜利',
  '9-10': '教师节',
  '10-1': '国庆节',
  '12-25': '圣诞节',
}

const LUNAR_FESTIVALS: Record<string, string> = {
  '1-1': '春节',
  '1-15': '元宵节',
  '2-2': '龙头节',
  '5-5': '端午节',
  '7-7': '七夕节',
  '7-15': '中元节',
  '8-15': '中秋节',
  '9-9': '重阳节',
  '12-8': '腊八节',
}

export type LunarInfo = {
  year: number
  month: number
  day: number
  isLeap: boolean
  monthName: string
  dayName: string
  ganzhi: string
  animal: string
  /** 节气名，无则为空 */
  term: string
  /** 公历节日 */
  solarFestival: string
  /** 农历节日 */
  lunarFestival: string
  /** 单元格显示的主要文本，优先级：农历节日 > 公历节日 > 节气 > 农历月/日 */
  label: string
  /** label 是否为节日或节气（用于配色） */
  highlight: boolean
}

export function getLunar(date: Date): LunarInfo {
  const base = Date.UTC(1900, 0, 31)
  const target = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  let offset = Math.floor((target - base) / 86400000)

  let lYear = 1900
  let daysInYear = 0
  while (lYear < 2101 && offset > 0) {
    daysInYear = lunarYearDays(lYear)
    if (offset < daysInYear) break
    offset -= daysInYear
    lYear++
  }

  const leap = leapMonth(lYear)
  let isLeap = false
  let lMonth = 1
  let daysInMonth = 0
  for (; lMonth < 13 && offset >= 0; lMonth++) {
    if (leap > 0 && lMonth === leap + 1 && !isLeap) {
      lMonth--
      isLeap = true
      daysInMonth = leapDays(lYear)
    } else {
      daysInMonth = monthDays(lYear, lMonth)
    }
    if (isLeap && lMonth === leap + 1) isLeap = false
    if (offset < daysInMonth) break
    offset -= daysInMonth
  }
  if (offset === 0 && leap > 0 && lMonth === leap + 1) {
    if (isLeap) isLeap = false
    else {
      isLeap = true
      lMonth--
    }
  }
  if (offset < 0) {
    offset += daysInMonth
    lMonth--
  }

  const lDay = offset + 1
  const ganzhiIndex = lYear - 1900 + 36
  const ganzhi = GAN[ganzhiIndex % 10] + ZHI[ganzhiIndex % 12]
  const animal = ANIMALS[(lYear - 4) % 12]

  const solarMonth = date.getMonth() + 1
  const solarDay = date.getDate()
  let term = ''
  if (solarTermDay(date.getFullYear(), (solarMonth - 1) * 2) === solarDay) {
    term = SOLAR_TERMS[(solarMonth - 1) * 2]
  } else if (solarTermDay(date.getFullYear(), (solarMonth - 1) * 2 + 1) === solarDay) {
    term = SOLAR_TERMS[(solarMonth - 1) * 2 + 1]
  }

  const solarFestival = SOLAR_FESTIVALS[`${solarMonth}-${solarDay}`] ?? ''
  let lunarFestival = isLeap ? '' : (LUNAR_FESTIVALS[`${lMonth}-${lDay}`] ?? '')
  // 除夕：腊月最后一天
  if (!isLeap && lMonth === 12 && lDay === monthDays(lYear, 12)) lunarFestival = '除夕'

  const monthName = `${isLeap ? '闰' : ''}${LUNAR_MONTHS[lMonth - 1]}月`
  const dayName = toChineseDay(lDay)

  const label = lunarFestival || solarFestival || term || (lDay === 1 ? monthName : dayName)

  return {
    year: lYear,
    month: lMonth,
    day: lDay,
    isLeap,
    monthName,
    dayName,
    ganzhi,
    animal,
    term,
    solarFestival,
    lunarFestival,
    label,
    highlight: Boolean(lunarFestival || solarFestival || term || lDay === 1),
  }
}

export const LUNAR_MONTH_NAMES = LUNAR_MONTHS.map((m) => `${m}月`)

/** 农历日名：1 → 初一 */
export function toChineseDayName(day: number) {
  return toChineseDay(day)
}

/** 农历日名列表：初一 … 三十（按该月实际天数裁剪） */
export function lunarDayNames(count = 30) {
  return Array.from({ length: count }, (_, i) => toChineseDay(i + 1))
}

/** 该农历月天数（含闰月判断） */
export function lunarMonthDays(year: number, month: number, isLeap = false) {
  if (isLeap) return leapDays(year)
  return monthDays(year, month)
}

/** 农历该年闰几月（0 为不闰） */
export function lunarLeapMonth(year: number) {
  return leapMonth(year)
}

/** 农历 → 公历 */
export function lunarToSolar(year: number, month: number, day: number, isLeap = false) {
  let offset = 0
  for (let y = 1900; y < year; y++) offset += lunarYearDays(y)

  const leap = leapMonth(year)
  for (let m = 1; m < month; m++) {
    offset += monthDays(year, m)
    if (leap === m) offset += leapDays(year)
  }
  // 目标为闰月本身时，需先跨过同名的平月
  if (isLeap && leap === month) offset += monthDays(year, month)

  offset += day - 1
  const utc = new Date(Date.UTC(1900, 0, 31) + offset * 86400000)
  // 转回本地时区的「同一个日历日」，避免跨时区偏移一天
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate())
}

/** 一年中的第几周（ISO，周一为一周之始的近似：与截图一致按周日起算） */
export function getWeekOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 1)
  const diff = Math.floor(
    (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - start.getTime()) /
      86400000,
  )
  // 1 月最初几天可能落在第 0 周，统一并入第 1 周
  return Math.max(1, Math.floor((diff + start.getDay()) / 7))
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** YYYY-MM-DD，可直接用于 <input type="date"> */
export function dateKey(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

/** 自然日���值（target - from），忽略时分秒 */
export function daysBetween(from: Date, target: Date) {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
  const b = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()
  return Math.round((b - a) / 86400000)
}
