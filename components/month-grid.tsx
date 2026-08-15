'use client'

import { dateKey, getLunar, isSameDay } from '@/lib/lunar'
import { cn } from '@/lib/utils'

export type DayCell = {
  date: Date
  inMonth: boolean
}

/** 生成 6*7 = 42 个格子（周日起始） */
export function buildMonthCells(year: number, month: number): DayCell[] {
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - first.getDay())
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
  onSelect,
  onDismiss,
}: Props) {
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
        const lunar = getLunar(date)
        const key = dateKey(date)
        const isToday = isSameDay(date, today)
        const isSelected = isSameDay(date, selected)
        const eventCount = eventCounts.get(key) ?? 0
        const marks = countdownTitles.get(key) ?? []
        const isTarget = marks.length > 0
        const weekend = date.getDay() === 0 || date.getDay() === 6

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
              'relative flex h-[3.75rem] flex-col items-center justify-center outline-none transition-opacity duration-300 ease-out',
              dimmed && !isSelected && 'opacity-[0.16]',
              dimmed && isSelected && 'opacity-45',
            )}
          >
            {/* 倒数日目标：细圈；与今天并存时外扩一圈 */}
            {isTarget && (
              <span
                aria-hidden
                className={cn(
                  'border-cal-accent/45 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border',
                  isToday ? 'size-[3.375rem]' : 'size-12',
                )}
              />
            )}

            {/* 选中/今天圆形底 */}
            <span
              className={cn(
                'absolute top-1/2 left-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-200 ease-out',
                isToday && 'bg-cal-accent scale-100',
                !isToday && isSelected && 'bg-cal-accent-soft scale-100',
                !isToday && !isSelected && 'scale-50 bg-transparent',
              )}
            />
            <span
              className={cn(
                'relative text-[1.375rem] leading-tight font-light tabular-nums transition-colors',
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
            <span
              className={cn(
                'relative mt-0.5 text-[0.6875rem] leading-none',
                isToday
                  ? 'text-background/90'
                  : !inMonth
                    ? 'text-cal-faint'
                    : lunar.highlight
                      ? 'text-cal-festival'
                      : 'text-muted-foreground',
              )}
            >
              {lunar.label}
            </span>
            {/* 事件：最多三点，超出以更宽的短横表示 */}
            {eventCount > 0 && (
              <span className="absolute bottom-1.5 flex items-center gap-[0.1875rem]">
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
