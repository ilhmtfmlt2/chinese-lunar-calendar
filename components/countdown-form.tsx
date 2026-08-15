'use client'

import { useMemo, useState } from 'react'
import type {
  CalendarType,
  Countdown,
  CountdownSettings,
  CountdownUnit,
  RepeatFreq,
} from '@/lib/countdown'
import {
  describeRepeat,
  REPEAT_OPTIONS,
  UNIT_OPTIONS,
  unitLabel,
  WEEKDAY_NAMES,
} from '@/lib/countdown'
import {
  dateKey,
  getLunar,
  LUNAR_MONTH_NAMES,
  lunarDayNames,
  lunarMonthDays,
  lunarToSolar,
} from '@/lib/lunar'
import { cn } from '@/lib/utils'

type Props = {
  /** 全局默认，用于「跟随默认」选项的文案 */
  defaults: CountdownSettings
  /** 已有分类，可直接选，也可新增 */
  categories: string[]
  onCreateCategory: (name: string) => void
  onSubmit: (item: Omit<Countdown, 'id'>) => void
  onCancel: () => void
}

/** 空字符串代表跟随全局默认 */
type UnitChoice = CountdownUnit | ''

const LABEL = 'text-muted-foreground w-[4.5rem] shrink-0 text-[0.9375rem] font-light'
const ROW = 'border-cal-line flex items-center gap-3 border-b py-4'
const FIELD =
  'min-w-0 flex-1 bg-transparent text-right text-[1.0625rem] font-light text-foreground outline-none'

function Switch({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors',
        on ? 'bg-cal-accent' : 'bg-cal-line',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 size-5 rounded-full bg-background transition-[left] duration-200',
          on ? 'left-[1.375rem]' : 'left-0.5',
        )}
      />
    </span>
  )
}

export function CountdownForm({
  defaults,
  categories,
  onCreateCategory,
  onSubmit,
  onCancel,
}: Props) {
  const today = useMemo(() => new Date(), [])
  const todayLunar = useMemo(() => getLunar(today), [today])

  const [calendar, setCalendar] = useState<CalendarType>('solar')
  const [title, setTitle] = useState('')
  // 开始日期（重复的锚点）
  const [solar, setSolar] = useState(() => dateKey(today))
  const [lYear, setLYear] = useState(todayLunar.year)
  const [lMonth, setLMonth] = useState(todayLunar.month)
  const [lDay, setLDay] = useState(todayLunar.day)
  const [time, setTime] = useState('')
  // 重复：频率 + 间隔 +（按周时）星期
  const [freq, setFreq] = useState<RepeatFreq>('none')
  const [interval, setIntervalValue] = useState(1)
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [category, setCategory] = useState(categories[0] ?? '生活')
  const [newCategory, setNewCategory] = useState('')
  const [pinned, setPinned] = useState(false)
  const [unit, setUnit] = useState<UnitChoice>('')
  const [inclusive, setInclusive] = useState(defaults.inclusive)

  const maxLunarDay = lunarMonthDays(lYear, lMonth)
  const safeLDay = Math.min(lDay, maxLunarDay)
  const startDate = useMemo(() => {
    if (calendar === 'lunar') return lunarToSolar(lYear, lMonth, safeLDay)
    const [y, m, d] = solar.split('-').map(Number)
    if (!y || !m || !d) return null
    return new Date(y, m - 1, d)
  }, [calendar, lYear, lMonth, safeLDay, solar])

  const repeatUnit = REPEAT_OPTIONS.find((o) => o.key === freq)?.unit ?? ''

  function toggleWeekday(day: number) {
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  /** 预览用的临时条目，直接复用库里的描述函数 */
  const draft = useMemo<Countdown | null>(() => {
    if (!startDate) return null
    const base =
      calendar === 'lunar'
        ? { year: lYear, month: lMonth, day: safeLDay }
        : {
            year: startDate.getFullYear(),
            month: startDate.getMonth() + 1,
            day: startDate.getDate(),
          }
    return {
      id: 'draft',
      title: title || '未命名',
      calendar,
      ...base,
      time: time || undefined,
      repeat: { freq, interval, weekdays: freq === 'week' ? weekdays : undefined },
      category,
      pinned,
    }
  }, [
    calendar,
    category,
    freq,
    interval,
    lMonth,
    lYear,
    pinned,
    safeLDay,
    startDate,
    time,
    title,
    weekdays,
  ])

  const preview = useMemo(() => {
    if (!startDate) return ''
    if (calendar === 'lunar') return `公历 ${dateKey(startDate)}`
    const l = getLunar(startDate)
    return `农历 ${l.ganzhi}年 ${l.monthName}${l.dayName}`
  }, [calendar, startDate])

  function addCategory() {
    const name = newCategory.trim()
    if (!name) return
    onCreateCategory(name)
    setCategory(name)
    setNewCategory('')
  }

  function submit() {
    const name = title.trim()
    if (!name || !startDate) return
    const extra = {
      time: time || undefined,
      repeat: {
        freq,
        interval: Math.min(99, Math.max(1, Math.floor(interval || 1))),
        ...(freq === 'week' && weekdays.length ? { weekdays } : {}),
      },
      category,
      ...(pinned ? { pinned } : {}),
      ...(unit ? { unit } : {}),
      ...(inclusive === defaults.inclusive ? {} : { inclusive }),
    }
    if (calendar === 'lunar') {
      onSubmit({ title: name, calendar, year: lYear, month: lMonth, day: safeLDay, ...extra })
      return
    }
    onSubmit({
      title: name,
      calendar,
      year: startDate.getFullYear(),
      month: startDate.getMonth() + 1,
      day: startDate.getDate(),
      ...extra,
    })
  }

  return (
    <div className="flex flex-col px-5 pb-6">
      {/* 公历 / 农历切换 */}
      <div className="border-cal-line flex border-b">
        {(['solar', 'lunar'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setCalendar(type)}
            className={cn(
              'relative flex-1 py-3.5 text-[1.0625rem] font-light transition-colors',
              calendar === type ? 'text-foreground' : 'text-cal-faint',
            )}
          >
            {type === 'solar' ? '公历' : '农历'}
            <span
              className={cn(
                'bg-foreground absolute inset-x-6 -bottom-px h-px transition-opacity',
                calendar === type ? 'opacity-100' : 'opacity-0',
              )}
            />
          </button>
        ))}
      </div>

      <label className={ROW}>
        <span className={LABEL}>名称</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing || e.keyCode === 229) return
            if (e.key === 'Enter') submit()
          }}
          placeholder="如：生日、周会"
          className={cn(FIELD, 'placeholder:text-cal-faint')}
        />
      </label>

      {calendar === 'solar' ? (
        <label className={ROW}>
          <span className={LABEL}>开始日期</span>
          <input
            type="date"
            value={solar}
            onChange={(e) => setSolar(e.target.value)}
            className={cn(FIELD, 'tabular-nums')}
          />
        </label>
      ) : (
        <div className={ROW}>
          <span className={LABEL}>开始日期</span>
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <select
              value={lYear}
              onChange={(e) => setLYear(Number(e.target.value))}
              className={cn(FIELD, 'tabular-nums')}
            >
              {Array.from({ length: 12 }, (_, i) => todayLunar.year - 1 + i).map((y) => (
                <option key={y} value={y}>
                  {y} 年
                </option>
              ))}
            </select>
            <select
              value={lMonth}
              onChange={(e) => setLMonth(Number(e.target.value))}
              className={FIELD}
            >
              {LUNAR_MONTH_NAMES.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={safeLDay}
              onChange={(e) => setLDay(Number(e.target.value))}
              className={FIELD}
            >
              {lunarDayNames(maxLunarDay).map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* 时刻：留空按整天算 */}
      <label className={ROW}>
        <span className={LABEL}>时刻</span>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className={cn(FIELD, 'tabular-nums')}
        />
        {time ? (
          <button
            type="button"
            onClick={() => setTime('')}
            className="text-cal-faint shrink-0 text-[0.8125rem] font-light"
          >
            清除
          </button>
        ) : null}
      </label>

      {/* 重复频率 */}
      <label className={ROW}>
        <span className={LABEL}>重复</span>
        <select
          value={freq}
          onChange={(e) => setFreq(e.target.value as RepeatFreq)}
          className={FIELD}
        >
          {REPEAT_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {/* 间隔：每 N 天 / 周 / 月 / 年 */}
      {freq !== 'none' ? (
        <label className={ROW}>
          <span className={LABEL}>间隔</span>
          <span className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
            <span className="text-muted-foreground text-[0.9375rem] font-light">每</span>
            <input
              type="number"
              min={1}
              max={99}
              value={interval}
              onChange={(e) => setIntervalValue(Number(e.target.value))}
              className="w-14 bg-transparent text-right text-[1.0625rem] font-light tabular-nums text-foreground outline-none"
            />
            <span className="text-muted-foreground text-[0.9375rem] font-light">{repeatUnit}</span>
          </span>
        </label>
      ) : null}

      {/* 按周重复时选星期，可多选；不选则用开始日期的星期 */}
      {freq === 'week' ? (
        <div className="border-cal-line flex flex-col gap-2 border-b py-4">
          <span className="text-muted-foreground text-[0.9375rem] font-light">
            重复在（不选则跟随开始日期）
          </span>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAY_NAMES.map((name, index) => {
              const on = weekdays.includes(index)
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleWeekday(index)}
                  className={cn(
                    'border-cal-line rounded-full border px-2.5 py-1 text-[0.8125rem] font-light transition-colors',
                    on
                      ? 'border-transparent bg-foreground text-background'
                      : 'text-muted-foreground',
                  )}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* 分类：可选已有，也可新增 */}
      <label className={ROW}>
        <span className={LABEL}>分类</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={FIELD}
        >
          {categories.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <div className={ROW}>
        <span className={LABEL}>新增分类</span>
        <input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing || e.keyCode === 229) return
            if (e.key === 'Enter') addCategory()
          }}
          placeholder="如：健身"
          className={cn(FIELD, 'placeholder:text-cal-faint')}
        />
        <button
          type="button"
          onClick={addCategory}
          disabled={!newCategory.trim()}
          className="border-cal-line text-muted-foreground shrink-0 rounded-full border px-2.5 py-1 text-[0.8125rem] font-light disabled:opacity-30"
        >
          添加
        </button>
      </div>

      <button
        type="button"
        onClick={() => setPinned((v) => !v)}
        aria-pressed={pinned}
        className="border-cal-line flex items-center justify-between gap-3 border-b py-4 text-left"
      >
        <span className="flex flex-col gap-0.5">
          <span className="text-[1.0625rem] font-light text-foreground">置顶</span>
          <span className="text-cal-faint text-[0.8125rem] font-light">
            排在列表最前，并优先显示在首页
          </span>
        </span>
        <Switch on={pinned} />
      </button>

      {/* 显示单位：留空则跟随设置里的默认单位 */}
      <label className={ROW}>
        <span className={LABEL}>显示单位</span>
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value as UnitChoice)}
          className={FIELD}
        >
          <option value="">跟随默认（{unitLabel(defaults.unit)}）</option>
          {UNIT_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={() => setInclusive((v) => !v)}
        aria-pressed={inclusive}
        className="border-cal-line flex items-center justify-between gap-3 border-b py-4 text-left"
      >
        <span className="flex flex-col gap-0.5">
          <span className="text-[1.0625rem] font-light text-foreground">包含起止日期</span>
          <span className="text-cal-faint text-[0.8125rem] font-light">
            开启后首尾两天都算进天数
          </span>
        </span>
        <Switch on={inclusive} />
      </button>

      <p className="text-muted-foreground py-4 text-[0.8125rem] leading-relaxed font-light tabular-nums">
        换算：{preview}
        <br />
        规则：{draft ? describeRepeat(draft) : '—'}
        {time ? ` · ${time}` : ' · 整天'}
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="border-cal-line text-muted-foreground h-11 flex-1 rounded-full border text-[1.0625rem] font-light"
        >
          取消
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!title.trim()}
          className="h-11 flex-1 rounded-full bg-foreground text-[1.0625rem] font-light text-background transition-opacity active:opacity-80 disabled:opacity-30"
        >
          保存
        </button>
      </div>
    </div>
  )
}
