'use client'

import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ListOrdered,
  Plus,
  RotateCcw,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { CountdownForm } from '@/components/countdown-form'
import { CountdownPoster } from '@/components/countdown-poster'
import { bigNumberStyle } from '@/components/countdown-summary'
import {
  colorValue,
  COLOR_OPTIONS,
  type Countdown,
  type CountdownDisplay,
  type CountdownSettings,
  describeRepeat,
  describeStart,
  type ResolvedCountdown,
  resolveSettings,
  sortResolved,
  supportsInclusive,
  unitLabel,
} from '@/lib/countdown'
import { getIcon, ICON_OPTIONS } from '@/lib/countdown-icons'
import { getLunar } from '@/lib/lunar'
import { cn } from '@/lib/utils'

export type ScreenView = 'all' | 'select' | 'add' | 'detail' | 'categories' | 'reorder'

type Props = {
  view: ScreenView | null
  list: ResolvedCountdown[]
  activeId?: string
  detailId?: string
  onClose: () => void
  onOpenAdd: () => void
  onOpenCategories: () => void
  onOpenReorder: () => void
  onOpenDetail: (id: string) => void
  onPick: (id: string) => void
  onAdd: (item: Omit<Countdown, 'id'>) => void
  onRemove: (id: string) => void
  onFocusDate: (date: Date) => void
  /** 将选中的条目作为一组，整体上移 / 下移一位 */
  onMoveItems: (ids: string[], direction: 'up' | 'down') => void
  /** 恢复为按时间自动排序 */
  onResetOrder: () => void
  /** 列表排序方向切换 */
  onToggleSort: () => void
  /** 已有分类，用于筛选与新建 */
  categories: string[]
  /** 分类 → 图标 key */
  categoryIcons: Record<string, string>
  onCreateCategory: (name: string, icon: string) => void
  /** 修改已有分类的图标 */
  onSetCategoryIcon: (name: string, icon: string) => void
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
  categories: '管理分类',
  reorder: '整理顺序',
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
  onOpenCategories,
  onOpenReorder,
  onOpenDetail,
  onPick,
  onAdd,
  onRemove,
  onFocusDate,
  onMoveItems,
  onResetOrder,
  onToggleSort,
  categories,
  categoryIcons,
  onCreateCategory,
  onSetCategoryIcon,
  settings,
  format,
}: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  // 「全部倒数日」点进去先看展示页（大图+跑秒），编辑图标才去下面的详情/编辑
  const [posterId, setPosterId] = useState<string>()
  const [categoryName, setCategoryName] = useState('')
  const [newCategoryIcon, setNewCategoryIcon] = useState(ICON_OPTIONS[ICON_OPTIONS.length - 1].key)
  const [iconEditFor, setIconEditFor] = useState<string | null>(null)
  const [categoryMessage, setCategoryMessage] = useState('')
  // 分类筛选，空表示全部
  const [filter, setFilter] = useState<string | null>(null)
  // 排序界面：选中待整体上移/下移的条目
  const [reorderSelection, setReorderSelection] = useState<string[]>([])
  const visible = filter ? list.filter((r) => r.item.category === filter) : list
  const sorted = sortResolved(visible, settings.sortOrder)
  const detail = list.find((r) => r.item.id === detailId)
  const detailDisplay = detail ? format(detail) : undefined

  useEffect(() => {
    if (view === 'reorder') setReorderSelection([])
  }, [view])
  const detailSettings = detail ? resolveSettings(detail.item, settings) : undefined

  return (
    <>
    <div
      aria-hidden={!view}
      inert={!view}
      className={cn(
        'fixed inset-0 z-30 mx-auto flex max-w-md flex-col bg-background transition-transform duration-300 ease-out',
        // 用 100vw（而非自身宽度的 translate-x-full）位移，确保宽屏下也能完全移出可见区域，
        // 不会在收起状态下贴着主日历露出一角
        view ? 'translate-x-0' : 'pointer-events-none translate-x-[100vw]',
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
            categoryIcons={categoryIcons}
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
              {view === 'all' ? (
                <button
                  type="button"
                  onClick={onOpenCategories}
                  className="text-muted-foreground shrink-0 text-[length:var(--cal-label-fs)] font-light"
                >
                  管理
                </button>
              ) : null}
              {view === 'all' ? (
                <button
                  type="button"
                  onClick={onOpenReorder}
                  className="text-muted-foreground flex shrink-0 items-center gap-0.5 text-[length:var(--cal-label-fs)] font-light"
                >
                  <ListOrdered className="size-3.5" strokeWidth={1.5} />
                  排序
                </button>
              ) : null}
              {settings.sortOrder === 'custom' ? (
                <button
                  type="button"
                  onClick={onResetOrder}
                  className="text-cal-accent flex shrink-0 items-center gap-0.5 text-[length:var(--cal-label-fs)] font-light"
                >
                  <RotateCcw className="size-3.5" strokeWidth={1.5} />
                  自定义
                </button>
              ) : (
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
              )}
            </div>

            <ul className="px-5">
            {sorted.length === 0 ? (
              <li className="text-muted-foreground py-10 text-center text-[0.9375rem] font-light">
                暂无倒数日
              </li>
            ) : null}
            {sorted.map((r) => {
              const isActive = r.item.id === activeId
              const dotColor = colorValue(r.item.color)
              const Icon = getIcon(r.item.icon ?? categoryIcons[r.item.category])
              return (
                <li key={r.item.id} className="border-cal-line border-b">
                  <button
                    type="button"
                    onClick={() =>
                      view === 'select' ? onPick(r.item.id) : setPosterId(r.item.id)
                    }
                    className="flex w-full items-center gap-3 py-[var(--cal-row-py)] text-left transition-colors active:bg-muted/60"
                  >
                    <Icon
                      style={dotColor ? { color: dotColor } : undefined}
                      className={cn('size-4 shrink-0', !dotColor && 'text-muted-foreground')}
                      strokeWidth={1.5}
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'truncate text-[length:var(--cal-body-fs)] text-foreground',
                            r.item.highlight ? 'font-normal' : 'font-light',
                          )}
                        >
                          {r.item.title}
                        </span>
                        {r.item.highlight ? (
                          <span
                            aria-hidden
                            style={dotColor ? { backgroundColor: dotColor } : undefined}
                            className={cn(
                              'size-1.5 shrink-0 rounded-full',
                              !dotColor && 'bg-cal-accent',
                            )}
                          />
                        ) : null}
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

        {view === 'categories' ? (
          <div className="flex flex-col px-5 pb-6">
            <p className="text-muted-foreground py-4 text-[0.875rem] leading-relaxed font-light">
              分类用于筛选倒数日。点击图标可单独修改，新建的分类会立即出现在添加表单和列表筛选中。
            </p>
            <ul className="border-cal-line border-t">
              {categories.map((name) => {
                const count = list.filter((entry) => entry.item.category === name).length
                const CategoryIcon = getIcon(categoryIcons[name])
                const editing = iconEditFor === name
                return (
                  <li key={name} className="border-cal-line border-b">
                    <div className="flex items-center justify-between gap-3 py-3.5">
                      <button
                        type="button"
                        onClick={() => setIconEditFor(editing ? null : name)}
                        aria-expanded={editing}
                        aria-label={`修改「${name}」的图标`}
                        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                      >
                        <span className="border-cal-line text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full border">
                          <CategoryIcon className="size-4" strokeWidth={1.5} />
                        </span>
                        <span className="truncate text-[1rem] font-light text-foreground">
                          {name}
                        </span>
                      </button>
                      <span className="text-cal-faint shrink-0 text-[0.8125rem] font-light">
                        {count} 个倒数日
                      </span>
                    </div>
                    {editing ? (
                      <div className="flex flex-wrap gap-1.5 pb-3.5">
                        {ICON_OPTIONS.map((option) => {
                          const on = categoryIcons[name] === option.key
                          return (
                            <button
                              key={option.key}
                              type="button"
                              aria-pressed={on}
                              aria-label={option.label}
                              onClick={() => onSetCategoryIcon(name, option.key)}
                              className={cn(
                                'flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors',
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
                    ) : null}
                  </li>
                )
              })}
            </ul>
            <div className="flex flex-col gap-2.5 py-5">
              <div className="flex flex-wrap gap-1.5">
                {ICON_OPTIONS.map((option) => {
                  const on = newCategoryIcon === option.key
                  return (
                    <button
                      key={option.key}
                      type="button"
                      aria-pressed={on}
                      aria-label={option.label}
                      onClick={() => setNewCategoryIcon(option.key)}
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors',
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
              <div className="flex items-center gap-2">
                <input
                  aria-label="新分类名称"
                  value={categoryName}
                  onChange={(event) => {
                    setCategoryName(event.target.value)
                    setCategoryMessage('')
                  }}
                  onKeyDown={(event) => {
                    if (event.nativeEvent.isComposing || event.keyCode === 229) return
                    if (event.key !== 'Enter') return
                    const name = categoryName.trim()
                    if (!name) return setCategoryMessage('请输入分类名称')
                    if (categories.includes(name)) return setCategoryMessage('该分类已存在')
                    onCreateCategory(name, newCategoryIcon)
                    setCategoryName('')
                    setCategoryMessage(`已新建“${name}”`)
                  }}
                  placeholder="输入新分类，如：健身"
                  className="border-cal-line min-w-0 flex-1 rounded-full border bg-transparent px-3 py-2.5 text-[0.9375rem] font-light text-foreground outline-none placeholder:text-cal-faint"
                />
                <button
                  type="button"
                  onClick={() => {
                    const name = categoryName.trim()
                    if (!name) return setCategoryMessage('请输入分类名称')
                    if (categories.includes(name)) return setCategoryMessage('该分类已存在')
                    onCreateCategory(name, newCategoryIcon)
                    setCategoryName('')
                    setCategoryMessage(`已新建“${name}”`)
                  }}
                  className="border-cal-line shrink-0 rounded-full border px-4 py-2.5 text-[0.875rem] font-light text-foreground"
                >
                  新建
                </button>
              </div>
            </div>
            {categoryMessage ? (
              <p role="status" className="text-cal-faint text-[0.8125rem] font-light">
                {categoryMessage}
              </p>
            ) : null}
          </div>
        ) : null}

        {view === 'reorder' ? (
          <div className="flex flex-col">
            <p className="text-muted-foreground px-5 py-4 text-[0.875rem] leading-relaxed font-light">
              勾选后用「上移 / 下移」整体调整顺序；排好的顺序会替代按时间自动排序。
            </p>
            <div className="border-cal-line flex items-center justify-between gap-3 border-y px-5 py-2.5">
              <span className="text-cal-faint text-[0.8125rem] font-light">
                {reorderSelection.length > 0 ? `已选 ${reorderSelection.length} 项` : '未选择'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={reorderSelection.length === 0}
                  onClick={() => onMoveItems(reorderSelection, 'up')}
                  aria-label="上移所选"
                  className="border-cal-line text-foreground flex size-8 items-center justify-center rounded-full border disabled:opacity-30"
                >
                  <ChevronUp className="size-4" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  disabled={reorderSelection.length === 0}
                  onClick={() => onMoveItems(reorderSelection, 'down')}
                  aria-label="下移所选"
                  className="border-cal-line text-foreground flex size-8 items-center justify-center rounded-full border disabled:opacity-30"
                >
                  <ChevronDown className="size-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
            <ul className="px-5">
              {list.map((r) => {
                const checked = reorderSelection.includes(r.item.id)
                const Icon = getIcon(r.item.icon ?? categoryIcons[r.item.category])
                return (
                  <li key={r.item.id} className="border-cal-line border-b">
                    <button
                      type="button"
                      onClick={() =>
                        setReorderSelection((prev) =>
                          checked ? prev.filter((id) => id !== r.item.id) : [...prev, r.item.id],
                        )
                      }
                      aria-pressed={checked}
                      className="flex w-full items-center gap-3 py-3 text-left"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                          checked
                            ? 'border-transparent bg-foreground text-background'
                            : 'border-cal-line text-transparent',
                        )}
                      >
                        <Check className="size-3.5" strokeWidth={2} />
                      </span>
                      <Icon className="text-muted-foreground size-4 shrink-0" strokeWidth={1.5} />
                      <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-light text-foreground">
                        {r.item.title}
                      </span>
                      <span className="text-cal-faint shrink-0 text-[length:var(--cal-label-fs)] font-light">
                        {r.item.category}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}

        {view === 'detail' && detail ? (
          <div className="px-5">
            <div className="border-cal-line flex flex-col gap-2 border-b py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-[1.125rem] font-light text-foreground">
                  {detail.item.title}
                </p>
                <span className="text-cal-faint shrink-0 text-[0.75rem] font-light">
                  {detailDisplay?.passed ? '已过去' : '倒计时中'}
                </span>
              </div>
              <div className="flex min-h-12 flex-wrap items-end gap-x-2">
                <span
                  style={bigNumberStyle(detailDisplay?.value ?? '', 0.58)}
                  aria-live="off"
                  className={cn(
                    'leading-none font-extralight tracking-tighter tabular-nums',
                    detailDisplay?.passed ? 'text-cal-faint' : 'text-foreground',
                  )}
                >
                  {detailDisplay?.value}
                </span>
                <span className="text-muted-foreground pb-1 text-[1rem] font-light">
                  {detailDisplay?.unit}
                  {detailDisplay?.passed ? '前' : ''}
                </span>
                {detailDisplay?.extra ? (
                  <span className="text-muted-foreground pb-1 text-[0.9375rem] font-light tabular-nums">
                    {detailDisplay.extra}
                  </span>
                ) : null}
              </div>
            </div>

            <dl className="text-[0.9375rem] font-light">
              {[
                ['日历类型', detail.item.calendar === 'lunar' ? '农历' : '公历'],
                ['开始日期', describeStart(detail.item)],
                ['重复', describeRepeat(detail.item)],
                ['时间口径', detail.item.time ? `指定时刻 ${detail.item.time}` : '全天'],
                ['分类', detail.item.category],
                ['下一次（公历）', detail.solarText],
                ['农历日期', detail.lunarText],
                ['星期', ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][detail.target.getDay()]],
                ['节日 / 节气', getLunar(detail.target).highlight ? getLunar(detail.target).label : '—'],
                ['高亮突出', detail.item.highlight ? '是' : '否'],
                [
                  '颜色',
                  detail.item.color
                    ? (COLOR_OPTIONS.find((c) => c.key === detail.item.color)?.label ?? '默认')
                    : '默认',
                ],
                ['图标', detail.item.icon ? '已自定义' : `跟随分类「${detail.item.category}」`],
                [
                  '显示单位',
                  detail.item.unit
                    ? unitLabel(detail.item.unit)
                    : `${unitLabel(settings.unit)}（跟随默认）`,
                ],
                [
                  '计算口径',
                  detailSettings && supportsInclusive(detailSettings.unit)
                    ? detailSettings.inclusive
                      ? '自然日 · 包含起止日期'
                      : '自然日 · 不包含起止日期'
                    : detailSettings?.precise
                      ? '精确到当前时刻'
                      : '目标时刻 · 精确计算',
                ],
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

    <CountdownPoster
      list={sorted}
      openId={posterId}
      onClose={() => setPosterId(undefined)}
      onEdit={(id) => {
        setPosterId(undefined)
        onOpenDetail(id)
      }}
      categoryIcons={categoryIcons}
    />
    </>
  )
}
