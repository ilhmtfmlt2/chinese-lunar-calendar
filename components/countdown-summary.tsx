'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import type { CountdownDisplay, ResolvedCountdown } from '@/lib/countdown'
import { describeSource } from '@/lib/countdown'
import { cn } from '@/lib/utils'

type Props = {
  active?: ResolvedCountdown
  display?: CountdownDisplay
  unitLabel: string
  total: number
  onOpenAll: () => void
  onOpenSelect: () => void
  onOpenAdd: () => void
  onOpenSettings: () => void
}

/** 数字越长字号越小，避免「秒」这类大数值撑破排版 */
export function bigNumberClass(value: string) {
  if (value.length <= 3) return 'text-[4.5rem]'
  if (value.length <= 5) return 'text-[3.5rem]'
  if (value.length <= 8) return 'text-[2.75rem]'
  return 'text-[2.25rem]'
}

function Row({
  label,
  value,
  onClick,
}: {
  label: string
  value?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-cal-line flex w-full items-center gap-3 border-t py-3.5 text-left transition-colors active:bg-muted/60"
    >
      <span className="text-[1.0625rem] font-light text-foreground">{label}</span>
      {value ? (
        <span className="text-muted-foreground ml-auto max-w-[9rem] truncate text-[0.9375rem] font-light">
          {value}
        </span>
      ) : (
        <span className="ml-auto" />
      )}
      <ChevronRight className="text-cal-faint size-4 shrink-0" strokeWidth={1.5} />
    </button>
  )
}

export function CountdownSummary({
  active,
  display,
  unitLabel,
  total,
  onOpenAll,
  onOpenSelect,
  onOpenAdd,
  onOpenSettings,
}: Props) {
  const passed = display?.passed ?? false

  return (
    <section className="border-cal-line mt-2 border-t px-5">
      <div className="flex items-center justify-between gap-3 pt-4">
        <h2 className="text-muted-foreground text-[0.8125rem] tracking-[0.2em]">倒数日</h2>
        <div className="flex items-center gap-1">
          {/* 单位切换：贴在标题行右侧，不再单独占一行 */}
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label={`显示单位：${unitLabel}`}
            className="border-cal-line text-muted-foreground flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.75rem] font-light transition-colors active:bg-muted"
          >
            {unitLabel}
            <ChevronDown className="size-3" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={onOpenAll}
            className="text-muted-foreground flex items-center gap-1 py-1 pl-2 text-[0.8125rem] font-light transition-colors active:text-foreground"
          >
            全部 {total}
            <ChevronRight className="size-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {active && display ? (
        <div className="pt-1 pb-4">
          <div className="flex flex-wrap items-end gap-x-2">
            <span
              className={cn(
                bigNumberClass(display.value),
                'leading-[0.95] font-extralight tracking-tighter tabular-nums',
                passed ? 'text-cal-faint' : 'text-foreground',
              )}
            >
              {display.value}
            </span>
            <span className="text-muted-foreground pb-2 text-[1rem] font-light">
              {display.unit}
              {passed ? '前' : ''}
            </span>
            {display.extra ? (
              <span className="text-muted-foreground pb-2 text-[0.9375rem] font-light tabular-nums">
                {display.extra}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-[1.0625rem] font-light text-foreground">
            {passed ? '已过去' : '距离'} {active.item.title}
          </p>
          <p className="text-muted-foreground mt-1 text-[0.8125rem] font-light tabular-nums">
            {active.solarText} · {active.lunarText}
          </p>
          <p className="text-cal-faint mt-0.5 text-[0.8125rem] font-light">
            {describeSource(active.item)}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpenAdd}
          className="text-muted-foreground w-full py-6 text-left text-[0.9375rem] font-light transition-colors active:text-foreground"
        >
          还没有倒数日，点此添加一个开始计时
        </button>
      )}

      <Row label="切换目标" value={active?.item.title} onClick={onOpenSelect} />
      <div className="border-cal-line border-t" />
    </section>
  )
}
