'use client'

import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CountdownScreen, type ScreenView } from '@/components/countdown-screen'
import { CountdownSummary } from '@/components/countdown-summary'
import { DayDetail } from '@/components/day-detail'
import { buildMonthCells, MonthGrid } from '@/components/month-grid'
import { MAX_YEAR, MIN_YEAR, MonthPicker } from '@/components/month-picker'
import { SettingsScreen, type SettingsView } from '@/components/settings-screen'
import {
  type Countdown,
  type CountdownSettings,
  type CountdownUnit,
  DEFAULT_CATEGORIES,
  DEFAULT_SETTINGS,
  formatCountdown,
  needsSecondTickForAny,
  NO_REPEAT,
  type Repeat,
  type ResolvedCountdown,
  resolveCountdown,
  resolveSettings,
  sortResolved,
} from '@/lib/countdown'
import { dateKey, getWeekOfYear, isSameDay } from '@/lib/lunar'
import {
  DEFAULT_PREFERENCES,
  isWeekendColumn,
  type Preferences,
  weekLabels,
} from '@/lib/preferences'
import { cn } from '@/lib/utils'

const YEARLY: Repeat = { freq: 'year', interval: 1 }

const INITIAL_COUNTDOWNS: Countdown[] = [
  {
    id: 'c1',
    title: '生日',
    calendar: 'lunar',
    year: 2026,
    month: 11,
    day: 7,
    repeat: YEARLY,
    category: '纪念日',
    pinned: true,
  },
  {
    id: 'c2',
    title: '春节',
    calendar: 'lunar',
    year: 2027,
    month: 1,
    day: 1,
    repeat: YEARLY,
    category: '节日',
  },
  {
    id: 'c3',
    title: '国庆假期',
    calendar: 'solar',
    year: 2026,
    month: 10,
    day: 1,
    repeat: YEARLY,
    category: '节日',
  },
  {
    id: 'c4',
    title: '周会',
    calendar: 'solar',
    year: 2026,
    month: 8,
    day: 17,
    time: '09:30',
    repeat: { freq: 'week', interval: 1, weekdays: [1] },
    category: '工作',
  },
  {
    id: 'c5',
    title: '毕业典礼',
    calendar: 'solar',
    year: 2027,
    month: 6,
    day: 28,
    repeat: NO_REPEAT,
    category: '生活',
  },
]

export function CalendarApp() {
  // 走动的时钟：跨零点自动换「今天」，秒级单位下每秒刷新
  const [now, setNow] = useState(() => new Date())
  const [mounted, setMounted] = useState(false)
  const [settings, setSettings] = useState<CountdownSettings>(DEFAULT_SETTINGS)
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES)
  const todayKey = dateKey(now)
  const today = useMemo(() => {
    const [y, m, d] = todayKey.split('-').map(Number)
    return new Date(y, m - 1, d)
  }, [todayKey])

  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))
  const [selected, setSelected] = useState(today)
  const [detailOpen, setDetailOpen] = useState(false)
  const [events, setEvents] = useState<Record<string, string[]>>(() => ({}))
  const [countdowns, setCountdowns] = useState<Countdown[]>(INITIAL_COUNTDOWNS)
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [activeId, setActiveId] = useState(INITIAL_COUNTDOWNS[0]?.id)
  const [screen, setScreen] = useState<ScreenView | null>(null)
  const [detailId, setDetailId] = useState<string>()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [settingsView, setSettingsView] = useState<SettingsView | null>(null)
  /** 「关于」是否从设置页进入（决定返回到设置还是日历） */
  const [aboutFromSettings, setAboutFromSettings] = useState(false)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => setMounted(true), [])

  // 外观：system 时移除类名交给 prefers-color-scheme，否则强制 light / dark
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    if (preferences.theme !== 'system') root.classList.add(preferences.theme)
  }, [preferences.theme])

  function changePreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPreferences((prev) => ({ ...prev, [key]: value }))
  }

  /** 设置页里的默认单位 */
  function changeUnit(unit: CountdownUnit) {
    setSettings((prev) => ({ ...prev, unit }))
  }

  function togglePrecise() {
    setSettings((prev) => ({ ...prev, precise: !prev.precise }))
  }

  /** 设置页里的默认起止口径 */
  function toggleDefaultInclusive() {
    setSettings((prev) => ({ ...prev, inclusive: !prev.inclusive }))
  }

  /** 列表排序方向 */
  function toggleSortOrder() {
    setSettings((prev) => ({ ...prev, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' }))
  }

  /** 置顶 / 取消置顶 */
  function togglePin(id: string) {
    setCountdowns((prev) =>
      prev.map((item) => (item.id === id ? { ...item, pinned: !item.pinned } : item)),
    )
  }

  function createCategory(name: string) {
    setCategories((prev) => (prev.includes(name) ? prev : [...prev, name]))
  }

  /** 摘要区改的是当前目标这一条的单位 */
  function changeItemUnit(unit: CountdownUnit) {
    if (!activeId) return
    setCountdowns((prev) => prev.map((item) => (item.id === activeId ? { ...item, unit } : item)))
  }

  /** 摘要区改的是当前目标这一条的起止口径 */
  function toggleItemInclusive() {
    if (!activeId) return
    setCountdowns((prev) =>
      prev.map((item) =>
        item.id === activeId
          ? { ...item, inclusive: !(item.inclusive ?? settings.inclusive) }
          : item,
      ),
    )
  }

  // 任一条目用到秒级单位就每秒走一次，其余每 30 秒走一次（用于跨零点换日）
  useEffect(() => {
    const step = needsSecondTickForAny(countdowns, settings) ? 1000 : 30_000
    const id = setInterval(() => setNow(new Date()), step)
    return () => clearInterval(id)
  }, [countdowns, settings])

  const cells = useMemo(
    () => buildMonthCells(cursor.getFullYear(), cursor.getMonth(), preferences.weekStart),
    [cursor, preferences.weekStart],
  )
  const labels = useMemo(() => weekLabels(preferences.weekStart), [preferences.weekStart])
  const eventCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const [key, list] of Object.entries(events)) {
      if (list.length > 0) map.set(key, list.length)
    }
    return map
  }, [events])

  // 推算目标要带上真实时刻（否则「每天 07:00」过了点也不会顺延），
  // 但按分钟取整，避免秒级刷新时反复重算整张列表
  const minuteKey = `${todayKey} ${now.getHours()}:${now.getMinutes()}`
  const clock = useMemo(() => {
    const [date, time] = minuteKey.split(' ')
    const [y, m, d] = date.split('-').map(Number)
    const [h, min] = time.split(':').map(Number)
    return new Date(y, m - 1, d, h, min)
  }, [minuteKey])

  const resolved = useMemo(
    () => countdowns.map((item) => resolveCountdown(item, clock)),
    [countdowns, clock],
  )
  // 未指定目标时，首页优先显示置顶条目（sortResolved 已把置顶排在最前）
  const active =
    resolved.find((r) => r.item.id === activeId) ?? sortResolved(resolved, settings.sortOrder)[0]

  // 服务端渲染阶段先按「天」显示，挂载后再切到真实单位，避免时刻类文本水合不一致
  const effectiveSettings = mounted ? settings : DEFAULT_SETTINGS
  const format = (item: ResolvedCountdown) => formatCountdown(item, effectiveSettings, now)
  // 当前目标实际生效的单位与起止口径（条目自带的优先）
  const activeSettings = active ? resolveSettings(active.item, settings) : settings

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
    setCursor((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
      // 超出农历历表范围时保���原位，避免出现「undefined月」
      if (next.getFullYear() < MIN_YEAR || next.getFullYear() > MAX_YEAR) return prev
      return next
    })
    setDetailOpen(false)
  }

  /** 年月选择器：跨年跨月直接跳转 */
  function jumpTo(year: number, month: number) {
    setCursor(new Date(year, month, 1))
    setDetailOpen(false)
    setPickerOpen(false)
  }

  function goToday() {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelected(today)
    setDetailOpen(false)
    setPickerOpen(false)
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
    <main
      data-density={preferences.density}
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background pt-2"
    >
      {/* 顶部：年/月·周 与月份切换 */}
      <header className="flex items-center justify-between px-5 py-1">
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
          onClick={() => setPickerOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[length:var(--cal-title-fs)] leading-none font-light tabular-nums text-foreground transition-colors active:bg-muted"
        >
          {cursor.getFullYear()} <span className="text-muted-foreground">/</span>{' '}
          {cursor.getMonth() + 1}
          {preferences.showWeekNumber ? (
            <>
              <span className="text-muted-foreground">·</span> {headerWeek}
            </>
          ) : null}
          <ChevronDown className="text-muted-foreground size-4" strokeWidth={1.5} />
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
      <div className="grid grid-cols-7 px-1 pb-0.5">
        {labels.map((label, i) => (
          <div
            key={label}
            className={cn(
              'py-0.5 text-center text-[length:var(--cal-week-fs)]',
              isWeekendColumn(i, preferences.weekStart) ? 'text-cal-faint' : 'text-foreground',
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
          format={format}
          showWeekNumber={preferences.showWeekNumber}
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
          preferences={preferences}
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
        display={active ? format(active) : undefined}
        itemSettings={activeSettings}
        total={countdowns.length}
        onChangeUnit={changeItemUnit}
        onToggleInclusive={toggleItemInclusive}
        onOpenAll={() => setScreen('all')}
        onOpenSelect={() => setScreen('select')}
        onOpenAdd={() => setScreen('add')}
      />

      {/* 页脚：设置 与 关于 入口 */}
      <footer className="border-cal-line flex items-center justify-center gap-6 border-t px-5 py-3">
        <button
          type="button"
          onClick={() => setSettingsView('settings')}
          className="text-muted-foreground text-[length:var(--cal-sub-fs)] font-light transition-colors active:text-foreground"
        >
          设置
        </button>
        <span aria-hidden className="bg-cal-line h-3 w-px" />
        <button
          type="button"
          onClick={() => {
            setAboutFromSettings(false)
            setSettingsView('about')
          }}
          className="text-muted-foreground text-[length:var(--cal-sub-fs)] font-light transition-colors active:text-foreground"
        >
          关于
        </button>
      </footer>

      <MonthPicker
        open={pickerOpen}
        year={cursor.getFullYear()}
        month={cursor.getMonth()}
        today={today}
        onPick={jumpTo}
        onToday={goToday}
        onClose={() => setPickerOpen(false)}
      />

      <SettingsScreen
        view={settingsView}
        settings={settings}
        preferences={preferences}
        onChangeUnit={changeUnit}
        onTogglePrecise={togglePrecise}
        onToggleInclusive={toggleDefaultInclusive}
        onToggleSort={toggleSortOrder}
        onChangePreference={changePreference}
        backLabel={settingsView === 'about' && aboutFromSettings ? '设置' : '日历'}
        onOpenAbout={() => {
          setAboutFromSettings(true)
          setSettingsView('about')
        }}
        onClose={() =>
          setSettingsView(settingsView === 'about' && aboutFromSettings ? 'settings' : null)
        }
      />

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
        onTogglePin={togglePin}
        onToggleSort={toggleSortOrder}
        categories={categories}
        onCreateCategory={createCategory}
        settings={settings}
        format={format}
      />
    </main>
  )
}
