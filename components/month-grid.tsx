'use client'

import { dateKey, getLunar, isSameDay } from '@/lib/lunar'
import type { Preferences, WeekStart } from '@/lib/preferences'
import { cn } from '@/lib/utils'

export type DayCell = {
  date: Date
  inMonth: boolean
}

/** 生成 6*7 = 42 个格子，首列由 weekStart 决定（0 周日 / 1 周一） */
export function buildMonthCells(year: number, month: number, weekStart: WeekStart = 0): DayCell[] {
  const first = new Date(year, month, 1)
  const lead = (first.getDay() - weekStart + 7) % 7
  const start = new Date(year, month, 1 - lead)
  const cells: DayCell[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    cells.push({ date: d, inMonth: d.getMonth() === month })
  }
  return cells
}

type Props = {
  cells: DayCell[]
  today: Date
  selected: Date
  /** 日期 → 该日事件数量 */
  eventCounts: Map<string, number>
  /** 日期 → 落在该日的倒数日名称 */
  countdownTitles: Map<string, string[]>
  /** 详情展开时整个网格淡出 */
  dimmed: boolean
  preferences: Preferences
  onSelect: (date: Date) => void
  /** 淡出状态下点击网格任意位置收起详情 */
  onDismiss: () => void
}

export function MonthGrid({
  cells,
  today,
  selected,
  eventCounts,
  countdownTitles,
  dimmed,
  preferences,
  onSelect,
  onDismiss,
}: Props) {
  const { showLunar, showFestival, showOutsideDays } = preferences

  return (
    <div className="relative grid grid-cols-7">
      {/* 淡出时整片网格变成收起热区，避免误点到其它日期 */}
      {dimmed && (
        <button
          type="button"
          aria-label="收起详情"
          onClick={onDismiss}
          className="absolute inset-0 z-10 cursor-default"
        />
      )}
      {cells.map(({ date, inMonth }) => {
        // 关闭「非本月日期」后留空占位，保持网格对齐
        if (!inMonth && !showOutsideDays) {
          return <div key={date.toISOString()} className="h-[var(--cal-cell-h)]" aria-hidden />
        }

        const lunar = getLunar(date)
        const key = dateKey(date)
        const isToday = isSameDay(date, today)
        const isSelected = isSameDay(date, selected)
        const eventCount = eventCounts.get(key) ?? 0
        const marks = countdownTitles.get(key) ?? []
        const isTarget = marks.length > 0
        const weekend = date.getDay() === 0 || date.getDay() === 6
        // 关闭节气节日后回退为纯农历日
        const subLabel = showFestival
          ? lunar.label
          : lunar.day === 1
            ? lunar.monthName
            : lunar.dayName
        const highlight = showFestival && lunar.highlight

        return (
          <button
            key={date.toISOString()}
            type="button"
            onClick={() => onSelect(date)}
            tabIndex={dimmed ? -1 : 0}
            aria-label={[
              `${date.getMonth() + 1}月${date.getDate()}日`,
              `${lunar.monthName}${lunar.dayName}`,
              marks.length ? `倒数日 ${marks.join('、')}` : '',
              eventCount ? `${eventCount} 个事件` : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-current={isToday ? 'date' : undefined}
            className={cn(
              'relative flex h-[var(--cal-cell-h)] flex-col items-center justify-center outline-none transition-opacity duration-300 ease-out',
              dimmed && !isSelected && 'opacity-[0.16]',
              dimmed && isSelected && 'opacity-45',
            )}
          >
            {/* 今天圆形底（选中态不再加浅红底，避免抢视觉） */}
            <span
              className={cn(
                'absolute top-1/2 left-1/2 size-[var(--cal-today-size)] -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-200 ease-out',
                isToday ? 'bg-cal-accent scale-100' : 'scale-50 bg-transparent',
              )}
            />
            <span
              className={cn(
                'relative text-[length:var(--cal-date-fs)] leading-none font-light tabular-nums transition-colors',
                isToday
                  ? 'text-background font-normal'
                  : !inMonth
                    ? 'text-cal-faint'
                    : weekend
                      ? 'text-muted-foreground'
                      : 'text-foreground',
              )}
            >
              {date.getDate()}
            </span>
            {showLunar && (
              <span
                className={cn(
                  'relative mt-0.5 text-[length:var(--cal-lunar-fs)] leading-none',
                  isToday
                    ? 'text-background/90'
                    : !inMonth
                      ? 'text-cal-faint'
                      : highlight
                        ? 'text-cal-festival'
                        : 'text-muted-foreground',
                )}
              >
                {subLabel}
              </span>
            )}
            {/* 标记行：绝对定位在农历文字下方居中，不影响日期与农历的居中对齐 */}
            {(isTarget || eventCount > 0) && (
              <span className="absolute bottom-1 flex items-center gap-[0.1875rem]">
                {/* 倒数日：一个小圆点；同日多个也只显示一个，点击当天展开详情 */}
                {isTarget && (
                  <span
                    aria-hidden
                    className={cn(
                      'size-1 rounded-full',
                      isToday ? 'bg-background/90' : 'bg-cal-accent',
                      !inMonth && !isToday && 'opacity-45',
                    )}
                  />
                )}
                {/* 事件：最多三点，超出以更宽的短横表示 */}
                {Array.from({ length: Math.min(eventCount, 3) }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-[0.3125rem] rounded-full',
                      eventCount > 3 && i === 2 ? 'w-2' : 'w-[0.3125rem]',
                      isToday ? 'bg-background/90' : 'bg-cal-event',
                    )}
                  />
                ))}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
