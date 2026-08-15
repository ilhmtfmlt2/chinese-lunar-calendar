'use client'

import { useMemo, useState } from 'react'
import type { CalendarType, Countdown, CountdownSettings, CountdownUnit } from '@/lib/countdown'
import { UNIT_OPTIONS, unitLabel } from '@/lib/countdown'
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
  onSubmit: (item: Omit<Countdown, 'id'>) => void
  onCancel: () => void
}

/** 空字符串代表跟随全局默认 */
type UnitChoice = CountdownUnit | ''

export function CountdownForm({ defaults, onSubmit, onCancel }: Props) {
  const today = useMemo(() => new Date(), [])
  const todayLunar = useMemo(() => getLunar(today), [today])

  const [calendar, setCalendar] = useState<CalendarType>('solar')
  const [title, setTitle] = useState('')
  const [repeat, setRepeat] = useState(false)
  // 新建时就能定这条倒数日的显示单位与起止口径
  const [unit, setUnit] = useState<UnitChoice>('')
  const [inclusive, setInclusive] = useState(defaults.inclusive)
  const [solar, setSolar] = useState(() => dateKey(today))
  const [lYear, setLYear] = useState(todayLunar.year)
  const [lMonth, setLMonth] = useState(todayLunar.month)
  const [lDay, setLDay] = useState(todayLunar.day)

  const maxLunarDay = lunarMonthDays(lYear, lMonth)
  const safeLDay = Math.min(lDay, maxLunarDay)
  const preview = useMemo(() => {
    if (calendar === 'lunar') {
      const target = lunarToSolar(lYear, lMonth, safeLDay)
      return `公历 ${dateKey(target)}`
    }
    const [y, m, d] = solar.split('-').map(Number)
    if (!y || !m || !d) return ''
    const l = getLunar(new Date(y, m - 1, d))
    return `农历 ${l.ganzhi}年 ${l.monthName}${l.dayName}`
  }, [calendar, lYear, lMonth, safeLDay, solar])

  function submit() {
    const name = title.trim()
    if (!name) return
    // 未选具体单位时不写入该字段，后续跟随设置里的默认值
    const extra = {
      repeat,
      ...(unit ? { unit } : {}),
      ...(inclusive === defaults.inclusive ? {} : { inclusive }),
    }
    if (calendar === 'lunar') {
      onSubmit({ title: name, calendar, year: lYear, month: lMonth, day: safeLDay, ...extra })
      return
    }
    const [y, m, d] = solar.split('-').map(Number)
    if (!y || !m || !d) return
    onSubmit({ title: name, calendar, year: y, month: m, day: d, ...extra })
  }

  return (
    <div className="flex flex-col px-5">
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

      <label className="border-cal-line flex items-center gap-4 border-b py-4">
        <span className="text-muted-foreground w-16 shrink-0 text-[0.9375rem] font-light">名称</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing || e.keyCode === 229) return
            if (e.key === 'Enter') submit()
          }}
          placeholder="如：生日、纪念日"
          className="placeholder:text-cal-faint flex-1 bg-transparent text-[1.0625rem] font-light text-foreground outline-none"
        />
      </label>

      {calendar === 'solar' ? (
        <label className="border-cal-line flex items-center gap-4 border-b py-4">
          <span className="text-muted-foreground w-16 shrink-0 text-[0.9375rem] font-light">
            公历日期
          </span>
          <input
            type="date"
            value={solar}
            onChange={(e) => setSolar(e.target.value)}
            className="flex-1 bg-transparent text-[1.0625rem] font-light tabular-nums text-foreground outline-none"
          />
        </label>
      ) : (
        <div className="border-cal-line flex items-center gap-4 border-b py-4">
          <span className="text-muted-foreground w-16 shrink-0 text-[0.9375rem] font-light">
            农历日期
          </span>
          <div className="flex flex-1 items-center gap-2">
            <select
              value={lYear}
              onChange={(e) => setLYear(Number(e.target.value))}
              className="flex-1 bg-transparent text-[1.0625rem] font-light tabular-nums text-foreground outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => todayLunar.year + i).map((y) => (
                <option key={y} value={y}>
                  {y} 年
                </option>
              ))}
            </select>
            <select
              value={lMonth}
              onChange={(e) => setLMonth(Number(e.target.value))}
              className="flex-1 bg-transparent text-[1.0625rem] font-light text-foreground outline-none"
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
              className="flex-1 bg-transparent text-[1.0625rem] font-light text-foreground outline-none"
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

      <button
        type="button"
        onClick={() => setRepeat((v) => !v)}
        aria-pressed={repeat}
        className="border-cal-line flex items-center justify-between border-b py-4"
      >
        <span className="text-[1.0625rem] font-light text-foreground">每年重复</span>
        <span
          className={cn(
            'relative h-6 w-11 rounded-full transition-colors',
            repeat ? 'bg-cal-accent' : 'bg-cal-line',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 size-5 rounded-full bg-background transition-[left] duration-200',
              repeat ? 'left-[1.375rem]' : 'left-0.5',
            )}
          />
        </span>
      </button>

      <p className="text-muted-foreground py-4 text-[0.8125rem] font-light tabular-nums">
        换算：{preview}
        {repeat ? ' · 每年自动顺延到下一次' : ''}
      </p>

      <div className="flex gap-3 pt-2">
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
