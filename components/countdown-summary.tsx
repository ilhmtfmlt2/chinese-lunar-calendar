'use client'

import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import { type CSSProperties, useEffect, useRef, useState } from 'react'
import type {
  CountdownDisplay,
  CountdownSettings,
  CountdownUnit,
  ResolvedCountdown,
} from '@/lib/countdown'
import { describeSource, UNIT_OPTIONS, unitLabel } from '@/lib/countdown'
import { cn } from '@/lib/utils'

type Props = {
  active?: ResolvedCountdown
  display?: CountdownDisplay
  /** 当前目标实际生效的单位与起止口径 */
  itemSettings: CountdownSettings
  total: number
  onChangeUnit: (unit: CountdownUnit) => void
  onToggleInclusive: () => void
  onOpenAll: () => void
  onOpenSelect: () => void
  onOpenAdd: () => void
}

/**
 * 大数字字号：以密度变量 --cal-big-fs 为基准，数字越长比例越小，
 * 避免「秒」这类大数值撑破排版。
 */
export function bigNumberStyle(value: string, scale = 1): CSSProperties {
  const ratio = value.length <= 3 ? 1 : value.length <= 5 ? 0.78 : value.length <= 8 ? 0.6 : 0.5
  return { fontSize: `calc(var(--cal-big-fs) * ${ratio * scale})` }
}

export function CountdownSummary({
  active,
  display,
  itemSettings,
  total,
  onChangeUnit,
  onToggleInclusive,
  onOpenAll,
  onOpenSelect,
  onOpenAdd,
}: Props) {
  const passed = display?.passed ?? false
  // 单位切换有自己的入口，不再借用设置页
  const [unitOpen, setUnitOpen] = useState(false)
  const unitAnchor = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!unitOpen) return
    function onPointerDown(e: PointerEvent) {
      if (!unitAnchor.current?.contains(e.target as Node)) setUnitOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setUnitOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [unitOpen])

  return (
    <section className="border-cal-line mt-2 border-t px-5">
      <div className="flex items-center justify-between gap-3 pt-[var(--cal-block-py)]">
        <h2 className="text-muted-foreground text-[length:var(--cal-label-fs)] tracking-[0.2em]">
          倒数日
        </h2>
        <div className="flex items-center gap-1">
          {/* 单位切换：自带下拉，与「设置」互不干扰 */}
          <div ref={unitAnchor} className="relative">
            <button
              type="button"
              onClick={() => setUnitOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={unitOpen}
              disabled={!active}
              aria-label={`显示单位：${unitLabel(itemSettings.unit)}`}
              className="border-cal-line text-muted-foreground flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[length:var(--cal-sub-fs)] font-light transition-colors active:bg-muted disabled:opacity-40"
            >
              {unitLabel(itemSettings.unit)}
              <ChevronDown
                className={cn('size-3 transition-transform', unitOpen && 'rotate-180')}
                strokeWidth={1.5}
              />
            </button>

            {unitOpen && (
              <div
                role="menu"
                aria-label="选择显示单位"
                className="border-cal-line absolute right-0 bottom-full z-30 mb-1.5 w-44 overflow-hidden rounded-xl border bg-background shadow-lg"
              >
                <p className="text-cal-faint border-cal-line truncate border-b px-3 py-1.5 text-[length:var(--cal-label-fs)]">
                  {active?.item.title} · 显示单位
                </p>
                {UNIT_OPTIONS.map((option) => {
                  const on = option.key === itemSettings.unit
                  return (
                    <button
                      key={option.key}
                      type="button"
                      role="menuitemradio"
                      aria-checked={on}
                      onClick={() => {
                        onChangeUnit(option.key)
                        setUnitOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 px-3 py-2 text-left text-[length:var(--cal-sub-fs)] font-light transition-colors active:bg-muted',
                        on ? 'text-cal-accent' : 'text-foreground',
                      )}
                    >
                      <span className="flex-1 truncate">{option.label}</span>
                      {on ? <Check className="size-3.5 shrink-0" strokeWidth={1.5} /> : null}
                    </button>
                  )
                })}
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={itemSettings.inclusive}
                  onClick={onToggleInclusive}
                  className="border-cal-line flex w-full items-center gap-2 border-t px-3 py-2 text-left text-[length:var(--cal-sub-fs)] font-light transition-colors active:bg-muted"
                >
                  <span
                    className={cn(
                      'flex-1 truncate',
                      itemSettings.inclusive ? 'text-cal-accent' : 'text-muted-foreground',
                    )}
                  >
                    包含起止日期
                  </span>
                  {itemSettings.inclusive ? (
                    <Check className="text-cal-accent size-3.5 shrink-0" strokeWidth={1.5} />
                  ) : null}
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onOpenAll}
            className="text-muted-foreground flex items-center gap-0.5 py-0.5 pl-2 text-[length:var(--cal-sub-fs)] font-light transition-colors active:text-foreground"
          >
            全部 {total}
            <ChevronRight className="size-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {active && display ? (
        <div className="pb-[var(--cal-block-py)]">
          <div className="flex flex-wrap items-end gap-x-2">
            <span
              style={bigNumberStyle(display.value)}
              className={cn(
                'leading-[0.95] font-extralight tracking-tighter tabular-nums',
                passed ? 'text-cal-faint' : 'text-foreground',
              )}
            >
              {display.value}
            </span>
            <span className="text-muted-foreground pb-1.5 text-[length:var(--cal-body-fs)] font-light">
              {display.unit}
              {passed ? '前' : ''}
            </span>
            {display.extra ? (
              <span className="text-muted-foreground pb-1.5 text-[length:var(--cal-sub-fs)] font-light tabular-nums">
                {display.extra}
              </span>
            ) : null}
          </div>

          {/* 目标名本身就是切换入口，不再单列一行「切换目标」 */}
          <button
            type="button"
            onClick={onOpenSelect}
            aria-haspopup="dialog"
            className="-mx-1.5 mt-[var(--cal-stack-gap)] flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-left transition-colors active:bg-muted"
          >
            <span className="text-muted-foreground shrink-0 text-[length:var(--cal-body-fs)] font-light">
              {passed ? '已过去' : '距离'}
            </span>
            <span className="min-w-0 truncate text-[length:var(--cal-body-fs)] text-foreground">
              {active.item.title}
            </span>
            <ChevronDown className="text-cal-faint size-4 shrink-0" strokeWidth={1.5} />
            <span className="sr-only">切换倒数日目标，共 {total} 个</span>
          </button>

          <p className="text-muted-foreground mt-0.5 text-[length:var(--cal-sub-fs)] font-light tabular-nums">
            {active.solarText} · {active.lunarText}
          </p>
          <p className="text-cal-faint text-[length:var(--cal-sub-fs)] font-light">
            {describeSource(active.item)}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpenAdd}
          className="text-muted-foreground w-full py-5 text-left text-[length:var(--cal-body-fs)] font-light transition-colors active:text-foreground"
        >
          还没有倒数日，点此添加一个开始计时
        </button>
      )}
    </section>
  )
}
