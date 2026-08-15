'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getLunar } from '@/lib/lunar'
import { cn } from '@/lib/utils'

// 农历历表覆盖 1900-01-31 — 2100-12-31，收窄一年以保证相邻月份的农历也可算
export const MIN_YEAR = 1901
export const MAX_YEAR = 2099
const YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i)

type Props = {
  open: boolean
  /** 当前月历所在年份 */
  year: number
  /** 当前月历所在月份（0-11） */
  month: number
  today: Date
  onPick: (year: number, month: number) => void
  onToday: () => void
  onClose: () => void
}

export function MonthPicker({ open, year, month, today, onPick, onToday, onClose }: Props) {
  const [draftYear, setDraftYear] = useState(year)
  const stripRef = useRef<HTMLDivElement>(null)
  const activeYearRef = useRef<HTMLButtonElement>(null)

  // 每次打开时同步到当前月历年份
  useEffect(() => {
    if (!open) return
    setDraftYear(year)
  }, [open, year])

  // 把选中年份横向滚到条带中间
  useEffect(() => {
    if (!open) return
    const strip = stripRef.current
    const item = activeYearRef.current
    if (!strip || !item) return
    strip.scrollTo({
      left: item.offsetLeft - strip.clientWidth / 2 + item.clientWidth / 2,
      behavior: 'auto',
    })
  }, [open, draftYear])

  function stepYear(delta: number) {
    setDraftYear((prev) => Math.min(MAX_YEAR, Math.max(MIN_YEAR, prev + delta)))
  }

  return (
    <div
      aria-hidden={!open}
      className={cn(
        'fixed inset-0 z-40 mx-auto flex max-w-md flex-col justify-end',
        open ? '' : 'pointer-events-none',
      )}
    >
      <button
        type="button"
        aria-label="关闭年月选择"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cn(
          'absolute inset-0 cursor-default bg-foreground/20 transition-opacity duration-300 ease-out',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="选择年月"
        className={cn(
          'border-cal-line relative border-t bg-background pt-2 pb-6 transition-transform duration-300 ease-out',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        {/* 年份导航：与日历顶部同构（左右箭头 + 居中大号年份） */}
        <header className="flex items-center justify-between px-5 py-1">
          <button
            type="button"
            tabIndex={open ? 0 : -1}
            onClick={() => stepYear(-1)}
            aria-label="上一年"
            className="text-muted-foreground flex size-9 items-center justify-center rounded-full transition-colors active:bg-muted"
          >
            <ChevronLeft className="size-6" strokeWidth={1.25} />
          </button>
          <button
            type="button"
            tabIndex={open ? 0 : -1}
            onClick={onToday}
            className="rounded-full px-2 py-1 text-[length:var(--cal-title-fs)] leading-none font-light tabular-nums text-foreground transition-colors active:bg-muted"
          >
            {draftYear}
            <span className="text-muted-foreground ml-1.5 text-[length:var(--cal-sub-fs)]">
              回今天
            </span>
          </button>
          <button
            type="button"
            tabIndex={open ? 0 : -1}
            onClick={() => stepYear(1)}
            aria-label="下一年"
            className="text-muted-foreground flex size-9 items-center justify-center rounded-full transition-colors active:bg-muted"
          >
            <ChevronRight className="size-6" strokeWidth={1.25} />
          </button>
        </header>

        {/* 年份条带：横向滑动跨年份，与星期栏同一层级的轻量文字行 */}
        <div
          ref={stripRef}
          className="border-cal-line snap-x snap-mandatory overflow-x-auto overscroll-x-contain border-y"
        >
          <div className="flex w-max px-[45%]">
            {YEARS.map((y) => {
              const isDraft = y === draftYear
              const isThisYear = y === today.getFullYear()
              return (
                <button
                  key={y}
                  type="button"
                  ref={isDraft ? activeYearRef : undefined}
                  tabIndex={open ? 0 : -1}
                  onClick={() => setDraftYear(y)}
                  className={cn(
                    'relative shrink-0 snap-center px-3 py-2 text-[length:var(--cal-week-fs)] font-light tabular-nums transition-colors',
                    isDraft
                      ? 'text-foreground'
                      : isThisYear
                        ? 'text-cal-accent'
                        : 'text-cal-faint',
                  )}
                >
                  {y}
                  {/* 选中年份用细下划线标示，沿用日历的极简标记 */}
                  <span
                    aria-hidden
                    className={cn(
                      'bg-cal-accent absolute inset-x-3 bottom-1 h-px transition-opacity',
                      isDraft ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </button>
              )
            })}
          </div>
        </div>

        {/* 月份网格：格子高度与日历一致，主数字 + 农历月名的双行结构 */}
        <div className="grid grid-cols-4 px-1 pt-1">
          {MONTHS.map((m) => {
            const isCurrent = draftYear === year && m === month
            const isThisMonth = draftYear === today.getFullYear() && m === today.getMonth()
            const lunarMonth = getLunar(new Date(draftYear, m, 1)).monthName
            return (
              <button
                key={m}
                type="button"
                tabIndex={open ? 0 : -1}
                onClick={() => onPick(draftYear, m)}
                aria-current={isCurrent ? 'true' : undefined}
                className="relative flex h-[var(--cal-cell-h)] flex-col items-center justify-center outline-none"
              >
                {/* 当前所在月：与「今天」同样的实心圆底 */}
                <span
                  className={cn(
                    'absolute top-1/2 left-1/2 size-[calc(var(--cal-today-size)*1.5)] -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-200 ease-out',
                    isCurrent ? 'bg-cal-accent scale-100' : 'scale-50 bg-transparent',
                  )}
                />
                <span
                  className={cn(
                    'relative text-[length:var(--cal-date-fs)] leading-none font-light tabular-nums transition-colors',
                    isCurrent
                      ? 'text-background font-normal'
                      : isThisMonth
                        ? 'text-cal-accent'
                        : 'text-foreground',
                  )}
                >
                  {m + 1}
                  <span className="text-[length:var(--cal-lunar-fs)]">月</span>
                </span>
                <span
                  className={cn(
                    'relative mt-0.5 text-[length:var(--cal-lunar-fs)] leading-none',
                    isCurrent ? 'text-background/90' : 'text-muted-foreground',
                  )}
                >
                  {lunarMonth}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
