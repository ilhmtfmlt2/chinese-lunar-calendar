'use client'

import { Check, ChevronLeft } from 'lucide-react'
import type { CountdownSettings, CountdownUnit } from '@/lib/countdown'
import { UNIT_OPTIONS } from '@/lib/countdown'
import {
  DENSITY_HINTS,
  DENSITY_OPTIONS,
  DISPLAY_TOGGLES,
  type Preferences,
  THEME_OPTIONS,
  WEEK_START_OPTIONS,
} from '@/lib/preferences'
import { cn } from '@/lib/utils'

export type SettingsView = 'settings' | 'about'

type Props = {
  view: SettingsView | null
  settings: CountdownSettings
  preferences: Preferences
  /** 返回按钮文案：日历 或 设置 */
  backLabel: string
  onChangeUnit: (unit: CountdownUnit) => void
  onTogglePrecise: () => void
  onToggleInclusive: () => void
  /** 切换列表排序方向 */
  onToggleSort: () => void
  onChangePreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-muted-foreground pt-6 pb-2 text-[length:var(--cal-label-fs)] tracking-[0.2em]">
      {children}
    </h3>
  )
}

/** 分段选择器：外观 / 密度 / 每周起始日 */
function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { key: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="bg-muted flex gap-1 rounded-full p-1">
      {options.map((option) => {
        const active = option.key === value
        return (
          <button
            key={String(option.key)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.key)}
            className={cn(
              'flex-1 rounded-full py-2 text-[length:var(--cal-sub-fs)] font-light transition-colors',
              active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function SettingsScreen({
  view,
  settings,
  preferences,
  backLabel,
  onChangeUnit,
  onTogglePrecise,
  onToggleInclusive,
  onToggleSort,
  onChangePreference,
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
        // 用 100vw（而非自身宽度的 translate-x-full）位移，确保宽屏下也能完全移出可见区域，
        // 不会在收起状态下贴着主日历露出一角
        open ? 'translate-x-0' : 'pointer-events-none translate-x-[100vw]',
      )}
    >
      <header className="border-cal-line flex items-center border-b px-2 py-2.5">
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground flex items-center gap-0.5 rounded-full py-1 pr-3 pl-1 text-[length:var(--cal-body-fs)] font-light transition-colors active:bg-muted"
        >
          <ChevronLeft className="size-5" strokeWidth={1.25} />
          {backLabel}
        </button>
        <h2 className="flex-1 text-center text-[length:var(--cal-body-fs)] font-light text-foreground">
          {view ? TITLES[view] : ''}
        </h2>
        <div className="w-[4.5rem]" />
      </header>

      <div className="flex-1 overflow-y-auto">
        {view === 'settings' ? (
          <div className="px-5 pb-10">
            <SectionTitle>外观</SectionTitle>
            <Segmented
              label="外观"
              options={THEME_OPTIONS}
              value={preferences.theme}
              onChange={(theme) => onChangePreference('theme', theme)}
            />

            <SectionTitle>布局密度</SectionTitle>
            <Segmented
              label="布局密度"
              options={DENSITY_OPTIONS}
              value={preferences.density}
              onChange={(density) => onChangePreference('density', density)}
            />
            <p className="text-cal-faint pt-2 text-[length:var(--cal-sub-fs)] font-light">
              {DENSITY_HINTS[preferences.density]}
            </p>

            <SectionTitle>每周起始日</SectionTitle>
            <Segmented
              label="每周起始日"
              options={WEEK_START_OPTIONS}
              value={preferences.weekStart}
              onChange={(weekStart) => onChangePreference('weekStart', weekStart)}
            />

            <SectionTitle>日历显示</SectionTitle>
            <ul className="border-cal-line border-t">
              {DISPLAY_TOGGLES.map((toggle) => {
                const on = preferences[toggle.key]
                return (
                  <li key={toggle.key} className="border-cal-line border-b">
                    <button
                      type="button"
                      onClick={() => onChangePreference(toggle.key, !on)}
                      aria-pressed={on}
                      className="flex w-full items-center gap-3 py-[var(--cal-row-py)] text-left transition-colors active:bg-muted/60"
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-[length:var(--cal-body-fs)] font-light text-foreground">
                          {toggle.label}
                        </span>
                        <span className="text-cal-faint text-[length:var(--cal-sub-fs)] font-light">
                          {toggle.hint}
                        </span>
                      </span>
                      <Switch on={on} />
                    </button>
                  </li>
                )
              })}
            </ul>

            <SectionTitle>倒数日显示单位</SectionTitle>
            <ul className="border-cal-line border-t">
              {UNIT_OPTIONS.map((option) => {
                const active = option.key === settings.unit
                return (
                  <li key={option.key} className="border-cal-line border-b">
                    <button
                      type="button"
                      onClick={() => onChangeUnit(option.key)}
                      aria-pressed={active}
                      className="flex w-full items-center gap-3 py-[var(--cal-row-py)] text-left transition-colors active:bg-muted/60"
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-[length:var(--cal-body-fs)] font-light text-foreground">
                          {option.label}
                        </span>
                        <span className="text-cal-faint truncate text-[length:var(--cal-sub-fs)] font-light">
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

            <SectionTitle>倒数日计时方式</SectionTitle>
            <button
              type="button"
              onClick={onTogglePrecise}
              aria-pressed={settings.precise}
              disabled={settings.unit === 'compound'}
              className="border-cal-line flex w-full items-center gap-3 border-t border-b py-[var(--cal-row-py)] text-left disabled:opacity-40"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[length:var(--cal-body-fs)] font-light text-foreground">
                  精确到当前时刻
                </span>
                <span className="text-cal-faint text-[length:var(--cal-sub-fs)] font-light">
                  {settings.unit === 'compound'
                    ? '天 时 分 秒 始终按当前时刻计算'
                    : '关闭时按自然日 00:00 计算'}
                </span>
              </span>
              <Switch on={settings.precise || settings.unit === 'compound'} />
            </button>

            <button
              type="button"
              onClick={onToggleInclusive}
              aria-pressed={settings.inclusive}
              className="border-cal-line flex w-full items-center gap-3 border-b py-[var(--cal-row-py)] text-left"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[length:var(--cal-body-fs)] font-light text-foreground">
                  默认包含起止日期
                </span>
                <span className="text-cal-faint text-[length:var(--cal-sub-fs)] font-light">
                  新建倒数日时的默认口径，单条可单独调整
                </span>
              </span>
              <Switch on={settings.inclusive} />
            </button>

            <SectionTitle>倒数日列表排序</SectionTitle>
            <ul className="border-cal-line border-t">
              {(
                [
                  { key: 'asc', label: '正序', hint: '离现在最近的排在前面' },
                  { key: 'desc', label: '倒序', hint: '离现在最远的排在前面' },
                ] as const
              ).map((option) => {
                const active = option.key === settings.sortOrder
                return (
                  <li key={option.key} className="border-cal-line border-b">
                    <button
                      type="button"
                      onClick={() => {
                        if (!active) onToggleSort()
                      }}
                      aria-pressed={active}
                      className="flex w-full items-center gap-3 py-[var(--cal-row-py)] text-left transition-colors active:bg-muted/60"
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-[length:var(--cal-body-fs)] font-light text-foreground">
                          {option.label}
                        </span>
                        <span className="text-cal-faint truncate text-[length:var(--cal-sub-fs)] font-light">
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
            <p className="text-cal-faint py-3 text-[length:var(--cal-sub-fs)] font-light">
              置顶的倒数日始终排在最前，不受排序方向影响。
            </p>

            <button
              type="button"
              onClick={onOpenAbout}
              className="border-cal-line mt-6 flex w-full items-center justify-between border-t border-b py-[var(--cal-row-py)] text-[length:var(--cal-body-fs)] font-light text-foreground transition-colors active:bg-muted/60"
            >
              关于
              <span className="text-cal-faint text-[length:var(--cal-sub-fs)]">农历日历</span>
            </button>
          </div>
        ) : null}

        {view === 'about' ? (
          <div className="px-5">
            <div className="border-cal-line flex flex-col items-start border-b py-8">
              <p className="text-[2rem] leading-tight font-extralight text-foreground">农历日历</p>
              <p className="text-muted-foreground mt-1 text-[length:var(--cal-sub-fs)] font-light tabular-nums">
                版本 1.2.0
              </p>
            </div>
            <dl className="text-[length:var(--cal-sub-fs)] font-light">
              {[
                ['农历范围', '1901 — 2099 年'],
                ['包含内容', '农历、干支、生肖、节气、节日'],
                ['倒数日', '支持公历 / 农历目标与每年重复'],
                ['显示单位', '天 / 天时分秒 / 时 / 分 / 秒 / 周 / 月'],
                ['界面偏好', '密度、外观、起始日、显示项可调'],
                ['数据存储', '仅保存在当前设备的会话中'],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="border-cal-line flex items-start justify-between gap-6 border-b py-[var(--cal-row-py)]"
                >
                  <dt className="text-muted-foreground shrink-0">{k}</dt>
                  <dd className="text-right text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-cal-faint py-6 text-[length:var(--cal-sub-fs)] leading-relaxed font-light">
              农历换算基于 1901—2099 年的历表数据，节气按天文算法估算，个别年份可能与权威历书相差一天。
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
