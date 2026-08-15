'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { CountdownScreen, type ScreenView } from '@/components/countdown-screen'
import { CountdownSummary } from '@/components/countdown-summary'
import { DayDetail } from '@/components/day-detail'
import { buildMonthCells, MonthGrid } from '@/components/month-grid'
import { type Countdown, resolveCountdown } from '@/lib/countdown'
import { dateKey, getWeekOfYear, isSameDay } from '@/lib/lunar'
import { cn } from '@/lib/utils'

const WEEK_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const INITIAL_COUNTDOWNS: Countdown[] = [
  { id: 'c1', title: '生日', calendar: 'lunar', year: 2026, month: 11, day: 7, repeat: true },
  { id: 'c2', title: '春节', calendar: 'lunar', year: 2027, month: 1, day: 1, repeat: true },
  { id: 'c3', title: '国庆假期', calendar: 'solar', year: 2026, month: 10, day: 1, repeat: true },
  { id: 'c4', title: '毕业典礼', calendar: 'solar', year: 2027, month: 6, day: 28, repeat: false },
]

export function CalendarApp() {
  const today = useMemo(() => new Date(), [])
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(today)
  const [detailOpen, setDetailOpen] = useState(false)
  const [events, setEvents] = useState<Record<string, string[]>>(() => ({}))
  const [countdowns, setCountdowns] = useState<Countdown[]>(INITIAL_COUNTDOWNS)
  const [activeId, setActiveId] = useState(INITIAL_COUNTDOWNS[0]?.id)
  const [screen, setScreen] = useState<ScreenView | null>(null)
  const [detailId, setDetailId] = useState<string>()
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const cells = useMemo(
    () => buildMonthCells(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  )
  const eventCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const [key, list] of Object.entries(events)) {
      if (list.length > 0) map.set(key, list.length)
    }
    return map
  }, [events])

  const resolved = useMemo(
    () => countdowns.map((item) => resolveCountdown(item, today)),
    [countdowns, today],
  )
  const active = resolved.find((r) => r.item.id === activeId) ?? resolved[0]

  /** 倒数日目标日 → 名称（同一天可有多个） */
  const countdownTitles = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const r of resolved) {
      const key = dateKey(r.target)
      map.set(key, [...(map.get(key) ?? []), r.item.title])
    }
    return map
  }, [resolved])

  const selectedCountdowns = useMemo(
    () => resolved.filter((r) => isSameDay(r.target, selected)),
    [resolved, selected],
  )

  // 未展开详情时：当月含今天则显示今天所在周，否则显示该月 1 日所在周
  const isCurrentMonth =
    cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth()
  const headerWeek = getWeekOfYear(
    detailOpen ? selected : isCurrentMonth ? today : cursor,
  )

  function shiftMonth(delta: number) {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
    setDetailOpen(false)
  }

  function handleSelect(date: Date) {
    if (detailOpen && isSameDay(date, selected)) {
      setDetailOpen(false)
      return
    }
    setSelected(date)
    setDetailOpen(true)
    if (date.getMonth() !== cursor.getMonth() || date.getFullYear() !== cursor.getFullYear()) {
      setCursor(new Date(date.getFullYear(), date.getMonth(), 1))
    }
  }

  function addEvent(title: string) {
    const key = dateKey(selected)
    setEvents((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), title] }))
  }

  function addCountdown(item: Omit<Countdown, 'id'>) {
    const id = crypto.randomUUID()
    setCountdowns((prev) => [...prev, { ...item, id }])
    setActiveId(id)
  }

  function removeCountdown(id: string) {
    setCountdowns((prev) => {
      const next = prev.filter((item) => item.id !== id)
      if (id === activeId) setActiveId(next[0]?.id)
      return next
    })
    setScreen('all')
    setDetailId(undefined)
  }

  function focusDate(date: Date) {
    setCursor(new Date(date.getFullYear(), date.getMonth(), 1))
    setSelected(date)
    setDetailOpen(true)
  }

  function removeEvent(index: number) {
    const key = dateKey(selected)
    setEvents((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).filter((_, i) => i !== index),
    }))
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background pt-3">
      {/* 顶部：年/月·周 与月份切换 */}
      <header className="flex items-center justify-between px-5 py-2">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="上一月"
          className="text-muted-foreground flex size-9 items-center justify-center rounded-full transition-colors active:bg-muted"
        >
          <ChevronLeft className="size-6" strokeWidth={1.25} />
        </button>
        <button
          type="button"
          onClick={() => {
            setCursor(new Date(today.getFullYear(), today.getMonth(), 1))
            setSelected(today)
            setDetailOpen(false)
          }}
          className="text-[1.75rem] leading-none font-light tabular-nums text-foreground"
        >
          {cursor.getFullYear()} <span className="text-muted-foreground">/</span>{' '}
          {cursor.getMonth() + 1} <span className="text-muted-foreground">·</span> {headerWeek}
        </button>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="下一月"
          className="text-muted-foreground flex size-9 items-center justify-center rounded-full transition-colors active:bg-muted"
        >
          <ChevronRight className="size-6" strokeWidth={1.25} />
        </button>
      </header>

      {/* 星期栏 */}
      <div className="grid grid-cols-7 px-1 pb-1">
        {WEEK_LABELS.map((label, i) => (
          <div
            key={label}
            className={cn(
              'py-1 text-center text-[0.9375rem]',
              i === 0 || i === 6 ? 'text-cal-faint' : 'text-foreground',
            )}
          >
            {label}
          </div>
        ))}
      </div>

      {/* 网格 + 详情叠加层 */}
      <div
        className="relative px-1"
        onTouchStart={(e) => {
          const t = e.touches[0]
          touchStart.current = { x: t.clientX, y: t.clientY }
        }}
        onTouchEnd={(e) => {
          const start = touchStart.current
          if (!start) return
          const t = e.changedTouches[0]
          const dx = t.clientX - start.x
          const dy = t.clientY - start.y
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            shiftMonth(dx < 0 ? 1 : -1)
          }
          touchStart.current = null
        }}
      >
        <DayDetail
          open={detailOpen}
          date={selected}
          today={today}
          events={events[dateKey(selected)] ?? []}
          countdowns={selectedCountdowns}
          onOpenCountdown={(id) => {
            setDetailId(id)
            setScreen('detail')
          }}
          onAddEvent={addEvent}
          onRemoveEvent={removeEvent}
          onClose={() => setDetailOpen(false)}
        />
        <MonthGrid
          cells={cells}
          today={today}
          selected={selected}
          eventCounts={eventCounts}
          countdownTitles={countdownTitles}
          dimmed={detailOpen}
          onSelect={handleSelect}
          onDismiss={() => setDetailOpen(false)}
        />
      </div>

      {/* 点击空白处收起详情 */}
      <button
        type="button"
        aria-label="收起详情"
        tabIndex={detailOpen ? 0 : -1}
        onClick={() => setDetailOpen(false)}
        className={cn('min-h-10 flex-1', detailOpen ? 'cursor-default' : 'pointer-events-none')}
      />

      <CountdownSummary
        active={active}
        total={countdowns.length}
        onOpenAll={() => setScreen('all')}
        onOpenSelect={() => setScreen('select')}
        onOpenAdd={() => setScreen('add')}
      />
      <div className="h-8" />

      <CountdownScreen
        view={screen}
        list={resolved}
        activeId={activeId}
        detailId={detailId}
        onClose={() => {
          setScreen(null)
          setDetailId(undefined)
        }}
        onOpenAdd={() => setScreen('add')}
        onOpenDetail={(id) => {
          setDetailId(id)
          setScreen('detail')
        }}
        onPick={(id) => {
          setActiveId(id)
          setScreen(null)
        }}
        onAdd={addCountdown}
        onRemove={removeCountdown}
        onFocusDate={focusDate}
      />
    </main>
  )
}
