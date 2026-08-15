'use client'

import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
  const listRef = useRef<HTMLDivElement>(null)
  const activeYearRef = useRef<HTMLButtonElement>(null)

  // 每次打开时同步到当前月历年份，并把该年份滚到可视区中间
  useEffect(() => {
    if (!open) return
    setDraftYear(year)
  }, [open, year])

  useEffect(() => {
    if (!open) return
    const list = listRef.current
    const item = activeYearRef.current
    if (!list || !item) return
    const top =
      item.getBoundingClientRect().top -
      list.getBoundingClientRect().top +
      list.scrollTop -
      list.clientHeight / 2 +
      item.clientHeight / 2
    list.scrollTo({ top, behavior: 'auto' })
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
          'border-cal-line relative rounded-t-[1.75rem] border-t bg-background pb-8 transition-transform duration-300 ease-out',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <header className="flex items-center gap-2 px-5 pt-5 pb-4">
          <h2 className="flex-1 text-[1.0625rem] font-light text-foreground">选择年月</h2>
          <button
            type="button"
            tabIndex={open ? 0 : -1}
            onClick={onToday}
            className="border-cal-line h-8 rounded-full border px-4 text-[0.8125rem] font-light text-muted-foreground transition-colors active:bg-muted"
          >
            今天
          </button>
          <button
            type="button"
            aria-label="关闭"
            tabIndex={open ? 0 : -1}
            onClick={onClose}
            className="text-muted-foreground flex size-8 items-center justify-center rounded-full transition-colors active:bg-muted"
          >
            <X className="size-5" strokeWidth={1.25} />
          </button>
        </header>

        <div className="flex gap-4 px-5">
          {/* 年份：可滚动长列表 + 十年快跳 */}
          <div className="flex w-24 shrink-0 flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                tabIndex={open ? 0 : -1}
                onClick={() => stepYear(-10)}
                className="border-cal-line h-7 flex-1 rounded-full border text-[0.75rem] font-light tabular-nums text-muted-foreground transition-colors active:bg-muted"
              >
                -10
              </button>
              <button
                type="button"
                tabIndex={open ? 0 : -1}
                onClick={() => stepYear(10)}
                className="border-cal-line h-7 flex-1 rounded-full border text-[0.75rem] font-light tabular-nums text-muted-foreground transition-colors active:bg-muted"
              >
                +10
              </button>
            </div>
            <div
              ref={listRef}
              className="h-[13.5rem] snap-y overflow-y-auto overscroll-contain rounded-2xl bg-muted/40"
            >
              <ul className="flex flex-col py-1">
                {YEARS.map((y) => {
                  const isDraft = y === draftYear
                  return (
                    <li key={y} className="snap-center px-1">
                      <button
                        type="button"
                        ref={isDraft ? activeYearRef : undefined}
                        tabIndex={open ? 0 : -1}
                        onClick={() => setDraftYear(y)}
                        className={cn(
                          'h-9 w-full rounded-full text-[0.9375rem] font-light tabular-nums transition-colors',
                          isDraft
                            ? 'bg-cal-accent text-background'
                            : y === today.getFullYear()
                              ? 'text-cal-accent'
                              : 'text-muted-foreground active:bg-muted',
                        )}
                      >
                        {y}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          {/* 月份：点选即跳转 */}
          <div className="grid flex-1 grid-cols-3 gap-2">
            {MONTHS.map((m) => {
              const isCurrent = draftYear === year && m === month
              const isThisMonth = draftYear === today.getFullYear() && m === today.getMonth()
              return (
                <button
                  key={m}
                  type="button"
                  tabIndex={open ? 0 : -1}
                  onClick={() => onPick(draftYear, m)}
                  className={cn(
                    'flex h-[3.25rem] items-center justify-center rounded-2xl text-[1.0625rem] font-light tabular-nums transition-colors',
                    isCurrent
                      ? 'bg-cal-accent text-background'
                      : isThisMonth
                        ? 'text-cal-accent bg-cal-accent-soft'
                        : 'bg-muted/40 text-foreground active:bg-muted',
                  )}
                >
                  {m + 1}月
                </button>
              )
            })}
          </div>
        </div>

        <p className="text-cal-faint px-5 pt-4 text-[0.75rem] font-light">
          先选年份，再点月份即可跳转
        </p>
      </div>
    </div>
  )
}
