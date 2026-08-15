'use client'

import { Check, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { CountdownForm } from '@/components/countdown-form'
import type { Countdown, ResolvedCountdown } from '@/lib/countdown'
import { describeSource, sortResolved } from '@/lib/countdown'
import { getLunar } from '@/lib/lunar'
import { cn } from '@/lib/utils'

export type ScreenView = 'all' | 'select' | 'add' | 'detail'

type Props = {
  view: ScreenView | null
  list: ResolvedCountdown[]
  activeId?: string
  detailId?: string
  onClose: () => void
  onOpenAdd: () => void
  onOpenDetail: (id: string) => void
  onPick: (id: string) => void
  onAdd: (item: Omit<Countdown, 'id'>) => void
  onRemove: (id: string) => void
  onFocusDate: (date: Date) => void
}

const TITLES: Record<ScreenView, string> = {
  all: '全部倒数日',
  select: '选择目标',
  add: '添加倒数日',
  detail: '倒数日详情',
}

function DaysBadge({ days }: { days: number }) {
  const passed = days < 0
  return (
    <span className="flex shrink-0 items-baseline gap-1">
      <span
        className={cn(
          'text-[1.5rem] leading-none font-extralight tabular-nums',
          passed ? 'text-cal-faint' : 'text-foreground',
        )}
      >
        {Math.abs(days)}
      </span>
      <span className="text-cal-faint text-[0.75rem] font-light">{passed ? '天前' : '天'}</span>
    </span>
  )
}

export function CountdownScreen({
  view,
  list,
  activeId,
  detailId,
  onClose,
  onOpenAdd,
  onOpenDetail,
  onPick,
  onAdd,
  onRemove,
  onFocusDate,
}: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const sorted = sortResolved(list)
  const detail = list.find((r) => r.item.id === detailId)

  return (
    <div
      aria-hidden={!view}
      className={cn(
        'fixed inset-0 z-30 mx-auto flex max-w-md flex-col bg-background transition-transform duration-300 ease-out',
        view ? 'translate-x-0' : 'pointer-events-none translate-x-full',
      )}
    >
      <header className="border-cal-line flex items-center border-b px-2 py-3">
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground flex items-center gap-0.5 rounded-full py-1 pr-3 pl-1 text-[1.0625rem] font-light transition-colors active:bg-muted"
        >
          <ChevronLeft className="size-6" strokeWidth={1.25} />
          日历
        </button>
        <h2 className="flex-1 text-center text-[1.0625rem] font-light text-foreground">
          {view ? TITLES[view] : ''}
        </h2>
        <div className="w-[4.5rem]">
          {view === 'all' ? (
            <button
              type="button"
              onClick={onOpenAdd}
              aria-label="添加倒数日"
              className="text-muted-foreground ml-auto flex size-9 items-center justify-center rounded-full transition-colors active:bg-muted"
            >
              <Plus className="size-5" strokeWidth={1.5} />
            </button>
          ) : null}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {view === 'add' ? (
          <CountdownForm
            onSubmit={(item) => {
              onAdd(item)
              onClose()
            }}
            onCancel={onClose}
          />
        ) : null}

        {view === 'select' || view === 'all' ? (
          <ul className="px-5">
            {sorted.length === 0 ? (
              <li className="text-muted-foreground py-10 text-center text-[0.9375rem] font-light">
                暂无倒数日
              </li>
            ) : null}
            {sorted.map((r) => {
              const isActive = r.item.id === activeId
              return (
                <li key={r.item.id} className="border-cal-line border-b">
                  <button
                    type="button"
                    onClick={() =>
                      view === 'select' ? onPick(r.item.id) : onOpenDetail(r.item.id)
                    }
                    className="flex w-full items-center gap-3 py-4 text-left transition-colors active:bg-muted/60"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[1.0625rem] font-light text-foreground">
                          {r.item.title}
                        </span>
                        <span className="text-cal-faint shrink-0 text-[0.6875rem]">
                          {r.item.calendar === 'lunar' ? '农历' : '公历'}
                        </span>
                      </span>
                      <span className="text-muted-foreground truncate text-[0.8125rem] font-light tabular-nums">
                        {r.solarText} · {r.lunarText}
                      </span>
                    </span>
                    <DaysBadge days={r.days} />
                    {view === 'select' ? (
                      isActive ? (
                        <Check className="text-cal-accent size-5 shrink-0" strokeWidth={1.5} />
                      ) : (
                        <span className="size-5 shrink-0" />
                      )
                    ) : (
                      <ChevronRight className="text-cal-faint size-4 shrink-0" strokeWidth={1.5} />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : null}

        {view === 'detail' && detail ? (
          <div className="px-5">
            <div className="border-cal-line flex flex-col items-start border-b py-8">
              <p className="text-muted-foreground text-[0.8125rem] tracking-[0.2em]">
                {detail.days < 0 ? '已过去' : '还有'}
              </p>
              <div className="mt-1 flex items-end gap-2">
                <span
                  className={cn(
                    'text-[6rem] leading-[0.9] font-extralight tracking-tighter tabular-nums',
                    detail.days < 0 ? 'text-cal-faint' : 'text-foreground',
                  )}
                >
                  {Math.abs(detail.days)}
                </span>
                <span className="text-muted-foreground pb-3 text-[1.125rem] font-light">天</span>
              </div>
              <p className="mt-2 text-[1.375rem] font-light text-foreground">{detail.item.title}</p>
            </div>

            <dl className="text-[0.9375rem] font-light">
              {[
                ['日历类型', detail.item.calendar === 'lunar' ? '农历' : '公历'],
                ['录入目标', describeSource(detail.item)],
                ['公历日期', detail.solarText],
                ['农历日期', detail.lunarText],
                ['星期', ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][detail.target.getDay()]],
                ['节日 / 节气', getLunar(detail.target).highlight ? getLunar(detail.target).label : '—'],
                ['每年重复', detail.item.repeat ? '是' : '否'],
              ].map(([k, v]) => (
                <div key={k} className="border-cal-line flex items-center justify-between border-b py-3.5">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="tabular-nums text-foreground">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-col gap-3 py-6">
              <button
                type="button"
                onClick={() => {
                  onFocusDate(detail.target)
                  onClose()
                }}
                className="border-cal-line h-11 rounded-full border text-[1.0625rem] font-light text-foreground transition-colors active:bg-muted"
              >
                在月历中查看
              </button>
              {confirmId === detail.item.id ? (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    className="border-cal-line h-11 flex-1 rounded-full border text-[1.0625rem] font-light text-muted-foreground"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRemove(detail.item.id)
                      setConfirmId(null)
                    }}
                    className="bg-cal-accent h-11 flex-1 rounded-full text-[1.0625rem] font-light text-background"
                  >
                    确认删除
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmId(detail.item.id)}
                  className="text-cal-accent h-11 text-[1.0625rem] font-light"
                >
                  删除倒数日
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
