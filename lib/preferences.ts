/** 界面偏好：布局密度、外观、每周起始日、日历显示项 */

export type Density = 'compact' | 'standard' | 'loose'
export type ThemeMode = 'system' | 'light' | 'dark'
/** 0 = 周日起始，1 = 周一起始 */
export type WeekStart = 0 | 1

export type Preferences = {
  density: Density
  theme: ThemeMode
  weekStart: WeekStart
  /** 格子内显示农历 / 节气 / 节日文字 */
  showLunar: boolean
  /** 节气与节日用强调色，并优先于农历日显示 */
  showFestival: boolean
  /** 顶部与日详情显示周数 */
  showWeekNumber: boolean
  /** 显示非本月日期（关闭时留空） */
  showOutsideDays: boolean
}

export const DEFAULT_PREFERENCES: Preferences = {
  density: 'compact',
  theme: 'system',
  weekStart: 0,
  showLunar: true,
  showFestival: true,
  showWeekNumber: true,
  showOutsideDays: true,
}

export const DENSITY_OPTIONS: { key: Density; label: string }[] = [
  { key: 'compact', label: '紧凑' },
  { key: 'standard', label: '标准' },
  { key: 'loose', label: '宽松' },
]

export const DENSITY_HINTS: Record<Density, string> = {
  compact: '字号与间距最小，一屏能看到更多内容',
  standard: '常规字号与行距',
  loose: '字号与留白更大，适合远距离阅读',
}

export const THEME_OPTIONS: { key: ThemeMode; label: string }[] = [
  { key: 'system', label: '跟随系统' },
  { key: 'light', label: '浅色' },
  { key: 'dark', label: '深色' },
]

export const WEEK_START_OPTIONS: { key: WeekStart; label: string }[] = [
  { key: 0, label: '周日' },
  { key: 1, label: '周一' },
]

export type ToggleKey = 'showLunar' | 'showFestival' | 'showWeekNumber' | 'showOutsideDays'

export const DISPLAY_TOGGLES: { key: ToggleKey; label: string; hint: string }[] = [
  { key: 'showLunar', label: '农历', hint: '格子内第二行显示农历日期' },
  { key: 'showFestival', label: '节气与节日', hint: '节气、节日替代农历日并用强调色' },
  { key: 'showWeekNumber', label: '周数', hint: '顶部与日详情显示第几周' },
  { key: 'showOutsideDays', label: '非本月日期', hint: '关闭后上下月的日期留空' },
]

const WEEK_LABELS_SUNDAY = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** 按起始日旋转后的星期标签 */
export function weekLabels(weekStart: WeekStart) {
  return weekStart === 0
    ? WEEK_LABELS_SUNDAY
    : [...WEEK_LABELS_SUNDAY.slice(1), WEEK_LABELS_SUNDAY[0]]
}

/** 该列是否为周末（用于星期栏配色） */
export function isWeekendColumn(index: number, weekStart: WeekStart) {
  const day = (index + weekStart) % 7
  return day === 0 || day === 6
}
