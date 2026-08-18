'use client'

import { Check, X } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import type {
  CalendarType,
  Countdown,
  CountdownSettings,
  CountdownUnit,
  RepeatFreq,
} from '@/lib/countdown'
import {
  COLOR_OPTIONS,
  colorValue,
  describeRepeat,
  REPEAT_OPTIONS,
  supportsInclusive,
  UNIT_OPTIONS,
  unitLabel,
  WEEKDAY_NAMES,
} from '@/lib/countdown'
import { FALLBACK_ICON_KEY, getIcon, ICON_OPTIONS } from '@/lib/countdown-icons'
import {
  dateKey,
  getLunar,
  LUNAR_MONTH_NAMES,
  lunarDayNames,
  lunarLeapMonth,
  lunarMonthDays,
  lunarToSolar,
} from '@/lib/lunar'
import { cn } from '@/lib/utils'

type Props = {
  /** 全局默认，用于「跟随默认」选项的文案 */
  defaults: CountdownSettings
  /** 已有分类，可直接选，也可新增 */
  categories: string[]
  /** 分类 → 图标 key，用于选择分类时展示 */
  categoryIcons: Record<string, string>
  onCreateCategory: (name: string, icon: string) => void
  onSubmit: (item: Omit<Countdown, 'id'>) => void
  onCancel: () => void
}

/** 空字符串代表跟随全局默认 */
type UnitChoice = CountdownUnit | ''
/** 三态：'' 跟随默认，'on' 强制开，'off' 强制关 */
type TriChoice = '' | 'on' | 'off'

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

/** 紧凑图标按钮 + 弹出网格，用于新建分类时快速选一个图标 */
function IconPickerButton({
  value,
  onChange,
}: {
  value: string
  onChange: (key: string) => void
}) {
  const [open, setOpen] = useState(false)
  const CurrentIcon = getIcon(value)

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="选择图标"
        className="border-cal-line text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full border"
      >
        <CurrentIcon className="size-4" strokeWidth={1.5} />
      </button>
      {open ? (
        <div
          role="menu"
          className="border-cal-line absolute top-full left-0 z-30 mt-1.5 grid w-48 grid-cols-6 gap-1 rounded-xl border bg-background p-2 shadow-lg"
        >
          {ICON_OPTIONS.map((option) => {
            const on = option.key === value
            return (
              <button
                key={option.key}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                aria-label={option.label}
                onClick={() => {
                  onChange(option.key)
                  setOpen(false)
                }}
                className={cn(
                  'flex size-7 items-center justify-center rounded-full transition-colors',
                  on ? 'bg-foreground text-background' : 'text-muted-foreground active:bg-muted',
                )}
              >
                <option.Icon className="size-4" strokeWidth={1.5} />
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export function CountdownForm({
  defaults,
  categories,
  categoryIcons,
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
  const [lIsLeap, setLIsLeap] = useState(false)
  const [lDay, setLDay] = useState(todayLunar.day)
  const [time, setTime] = useState('')
  // 重复：频率 + 间隔 +（按周时）星期 + 结束日期
  const [freq, setFreq] = useState<RepeatFreq>('none')
  const [interval, setIntervalValue] = useState(1)
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [until, setUntil] = useState('')
  const [category, setCategory] = useState(categories[0] ?? '生活')
  const [newCategory, setNewCategory] = useState('')
  const [newCategoryIcon, setNewCategoryIcon] = useState(FALLBACK_ICON_KEY)
  const [categoryMessage, setCategoryMessage] = useState('')
  const [unit, setUnit] = useState<UnitChoice>('')
  const [inclusive, setInclusive] = useState(defaults.inclusive)
  const [precise, setPrecise] = useState<TriChoice>('')
  const [highlight, setHighlight] = useState(false)
  const [color, setColor] = useState('')
  const [icon, setIcon] = useState('')

  // 闰月不是每年都有：如果换了年份导致原来选的闰月不再存在，自动退回平月
  const yearLeapMonth = lunarLeapMonth(lYear)
  const safeIsLeap = lIsLeap && yearLeapMonth === lMonth
  const maxLunarDay = lunarMonthDays(lYear, lMonth, safeIsLeap)
  const safeLDay = Math.min(lDay, maxLunarDay)
  const startDate = useMemo(() => {
    if (calendar === 'lunar') return lunarToSolar(lYear, lMonth, safeLDay, safeIsLeap)
    const [y, m, d] = solar.split('-').map(Number)
    if (!y || !m || !d) return null
    return new Date(y, m - 1, d)
  }, [calendar, lYear, lMonth, safeIsLeap, safeLDay, solar])

  const repeatUnit = REPEAT_OPTIONS.find((o) => o.key === freq)?.unit ?? ''
  const effectiveUnit = unit || defaults.unit
  const canIncludeEndpoints = supportsInclusive(effectiveUnit)

  function toggleWeekday(day: number) {
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  /** 预览用的临时条目，直接复用库里的描述函数 */
  const draft = useMemo<Countdown | null>(() => {
    if (!startDate) return null
    const base =
      calendar === 'lunar'
        ? { year: lYear, month: lMonth, day: safeLDay, isLeap: safeIsLeap }
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
      repeat: {
        freq,
        interval,
        weekdays: freq === 'week' ? weekdays : undefined,
        until: freq !== 'none' ? until || undefined : undefined,
      },
      category,
    }
  }, [
    calendar,
    category,
    freq,
    interval,
    lMonth,
    lYear,
    safeIsLeap,
    safeLDay,
    startDate,
    time,
    title,
    until,
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
    if (!name) {
      setCategoryMessage('请输入分类名称')
      return
    }
    if (categories.includes(name)) {
      setCategory(name)
      setNewCategory('')
      setCategoryMessage('该分类已存在，已为你选中')
      return
    }
    onCreateCategory(name, newCategoryIcon)
    setCategory(name)
    setNewCategory('')
    setNewCategoryIcon(FALLBACK_ICON_KEY)
    setCategoryMessage(`已新建并选中“${name}”`)
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
        ...(freq !== 'none' && until ? { until } : {}),
      },
      category,
      ...(unit ? { unit } : {}),
      ...(canIncludeEndpoints && inclusive !== defaults.inclusive ? { inclusive } : {}),
      ...(precise ? { precise: precise === 'on' } : {}),
      ...(highlight ? { highlight } : {}),
      ...(color ? { color } : {}),
      ...(icon ? { icon } : {}),
    }
    if (calendar === 'lunar') {
      onSubmit({
        title: name,
        calendar,
        year: lYear,
        month: lMonth,
        day: safeLDay,
        ...(safeIsLeap ? { isLeap: true } : {}),
        ...extra,
      })
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
        <div className="border-cal-line flex flex-col gap-2 border-b py-4">
          <span className={cn(LABEL, 'w-auto')}>开始日期</span>
          <div className="flex min-w-0 items-center gap-2">
            <select
              value={lYear}
              onChange={(e) => setLYear(Number(e.target.value))}
              className={cn(FIELD, 'flex-[1.2] text-left tabular-nums')}
            >
              {Array.from({ length: 12 }, (_, i) => todayLunar.year - 1 + i).map((y) => (
                <option key={y} value={y}>
                  {y} 年
                </option>
              ))}
            </select>
            <select
              value={`${lMonth}${safeIsLeap ? 'L' : ''}`}
              onChange={(e) => {
                const isLeap = e.target.value.endsWith('L')
                setLMonth(Number.parseInt(e.target.value, 10))
                setLIsLeap(isLeap)
              }}
              className={cn(FIELD, 'text-left')}
            >
              {LUNAR_MONTH_NAMES.map((name, i) => {
                const month = i + 1
                return (
                  <Fragment key={name}>
                    <option value={month}>{name}</option>
                    {yearLeapMonth === month ? (
                      <option value={`${month}L`}>{`闰${name}`}</option>
                    ) : null}
                  </Fragment>
                )
              })}
            </select>
            <select
              value={safeLDay}
              onChange={(e) => setLDay(Number(e.target.value))}
              className={cn(FIELD, 'text-left')}
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

      {/* 时刻：留空为全天日期，并非 00:00 闹铃 */}
      <div className={ROW}>
        <span className={LABEL}>时间口径</span>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {!time ? (
            <span className="text-muted-foreground text-[0.9375rem] font-light">全天</span>
          ) : null}
          <input
            aria-label="指定时刻"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-[7.25rem] bg-transparent text-right text-[1.0625rem] font-light tabular-nums text-foreground outline-none"
          />
          {time ? (
            <button
              type="button"
              onClick={() => setTime('')}
              className="text-cal-faint shrink-0 text-[0.8125rem] font-light"
            >
              改为全天
            </button>
          ) : null}
        </div>
      </div>

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

      {/* 重复结束日期：留空为一直重复下去 */}
      {freq !== 'none' ? (
        <div className={ROW}>
          <span className={LABEL}>结束重复</span>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            {!until ? (
              <span className="text-muted-foreground text-[0.9375rem] font-light">永不</span>
            ) : null}
            <input
              aria-label="结束重复日期"
              type="date"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              className="w-[8.5rem] bg-transparent text-right text-[1.0625rem] font-light tabular-nums text-foreground outline-none"
            />
            {until ? (
              <button
                type="button"
                onClick={() => setUntil('')}
                className="text-cal-faint shrink-0 text-[0.8125rem] font-light"
              >
                改为永不
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* 分类：直接显示已有分类，新建后自动选中 */}
      <div className="border-cal-line flex flex-col gap-3 border-b py-4">
        <div className="flex items-center justify-between gap-3">
          <span className={LABEL}>分类</span>
          <span className="text-cal-faint text-[0.8125rem] font-light">当前：{category}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((name) => {
            const active = category === name
            const CategoryIcon = getIcon(categoryIcons[name])
            return (
              <button
                key={name}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setCategory(name)
                  setCategoryMessage('')
                }}
                className={cn(
                  'border-cal-line flex items-center gap-1 rounded-full border px-3 py-1 text-[0.8125rem] font-light transition-colors',
                  active
                    ? 'border-transparent bg-foreground text-background'
                    : 'text-muted-foreground',
                )}
              >
                <CategoryIcon className="size-3.5" strokeWidth={1.5} />
                {name}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2">
          <IconPickerButton value={newCategoryIcon} onChange={setNewCategoryIcon} />
          <input
            aria-label="新分类名称"
            value={newCategory}
            onChange={(e) => {
              setNewCategory(e.target.value)
              setCategoryMessage('')
            }}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing || e.keyCode === 229) return
              if (e.key === 'Enter') addCategory()
            }}
            placeholder="输入新分类，如：健身"
            className="border-cal-line min-w-0 flex-1 rounded-full border bg-transparent px-3 py-2 text-[0.9375rem] font-light text-foreground outline-none placeholder:text-cal-faint"
          />
          <button
            type="button"
            onClick={addCategory}
            className="border-cal-line text-muted-foreground shrink-0 rounded-full border px-3 py-2 text-[0.8125rem] font-light"
          >
            新建并选中
          </button>
        </div>
        {categoryMessage ? (
          <p role="status" className="text-cal-faint text-[0.8125rem] font-light">
            {categoryMessage}
          </p>
        ) : null}
      </div>

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

      {canIncludeEndpoints ? (
        <button
          type="button"
          onClick={() => setInclusive((v) => !v)}
          aria-pressed={inclusive}
          className="border-cal-line flex items-center justify-between gap-3 border-b py-4 text-left"
        >
          <span className="flex flex-col gap-0.5">
            <span className="text-[1.0625rem] font-light text-foreground">包含起止日期</span>
            <span className="text-cal-faint text-[0.8125rem] font-light">
              仅用于天、周、月等自然日口径，开启后多计一天
            </span>
          </span>
          <Switch on={inclusive} />
        </button>
      ) : (
        <div className="border-cal-line flex flex-col gap-0.5 border-b py-4">
          <span className="text-[1.0625rem] font-light text-foreground">按精确时刻计算</span>
          <span className="text-cal-faint text-[0.8125rem] font-light">
            小时、分钟、秒不使用“包含起止日期”
          </span>
        </div>
      )}

      {/* 精确到当前时刻：只对小时 / 分钟这类单位有意义，天数向来是按自然日算 */}
      {effectiveUnit === 'hour' || effectiveUnit === 'minute' ? (
        <label className={ROW}>
          <span className={LABEL}>精确时刻</span>
          <select
            value={precise}
            onChange={(e) => setPrecise(e.target.value as TriChoice)}
            className={FIELD}
          >
            <option value="">跟随默认（{defaults.precise ? '开' : '关'}）</option>
            <option value="on">开 · 精确到当前时刻</option>
            <option value="off">关 · 从今天 00:00 起算</option>
          </select>
        </label>
      ) : null}

      {/* 高亮突出：不改变排序，只在列表与日历里更醒目 */}
      <button
        type="button"
        onClick={() => setHighlight((v) => !v)}
        aria-pressed={highlight}
        className="border-cal-line flex items-center justify-between gap-3 border-b py-4 text-left"
      >
        <span className="flex flex-col gap-0.5">
          <span className="text-[1.0625rem] font-light text-foreground">高亮突出</span>
          <span className="text-cal-faint text-[0.8125rem] font-light">
            在列表与日历中更醒目地展示这一条
          </span>
        </span>
        <Switch on={highlight} />
      </button>

      {/* 颜色：条目专属强调色，用于列表标记点与日历圆点 */}
      <div className="border-cal-line flex items-center gap-3 border-b py-4">
        <span className={LABEL}>颜色</span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            aria-pressed={color === ''}
            aria-label="跟随默认颜色"
            onClick={() => setColor('')}
            className={cn(
              'border-cal-line flex size-7 shrink-0 items-center justify-center rounded-full border',
              color === '' ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background' : '',
            )}
          >
            {color === '' ? <Check className="text-foreground size-3.5" strokeWidth={2} /> : null}
          </button>
          {COLOR_OPTIONS.map((option) => {
            const on = color === option.key
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={on}
                aria-label={option.label}
                onClick={() => setColor(option.key)}
                style={{ backgroundColor: option.value }}
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full transition-transform',
                  on ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background' : '',
                )}
              >
                {on ? <Check className="size-3.5 text-background" strokeWidth={2} /> : null}
              </button>
            )
          })}
        </div>
      </div>

      {/* 图标：条目专属图标，不填则回退到所属分类的图标 */}
      <div className="border-cal-line flex flex-col gap-2.5 border-b py-4">
        <div className="flex items-center justify-between gap-3">
          <span className={LABEL}>图标</span>
          <span className="text-cal-faint text-[0.8125rem] font-light">
            不选则使用分类图标
          </span>
        </div>
        <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5">
          <button
            type="button"
            aria-pressed={icon === ''}
            onClick={() => setIcon('')}
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-full border text-[0.6875rem] font-light transition-colors',
              icon === ''
                ? 'border-transparent bg-foreground text-background'
                : 'border-cal-line text-muted-foreground',
            )}
          >
            <X className="size-4" strokeWidth={1.5} />
          </button>
          {ICON_OPTIONS.map((option) => {
            const on = icon === option.key
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={on}
                aria-label={option.label}
                onClick={() => setIcon(option.key)}
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors',
                  on
                    ? 'border-transparent bg-foreground text-background'
                    : 'border-cal-line text-muted-foreground',
                )}
              >
                <option.Icon className="size-4" strokeWidth={1.5} />
              </button>
            )
          })}
        </div>
      </div>

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
