'use client'

import { ChevronRight } from 'lucide-react'
import type { ResolvedCountdown } from '@/lib/countdown'
import { describeSource } from '@/lib/countdown'
import { cn } from '@/lib/utils'

type Props = {
  active?: ResolvedCountdown
  total: number
  onOpenAll: () => void
  onOpenSelect: () => void
  onOpenAdd: () => void
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

export function CountdownSummary({ active, total, onOpenAll, onOpenSelect, onOpenAdd }: Props) {
  const days = active ? Math.abs(active.days) : 0
  const passed = active ? active.days < 0 : false

  return (
    <section className="border-cal-line mt-2 border-t px-5">
      <div className="flex items-baseline justify-between pt-4">
        <h2 className="text-muted-foreground text-[0.8125rem] tracking-[0.2em]">倒数日</h2>
        <button
          type="button"
          onClick={onOpenAll}
          className="text-muted-foreground flex items-center gap-1 text-[0.8125rem] font-light"
        >
          全部 {total}
          <ChevronRight className="size-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {active ? (
        <div className="pt-1 pb-4">
          <div className="flex items-end gap-2">
            <span
              className={cn(
                'text-[4.5rem] leading-[0.95] font-extralight tracking-tighter tabular-nums',
                passed ? 'text-cal-faint' : 'text-foreground',
              )}
            >
              {days}
            </span>
            <span className="text-muted-foreground pb-2 text-[1rem] font-light">
              {passed ? '天前' : '天'}
            </span>
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
        <p className="text-muted-foreground py-6 text-[0.9375rem] font-light">
          还没有倒数日，添加一个开始计时
        </p>
      )}

      <Row label="切换目标" value={active?.item.title} onClick={onOpenSelect} />
      <Row label="添加倒数日" onClick={onOpenAdd} />
      <div className="border-cal-line border-t" />
    </section>
  )
}
