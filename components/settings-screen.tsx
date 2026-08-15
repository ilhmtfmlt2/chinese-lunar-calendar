'use client'

import { Check, ChevronLeft } from 'lucide-react'
import type { CountdownSettings, CountdownUnit } from '@/lib/countdown'
import { UNIT_OPTIONS } from '@/lib/countdown'
import { cn } from '@/lib/utils'

export type SettingsView = 'settings' | 'about'

type Props = {
  view: SettingsView | null
  settings: CountdownSettings
  /** 返回按钮文案：日历 或 设置 */
  backLabel: string
  onChangeUnit: (unit: CountdownUnit) => void
  onTogglePrecise: () => void
  onOpenAbout: () => void
  onClose: () => void
}

const TITLES: Record<SettingsView, string> = { settings: '设置', about: '关于' }

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

export function SettingsScreen({
  view,
  settings,
  backLabel,
  onChangeUnit,
  onTogglePrecise,
  onOpenAbout,
  onClose,
}: Props) {
  const open = view !== null

  return (
    <div
      aria-hidden={!open}
      inert={!open}
      className={cn(
        'fixed inset-0 z-40 mx-auto flex max-w-md flex-col bg-background transition-transform duration-300 ease-out',
        open ? 'translate-x-0' : 'pointer-events-none translate-x-full',
      )}
    >
      <header className="border-cal-line flex items-center border-b px-2 py-3">
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground flex items-center gap-0.5 rounded-full py-1 pr-3 pl-1 text-[1.0625rem] font-light transition-colors active:bg-muted"
        >
          <ChevronLeft className="size-6" strokeWidth={1.25} />
          {backLabel}
        </button>
        <h2 className="flex-1 text-center text-[1.0625rem] font-light text-foreground">
          {view ? TITLES[view] : ''}
        </h2>
        <div className="w-[4.5rem]" />
      </header>

      <div className="flex-1 overflow-y-auto">
        {view === 'settings' ? (
          <div className="px-5">
            <h3 className="text-muted-foreground pt-6 pb-2 text-[0.8125rem] tracking-[0.2em]">
              倒数日显示单位
            </h3>
            <ul>
              {UNIT_OPTIONS.map((option) => {
                const active = option.key === settings.unit
                return (
                  <li key={option.key} className="border-cal-line border-b">
                    <button
                      type="button"
                      onClick={() => onChangeUnit(option.key)}
                      aria-pressed={active}
                      className="flex w-full items-center gap-3 py-3.5 text-left transition-colors active:bg-muted/60"
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-[1.0625rem] font-light text-foreground">
                          {option.label}
                        </span>
                        <span className="text-cal-faint truncate text-[0.8125rem] font-light">
                          {option.hint}
                        </span>
                      </span>
                      {active ? (
                        <Check className="text-cal-accent size-5 shrink-0" strokeWidth={1.5} />
                      ) : (
                        <span className="size-5 shrink-0" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>

            <h3 className="text-muted-foreground pt-6 pb-2 text-[0.8125rem] tracking-[0.2em]">
              计时方式
            </h3>
            <button
              type="button"
              onClick={onTogglePrecise}
              aria-pressed={settings.precise}
              disabled={settings.unit === 'compound'}
              className="border-cal-line flex w-full items-center gap-3 border-b border-t py-4 text-left disabled:opacity-40"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[1.0625rem] font-light text-foreground">精确到当前时刻</span>
                <span className="text-cal-faint text-[0.8125rem] font-light">
                  {settings.unit === 'compound'
                    ? '天 时 分 秒 始终按当前时刻计算'
                    : '关闭时按自然日 00:00 计算'}
                </span>
              </span>
              <Switch on={settings.precise || settings.unit === 'compound'} />
            </button>

            <button
              type="button"
              onClick={onOpenAbout}
              className="border-cal-line mt-6 flex w-full items-center justify-between border-b border-t py-4 text-[1.0625rem] font-light text-foreground transition-colors active:bg-muted/60"
            >
              关于
              <span className="text-cal-faint text-[0.9375rem]">农历日历</span>
            </button>
            <div className="h-10" />
          </div>
        ) : null}

        {view === 'about' ? (
          <div className="px-5">
            <div className="border-cal-line flex flex-col items-start border-b py-10">
              <p className="text-[2rem] leading-tight font-extralight text-foreground">农历日历</p>
              <p className="text-muted-foreground mt-2 text-[0.9375rem] font-light tabular-nums">
                版本 1.1.0
              </p>
            </div>
            <dl className="text-[0.9375rem] font-light">
              {[
                ['农历范围', '1901 — 2099 年'],
                ['包含内容', '农历、干支、生肖、节气、节日'],
                ['倒数日', '支持公历 / 农历目标与每年重复'],
                ['显示单位', '天 / 天时分秒 / 时 / 分 / 秒 / 周 / 月'],
                ['数据存储', '仅保存在当前设备的会话中'],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="border-cal-line flex items-start justify-between gap-6 border-b py-3.5"
                >
                  <dt className="text-muted-foreground shrink-0">{k}</dt>
                  <dd className="text-right text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-cal-faint py-6 text-[0.8125rem] leading-relaxed font-light">
              农历换算基于 1901—2099 年的历表数据，节气按天文算法估算，个别年份可能与权威历书相差一天。
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
