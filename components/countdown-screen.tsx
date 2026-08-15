'use client'

import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Check,
  ChevronLeft,
  ChevronRight,
  Pin,
  Plus,
} from 'lucide-react'
import { useState } from 'react'
import { CountdownForm } from '@/components/countdown-form'
import { bigNumberStyle } from '@/components/countdown-summary'
import type {
  Countdown,
  CountdownDisplay,
  CountdownSettings,
  ResolvedCountdown,
} from '@/lib/countdown'
import {
  describeRepeat,
  describeStart,
  resolveSettings,
  sortResolved,
  unitLabel,
} from '@/lib/countdown'
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
  /** 切换置顶 */
  onTogglePin: (id: string) => void
  /** 列表排序方向切换 */
  onToggleSort: () => void
  /** 已有分类，用于筛选与新建 */
  categories: string[]
  onCreateCategory: (name: string) => void
  /** 全局默认单位与起止口径，新建表单与详情用它显示「跟随默认」 */
  settings: CountdownSettings
  /** 按当前显示单位换算 */
  format: (item: ResolvedCountdown) => CountdownDisplay
}

const TITLES: Record<ScreenView, string> = {
  all: '全部倒数日',
  select: '选择目标',
  add: '添加倒数日',
  detail: '倒数日详情',
}

function UnitBadge({ display }: { display: CountdownDisplay }) {
  return (
    <span className="flex max-w-[8.5rem] shrink-0 flex-col items-end">
      <span className="flex items-baseline gap-1">
        <span
          className={cn(
            'leading-none font-extralight tabular-nums',
            display.value.length > 6 ? 'text-[1.125rem]' : 'text-[1.5rem]',
            display.passed ? 'text-cal-faint' : 'text-foreground',
          )}
        >
          {display.value}
        </span>
        <span className="text-cal-faint text-[0.75rem] font-light">
          {display.unit}
          {display.passed ? '前' : ''}
        </span>
      </span>
      {display.extra ? (
        <span className="text-cal-faint text-[0.75rem] font-light tabular-nums">
          {display.extra}
        </span>
      ) : null}
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
  onTogglePin,
  onToggleSort,
  categories,
  onCreateCategory,
  settings,
  format,
}: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  // 分类筛选，空表示全部
  const [filter, setFilter] = useState<string | null>(null)
  const visible = filter ? list.filter((r) => r.item.category === filter) : list
  const sorted = sortResolved(visible, settings.sortOrder)
  const detail = list.find((r) => r.item.id === detailId)
  const detailDisplay = detail ? format(detail) : undefined
  const detailSettings = detail ? resolveSettings(detail.item, settings) : undefined

  return (
    <div
      aria-hidden={!view}
      inert={!view}
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
            defaults={settings}
            categories={categories}
            onCreateCategory={onCreateCategory}
            onSubmit={(item) => {
              onAdd(item)
              onClose()
            }}
            onCancel={onClose}
          />
        ) : null}

        {view === 'select' || view === 'all' ? (
          <>
            {/* 分类筛选 + 排序方向 */}
            <div className="border-cal-line flex items-center gap-2 border-b px-5 py-2.5">
              <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
                {[null, ...categories].map((name) => {
                  const on = filter === name
                  return (
                    <button
                      key={name ?? 'all'}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setFilter(name)}
                      className={cn(
                        'border-cal-line shrink-0 rounded-full border px-2.5 py-0.5 text-[length:var(--cal-label-fs)] font-light transition-colors',
                        on
                          ? 'border-transparent bg-foreground text-background'
                          : 'text-muted-foreground',
                      )}
                    >
                      {name ?? '全部'}
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={onToggleSort}
                className="text-muted-foreground flex shrink-0 items-center gap-0.5 text-[length:var(--cal-label-fs)] font-light"
              >
                {settings.sortOrder === 'asc' ? (
                  <ArrowUpNarrowWide className="size-3.5" strokeWidth={1.5} />
                ) : (
                  <ArrowDownWideNarrow className="size-3.5" strokeWidth={1.5} />
                )}
                {settings.sortOrder === 'asc' ? '正序' : '倒序'}
              </button>
            </div>

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
                    className="flex w-full items-center gap-3 py-[var(--cal-row-py)] text-left transition-colors active:bg-muted/60"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-center gap-1.5">
                        {r.item.pinned ? (
                          <Pin
                            className="text-cal-accent size-3.5 shrink-0"
                            strokeWidth={1.5}
                            aria-label="已置顶"
                          />
                        ) : null}
                        <span className="truncate text-[length:var(--cal-body-fs)] font-light text-foreground">
                          {r.item.title}
                        </span>
                        <span className="text-cal-faint shrink-0 text-[length:var(--cal-label-fs)]">
                          {r.item.calendar === 'lunar' ? '农历' : '公历'}
                        </span>
                      </span>
                      <span className="text-muted-foreground truncate text-[length:var(--cal-sub-fs)] font-light tabular-nums">
                        {r.solarText} · {r.item.category}
                        {r.item.repeat.freq === 'none' ? '' : ` · ${describeRepeat(r.item)}`}
                      </span>
                    </span>
                    <UnitBadge display={format(r)} />
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
          </>
        ) : null}

        {view === 'detail' && detail ? (
          <div className="px-5">
            <div className="border-cal-line flex flex-col items-start border-b py-8">
              <p className="text-muted-foreground text-[0.8125rem] tracking-[0.2em]">
                {detailDisplay?.passed ? '已过去' : '还有'}
              </p>
              <div className="mt-1 flex flex-wrap items-end gap-x-2">
                <span
                  style={bigNumberStyle(detailDisplay?.value ?? '')}
                  className={cn(
                    'leading-[0.9] font-extralight tracking-tighter tabular-nums',
                    detailDisplay?.passed ? 'text-cal-faint' : 'text-foreground',
                  )}
                >
                  {detailDisplay?.value}
                </span>
                <span className="text-muted-foreground pb-2 text-[1.125rem] font-light">
                  {detailDisplay?.unit}
                </span>
                {detailDisplay?.extra ? (
                  <span className="text-muted-foreground pb-2 text-[1rem] font-light tabular-nums">
                    {detailDisplay.extra}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-[1.375rem] font-light text-foreground">{detail.item.title}</p>
            </div>

            <dl className="text-[0.9375rem] font-light">
              {[
                ['日历类型', detail.item.calendar === 'lunar' ? '农历' : '公历'],
                ['开始日期', describeStart(detail.item)],
                ['重复', describeRepeat(detail.item)],
                ['时刻', detail.item.time ?? '整天（00:00）'],
                ['分类', detail.item.category],
                ['下一次（公历）', detail.solarText],
                ['农历日期', detail.lunarText],
                ['星期', ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][detail.target.getDay()]],
                ['节日 / 节气', getLunar(detail.target).highlight ? getLunar(detail.target).label : '—'],
                ['置顶', detail.item.pinned ? '是' : '否'],
                [
                  '显示单位',
                  detail.item.unit
                    ? unitLabel(detail.item.unit)
                    : `${unitLabel(settings.unit)}（跟随默认）`,
                ],
                ['包含起止日期', detailSettings?.inclusive ? '是' : '否'],
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
                onClick={() => onTogglePin(detail.item.id)}
                aria-pressed={Boolean(detail.item.pinned)}
                className={cn(
                  'flex h-11 items-center justify-center gap-1.5 rounded-full border text-[1.0625rem] font-light transition-colors',
                  detail.item.pinned
                    ? 'border-transparent bg-foreground text-background'
                    : 'border-cal-line text-foreground active:bg-muted',
                )}
              >
                <Pin className="size-4" strokeWidth={1.5} />
                {detail.item.pinned ? '取消置顶' : '置顶到首页'}
              </button>
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
