'use client'

import { Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ResolvedCountdown } from '@/lib/countdown'
import { getLunar, getWeekOfYear, isSameDay } from '@/lib/lunar'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  date: Date
  today: Date
  events: string[]
  countdowns: ResolvedCountdown[]
  onOpenCountdown: (id: string) => void
  onAddEvent: (title: string) => void
  onRemoveEvent: (index: number) => void
  onClose: () => void
}

function Tag({ children, tone }: { children: React.ReactNode; tone: 'red' | 'blue' | 'plain' }) {
  return (
    <span
      className={cn(
        'inline-flex h-[1.375rem] shrink-0 items-center rounded-[0.25rem] px-1.5 text-[0.8125rem] leading-none',
        tone === 'red' && 'bg-cal-accent text-background',
        tone === 'blue' && 'bg-cal-festival text-background',
        tone === 'plain' && 'border-cal-line text-muted-foreground border',
      )}
    >
      {children}
    </span>
  )
}

export function DayDetail({
  open,
  date,
  today,
  events,
  countdowns,
  onOpenCountdown,
  onAddEvent,
  onRemoveEvent,
  onClose,
}: Props) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setAdding(false)
    setDraft('')
  }, [date])

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  const lunar = getLunar(date)
  const isToday = isSameDay(date, today)
  const week = getWeekOfYear(date)

  function submit() {
    const value = draft.trim()
    if (!value) {
      setAdding(false)
      return
    }
    onAddEvent(value)
    setDraft('')
    setAdding(false)
  }

  return (
    <section
      aria-hidden={!open}
      className={cn(
        // 以网格行高度动画实现「插入 / 收起」，把月历向下推移
        'grid overflow-hidden px-5 transition-[grid-template-rows,opacity] duration-300 ease-out',
        open
          ? 'pointer-events-auto grid-rows-[1fr] pb-2 opacity-100'
          : 'pointer-events-none grid-rows-[0fr] opacity-0',
      )}
    >
      <div className="flex min-h-0 flex-col gap-2">
        <div className="flex items-center gap-2">
          <Tag tone="red">{isToday ? '今天' : '日期'}</Tag>
          <p className="text-[0.9375rem] text-foreground">
            {date.getMonth() + 1}月{date.getDate()}日{isToday ? '(今天)' : ''} 第 {week} 周
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground ml-auto -mr-1 flex size-7 items-center justify-center rounded-full transition-colors active:bg-muted"
            aria-label="收起详情"
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Tag tone="blue">农历</Tag>
          <p className="text-[0.9375rem] text-foreground">
            {lunar.ganzhi} ({lunar.animal}) 年 {lunar.monthName}
            {lunar.dayName}
            {lunar.term ? ` · ${lunar.term}` : ''}
            {lunar.lunarFestival || lunar.solarFestival
              ? ` · ${lunar.lunarFestival || lunar.solarFestival}`
              : ''}
          </p>
        </div>

        {countdowns.length > 0 && (
          <div className="flex items-start gap-2">
            <Tag tone="red">倒数</Tag>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {countdowns.map((c) => (
                <button
                  key={c.item.id}
                  type="button"
                  onClick={() => onOpenCountdown(c.item.id)}
                  className="flex w-full items-center gap-2 text-left"
                >
                  <span className="border-cal-accent/60 size-[0.4375rem] shrink-0 rounded-full border" />
                  <span className="min-w-0 truncate text-[0.9375rem] text-foreground">
                    {c.item.title}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-[0.8125rem] tabular-nums">
                    {c.days === 0 ? '就是今天' : c.days > 0 ? `还有 ${c.days} 天` : `已过 ${-c.days} 天`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-start gap-2">
          <Tag tone="blue">事件</Tag>
          {events.length > 1 && <Tag tone="plain">{events.length} 项</Tag>}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {events.map((event, index) => (
              <div key={`${event}-${index}`} className="flex items-center gap-2">
                <span className="bg-cal-event size-[0.3125rem] shrink-0 rounded-full" />
                <p className="min-w-0 flex-1 truncate text-[0.9375rem] text-foreground">{event}</p>
                <button
                  type="button"
                  onClick={() => onRemoveEvent(index)}
                  className="text-cal-faint shrink-0 text-[0.8125rem]"
                  aria-label={`删除事件 ${event}`}
                >
                  <X className="size-3.5" strokeWidth={2} />
                </button>
              </div>
            ))}

            {adding ? (
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={submit}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing || e.keyCode === 229) return
                  if (e.key === 'Enter') submit()
                  if (e.key === 'Escape') {
                    setDraft('')
                    setAdding(false)
                  }
                }}
                placeholder="输入事件名称"
                className="border-cal-line placeholder:text-cal-faint h-7 w-full border-b bg-transparent text-[0.9375rem] text-foreground outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="text-muted-foreground flex w-fit items-center gap-1 text-[0.9375rem] transition-colors active:text-foreground"
              >
                <Plus className="size-4" strokeWidth={1.75} />
                添加事件
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
