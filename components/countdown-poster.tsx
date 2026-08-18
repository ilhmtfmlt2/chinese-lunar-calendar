'use client'

import { ChevronLeft, Share2, SquarePen } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { bigNumberStyle } from '@/components/countdown-summary'
import {
  colorValue,
  describeRepeat,
  describeStart,
  type ResolvedCountdown,
} from '@/lib/countdown'
import { getIcon } from '@/lib/countdown-icons'
import { cn } from '@/lib/utils'

/** 展示页里数字点击可循环切换的几种口径 */
type PosterMode = 'compound' | 'clock' | 'monthday' | 'day'
const POSTER_MODES: PosterMode[] = ['compound', 'clock', 'monthday', 'day']

const pad = (n: number) => String(n).padStart(2, '0')

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function daysDiff(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

/** 两个日期之间的「几月几天」，用于「月天」口径 */
function monthsBetween(earlier: Date, later: Date) {
  let months = (later.getFullYear() - earlier.getFullYear()) * 12 + (later.getMonth() - earlier.getMonth())
  if (later.getDate() < earlier.getDate()) months--
  const anchor = new Date(earlier.getFullYear(), earlier.getMonth() + months, earlier.getDate())
  return { months, days: daysDiff(anchor, later) }
}

function formatPosterValue(mode: PosterMode, target: Date, now: Date) {
  const diff = target.getTime() - now.getTime()
  const passed = diff < 0
  const abs = Math.abs(diff)
  const totalSeconds = Math.floor(abs / 1000)
  const totalMinutes = Math.floor(totalSeconds / 60)
  const totalHours = Math.floor(totalMinutes / 60)
  const totalDays = Math.floor(totalHours / 24)

  switch (mode) {
    case 'clock':
      return `${totalHours}时${pad(totalMinutes % 60)}分${pad(totalSeconds % 60)}秒`
    case 'monthday': {
      const earlier = passed ? startOfDay(target) : startOfDay(now)
      const later = passed ? startOfDay(now) : startOfDay(target)
      const { months, days } = monthsBetween(earlier, later)
      return months > 0 ? `${months}月${days}天` : `${days}天`
    }
    case 'day':
      return `${totalDays}天`
    default:
      return `${totalDays}天${totalHours % 24}时${pad(totalMinutes % 60)}分${pad(totalSeconds % 60)}秒`
  }
}

/** 展示页副标题：日历类型 + 重复规则/开始日期 + 时刻 */
function posterSubtitle(item: ResolvedCountdown['item']) {
  const calPrefix = item.calendar === 'lunar' ? '农历' : ''
  const schedule =
    item.repeat.freq === 'none'
      ? describeStart(item).replace(/^(农历|公历)\s*/, '')
      : describeRepeat(item)
  return [`${calPrefix}${schedule}`, item.time].filter(Boolean).join(' ')
}

type Props = {
  /** 当前显示中的这一组倒数日，顺序需与「全部倒数日」列表一致 */
  list: ResolvedCountdown[]
  /** 打开展示页时应跳到的目标 id；为空表示展示页处于关闭状态 */
  openId?: string
  onClose: () => void
  /** 点击右上角「编辑」标志，跳转去修改这一条的详细信息 */
  onEdit: (id: string) => void
  /** 分类 → 图标 key，条目未设专属图标时回退到分类图标 */
  categoryIcons: Record<string, string>
}

export function CountdownPoster({ list, openId, onClose, onEdit, categoryIcons }: Props) {
  const open = Boolean(openId)
  const [index, setIndex] = useState(0)
  const [formatStep, setFormatStep] = useState(0)
  // 用固定的时间种子做初始值，确保服务端渲染与客户端首次渲染的文本完全一致，
  // 真实时间在挂载后的 effect 里再补上，避免水合期文本不匹配报错。
  const [now, setNow] = useState(() => new Date(0))
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  // 每次打开时，跳到目标在列表里的位置，数字口径回到默认（天时分秒）
  useEffect(() => {
    if (!openId) return
    const idx = list.findIndex((r) => r.item.id === openId)
    if (idx >= 0) setIndex(idx)
    setFormatStep(0)
  }, [openId, list])

  // 挂载后立即校正为真实时间（此更新发生在水合完成之后，不会触发文本不匹配报错），
  // 展示页打开时再逐秒刷新，保证秒级精确
  useEffect(() => {
    setNow(new Date())
    if (!open) return
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [open])

  const clampedIndex = list.length > 0 ? Math.min(index, list.length - 1) : 0
  const current = list[clampedIndex]
  const currentId = current?.item.id

  // 滑到不同目标时，数字口径回到默认（天时分秒）
  const lastFormatId = useRef(currentId)
  useEffect(() => {
    if (currentId !== lastFormatId.current) {
      setFormatStep(0)
      lastFormatId.current = currentId
    }
  }, [currentId])

  function shiftIndex(delta: number) {
    setIndex((i) => Math.min(list.length - 1, Math.max(0, i + delta)))
  }

  function handleShare() {
    if (!current) return
    const value = formatPosterValue(POSTER_MODES[formatStep], current.target, now)
    const passed = current.target.getTime() < now.getTime()
    const text = `${current.item.title}${passed ? '已过' : '还有'} ${value}`
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: current.item.title, text }).catch(() => {})
    }
  }

  // 关闭时完全不渲染，避免固定定位的覆盖层在宽视口下露出一角、贴在日历旁边
  if (!open || !current) return null

  const value = formatPosterValue(POSTER_MODES[formatStep], current.target, now)
  const passed = current.target.getTime() < now.getTime()
  const dotColor = colorValue(current.item.color)
  const Icon = getIcon(current.item.icon ?? categoryIcons[current.item.category])

  return (
    <div
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
          shiftIndex(dx < 0 ? 1 : -1)
        }
        touchStart.current = null
      }}
      className="animate-in fade-in fixed inset-0 z-40 mx-auto flex max-w-md flex-col bg-background duration-200"
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
        <span className="text-cal-faint flex-1 text-center text-[length:var(--cal-sub-fs)] font-light tabular-nums">
          {clampedIndex + 1} / {list.length}
        </span>
        <button
          type="button"
          onClick={() => currentId && onEdit(currentId)}
          aria-label="编辑这条倒数日"
          className="text-muted-foreground flex size-9 items-center justify-center rounded-full transition-colors active:bg-muted"
        >
          <SquarePen className="size-5" strokeWidth={1.5} />
        </button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-[var(--cal-stack-gap)] px-6 pb-16 text-center">
        <div className="flex items-center gap-1.5">
          {current.item.icon ? (
            <Icon
              style={dotColor ? { color: dotColor } : undefined}
              className={cn('size-4 shrink-0', !dotColor && 'text-cal-accent')}
              strokeWidth={1.75}
            />
          ) : current.item.highlight ? (
            <span
              aria-hidden
              style={dotColor ? { backgroundColor: dotColor } : undefined}
              className={cn('size-1.5 shrink-0 rounded-full', !dotColor && 'bg-cal-accent')}
            />
          ) : null}
          <p className="text-balance text-[length:var(--cal-body-fs)] font-light text-foreground">
            {current.item.title}
            {passed ? '已过' : '还有'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setFormatStep((s) => (s + 1) % POSTER_MODES.length)}
          aria-label="点击切换显示单位"
          className={cn(
            'max-w-full rounded-2xl px-2 py-1 leading-[0.95] font-extralight tracking-tighter tabular-nums transition-opacity active:opacity-60',
            passed ? 'text-cal-faint' : 'text-foreground',
          )}
          style={bigNumberStyle(value, 0.72)}
        >
          {value}
        </button>

        <p className="text-muted-foreground text-balance text-[length:var(--cal-sub-fs)] font-light tabular-nums">
          {posterSubtitle(current.item)}
        </p>
        <p className="text-cal-faint text-[length:var(--cal-sub-fs)] font-light tabular-nums">
          {current.solarText} · {current.lunarText}
        </p>
      </div>

      <div className="flex justify-end px-5 pb-6">
        <button
          type="button"
          onClick={handleShare}
          aria-label="分享"
          className="border-cal-line text-muted-foreground flex size-10 items-center justify-center rounded-full border transition-colors active:bg-muted"
        >
          <Share2 className="size-4.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}
